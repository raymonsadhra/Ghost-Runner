import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { auth, db } from '../firebase';

function requireUser() {
  const user = auth?.currentUser ?? null;
  if (!user) {
    throw new Error('Not signed in.');
  }
  return user;
}

function getNameFromUser(userDoc) {
  return (
    userDoc?.displayName ||
    userDoc?.name ||
    userDoc?.email?.split('@')[0] ||
    'Runner'
  );
}

async function getUserProfile(userId) {
  if (!userId) return null;
  const snap = await getDoc(doc(db, 'Users', userId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

export async function findUserByQuery(rawQuery) {
  const queryText = rawQuery?.trim();
  if (!queryText) return null;
  const normalized = queryText.toLowerCase();

  const byIdSnap = await getDoc(doc(db, 'Users', queryText));
  if (byIdSnap.exists()) {
    return { id: byIdSnap.id, ...byIdSnap.data() };
  }

  const usersRef = collection(db, 'Users');
  const emailQueries = [
    query(usersRef, where('email', '==', queryText), limit(1)),
    query(usersRef, where('emailLower', '==', normalized), limit(1)),
  ];
  for (const emailQuery of emailQueries) {
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const docSnap = emailSnap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  }

  const displayNameQueries = [
    query(usersRef, where('displayNameLower', '==', normalized), limit(1)),
    query(usersRef, where('displayName', '==', queryText), limit(1)),
  ];
  for (const nameQuery of displayNameQueries) {
    const nameSnap = await getDocs(nameQuery);
    if (!nameSnap.empty) {
      const docSnap = nameSnap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  }

  const altNameQueries = [
    query(usersRef, where('nameLower', '==', normalized), limit(1)),
    query(usersRef, where('name', '==', queryText), limit(1)),
  ];
  for (const altNameQuery of altNameQueries) {
    const altNameSnap = await getDocs(altNameQuery);
    if (!altNameSnap.empty) {
      const docSnap = altNameSnap.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  }

  return null;
}

export async function sendFriendRequest(searchQuery) {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  let target;
  try {
    target = await findUserByQuery(searchQuery);
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Permission denied when searching users. Update Firestore rules to allow authenticated reads of Users.'
      );
    }
    throw error;
  }
  if (!target) {
    throw new Error('No user found with that email or username.');
  }
  if (target.id === currentUserId) {
    throw new Error('You cannot add yourself.');
  }

  const friendRef = doc(db, 'Users', currentUserId, 'Friends', target.id);
  const friendSnap = await getDoc(friendRef);
  if (friendSnap.exists()) {
    return { status: 'already_friends', user: target };
  }

  const requestRef = doc(
    db,
    'Users',
    currentUserId,
    'FriendRequests',
    target.id
  );
  const requestSnap = await getDoc(requestRef);
  if (requestSnap.exists()) {
    const data = requestSnap.data();
    if (data?.direction === 'incoming') {
      return { status: 'incoming_request', user: target };
    }
    return { status: 'already_requested', user: target };
  }

  const currentProfile = await getUserProfile(currentUserId);
  const currentName = getNameFromUser(currentProfile ?? currentUser);
  const targetName = getNameFromUser(target);

  const batch = writeBatch(db);
  batch.set(requestRef, {
    userId: target.id,
    displayName: targetName,
    email: target.email ?? null,
    direction: 'outgoing',
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  const incomingRef = doc(
    db,
    'Users',
    target.id,
    'FriendRequests',
    currentUserId
  );
  batch.set(incomingRef, {
    userId: currentUserId,
    displayName: currentName,
    email: currentUser.email ?? currentProfile?.email ?? null,
    direction: 'incoming',
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Permission denied when creating friend request. Update Firestore rules to allow writing FriendRequests for both users.'
      );
    }
    throw error;
  }
  return { status: 'sent', user: target };
}

export async function acceptFriendRequest(fromUserId) {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  if (!fromUserId) return;

  const [currentProfile, fromProfile] = await Promise.all([
    getUserProfile(currentUserId),
    getUserProfile(fromUserId),
  ]);

  const currentName = getNameFromUser(currentProfile ?? currentUser);
  const fromName = getNameFromUser(fromProfile);

  const batch = writeBatch(db);
  batch.delete(doc(db, 'Users', currentUserId, 'FriendRequests', fromUserId));
  batch.delete(doc(db, 'Users', fromUserId, 'FriendRequests', currentUserId));

  batch.set(doc(db, 'Users', currentUserId, 'Friends', fromUserId), {
    userId: fromUserId,
    displayName: fromName,
    createdAt: serverTimestamp(),
    status: 'accepted',
  });

  batch.set(doc(db, 'Users', fromUserId, 'Friends', currentUserId), {
    userId: currentUserId,
    displayName: currentName,
    createdAt: serverTimestamp(),
    status: 'accepted',
  });

  try {
    await batch.commit();
  } catch (error) {
    if (error?.code === 'permission-denied') {
      throw new Error(
        'Permission denied when accepting request. Update Firestore rules to allow writing Friends for both users.'
      );
    }
    throw error;
  }
}

export async function declineFriendRequest(fromUserId) {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  if (!fromUserId) return;
  await Promise.all([
    deleteDoc(doc(db, 'Users', currentUserId, 'FriendRequests', fromUserId)),
    deleteDoc(doc(db, 'Users', fromUserId, 'FriendRequests', currentUserId)),
  ]);
}

export async function cancelFriendRequest(toUserId) {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  if (!toUserId) return;
  // Cancel outgoing request - delete from both users' FriendRequests
  await Promise.all([
    deleteDoc(doc(db, 'Users', currentUserId, 'FriendRequests', toUserId)),
    deleteDoc(doc(db, 'Users', toUserId, 'FriendRequests', currentUserId)),
  ]);
}

export async function fetchPendingRequests() {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  const requestsRef = collection(db, 'Users', currentUserId, 'FriendRequests');
  const snap = await getDocs(query(requestsRef, orderBy('createdAt', 'desc')));
  const requests = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const hydrated = await Promise.all(
    requests.map(async (request) => {
      const profile = request.userId
        ? await getUserProfile(request.userId).catch(() => null)
        : null;
      return {
        id: request.userId ?? request.id,
        direction: request.direction ?? 'incoming',
        displayName: getNameFromUser(profile ?? request),
        email: profile?.email ?? request.email ?? null,
      };
    })
  );

  return hydrated;
}

export async function unfriend(friendUserId) {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  if (!friendUserId) return;

  // Remove friend relationship from both users
  await Promise.all([
    deleteDoc(doc(db, 'Users', currentUserId, 'Friends', friendUserId)),
    deleteDoc(doc(db, 'Users', friendUserId, 'Friends', currentUserId)),
  ]);
}

export async function fetchFriends() {
  const currentUser = requireUser();
  const currentUserId = currentUser.uid;
  const friendsRef = collection(db, 'Users', currentUserId, 'Friends');
  const snap = await getDocs(query(friendsRef, orderBy('createdAt', 'desc')));
  const friends = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

  const hydrated = await Promise.all(
    friends.map(async (friend) => {
      const profile = friend.userId
        ? await getUserProfile(friend.userId).catch(() => null)
        : null;
      const name = getNameFromUser(profile ?? friend);
      return {
        id: friend.userId ?? friend.id,
        name,
        displayName: name,
        totalDistance: profile?.totalDistance ?? 0,
        totalRuns: profile?.totalRuns ?? 0,
        lastRunAt: profile?.lastRunAt ?? null,
      };
    })
  );

  return hydrated;
}
