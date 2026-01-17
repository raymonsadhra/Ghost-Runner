import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../firebase';

function getUserId() {
  return auth?.currentUser?.uid ?? 'anon';
}

export async function saveRun(runData) {
  const docRef = await addDoc(collection(db, 'runs'), {
    ...runData,
    userId: runData.userId ?? getUserId(),
  });
  return docRef.id;
}

export async function getUserRuns(userId = getUserId(), { max = 20 } = {}) {
  const runsQuery = query(
    collection(db, 'runs'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(max)
  );
  const snapshot = await getDocs(runsQuery);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
