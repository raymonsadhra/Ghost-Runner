# Firestore Security Rules Setup

## Data Structure
The app now uses the following structure:
- **Users** collection: Contains user documents
  - Each user document has: `userId`, `createdAt`, `totalRuns`, `totalDistance`, `lastRunAt`
  - **Runs** subcollection: Contains all runs for that user
    - Each run document has: `points`, `distance`, `distanceKm`, `duration`, `durationMin`, `pace`, `timestamp`, `createdAt`, `ghostMeta`, `isGhostRun`
  - **Friends** subcollection: Accepted friends for that user
    - Each friend document has: `userId`, `displayName`, `createdAt`, `status`
  - **FriendRequests** subcollection: Pending friend requests
    - Each request document has: `userId`, `displayName`, `email`, `direction`, `status`, `createdAt`

## Problem
You're seeing the error: "Missing or insufficient permissions"

This means your Firestore security rules are blocking read/write access to the `Users` collection and `Runs` subcollection.

## Solution

### Step 1: Open Firebase Console
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click on **Firestore Database** in the left sidebar
4. Click on the **Rules** tab

### Step 2: Update Security Rules

Replace your current rules with one of these options:

#### Option A: Allow All (For Development/Testing Only)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **WARNING**: This allows anyone to read/write to your database. Only use for development!

#### Option B: Allow All for Users and Runs (For Testing with Anonymous Users)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      allow read, write: if true;
      match /Runs/{runId} {
        allow read, write: if true;
      }
    }
  }
}
```

#### Option C: Allow Authenticated Users Only (Recommended for Production)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /Runs/{runId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /Friends/{friendId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      match /FriendRequests/{requestId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

#### Option D: Auth + Friends Requests + Public User Lookup (Recommended for Friends)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      // Allow read of user profiles for friend search / leaderboard.
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;

      match /Runs/{runId} {
        // Allow users to read their own runs, and allow authenticated users to read friends' runs
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == userId;
      }

      match /Friends/{friendId} {
        // Either user can create/delete the friendship record.
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create, delete: if request.auth != null &&
          (request.auth.uid == userId || request.auth.uid == friendId);
      }

      match /FriendRequests/{requestId} {
        // Owner can read their requests. Sender (requestId) can create/delete on receiver.
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create, delete: if request.auth != null &&
          (request.auth.uid == userId || request.auth.uid == requestId);
      }
    }
  }
}
```

#### Option E: Friends-Only Runs (Most Secure - Requires Checking Friendship)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /Users/{userId} {
      // Allow read of user profiles for friend search / leaderboard.
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;

      match /Runs/{runId} {
        // Users can read their own runs
        allow read: if request.auth != null && request.auth.uid == userId;
        // Users can also read runs if they are friends with the user
        // Note: This requires checking the Friends subcollection, which Firestore rules can't do directly
        // For now, we allow all authenticated users to read runs (see Option D above)
        // For stricter security, implement server-side checks in your app code
        allow write: if request.auth != null && request.auth.uid == userId;
      }

      match /Friends/{friendId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create, delete: if request.auth != null &&
          (request.auth.uid == userId || request.auth.uid == friendId);
      }

      match /FriendRequests/{requestId} {
        allow read: if request.auth != null && request.auth.uid == userId;
        allow create, delete: if request.auth != null &&
          (request.auth.uid == userId || request.auth.uid == requestId);
      }
    }
  }
}
```

### Step 3: Publish Rules
1. Click **Publish** button
2. Wait for confirmation that rules are published

### Step 4: Test Again
Go back to your app and try the "Test Firebase" button again.

## Current App Behavior
- The app uses `userId: 'anon'` if no user is authenticated
- User documents are automatically created when saving the first run
- If you're using Option C (authenticated users only), you'll need to set up Firebase Authentication first
