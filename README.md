# Firebase Helpers

## Firestore

Functions to retrieve documents and collections.

### Get Started

```ts
import admin from "firebase-admin";
import { FirestoreUtil } from "firebase-helpers";

// Initialize Firebase
admin.initializeApp();
const firestore = admin.firestore();

// Create FirestoreUtil object
const fsUtil = new FirestoreUtil(firestore);

// Document Query
const res = await fsUtil.docQuery<ResType>("doc/{id}");

// Constraints
import { FirestoreContraints as FC } from "firebase-helpers";
const res = await fsUtil.collectionQuery<ResType>("collection", [
  FC.orderBy("timestamp", "desc"),
]);
```
