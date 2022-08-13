import { Firestore } from "firebase-admin/firestore";
import { QR, QueryConstraint, QueryCursor } from "./types";

export class FirestoreUtil {
  firestore: Firestore;

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  /**
   * Removes an item's id and ref from the query result. Usually used when
   * updating an object in firestore.
   * @param qr Query result
   * @returns Data without query result fields
   */
  queryData<T>(qr: T & QR): T {
    const clone = { ...qr } as T & { id?: string; ref?: string };
    delete clone.id;
    delete clone.ref;
    return clone;
  }

  /**
   * Applies a list of query constraints to a query.
   * @param query A collection reference or existing query
   * @param queryConstraints List of query constraints (where/orderBy)
   * @returns Query
   */
  _applyQueryConstraints<T>(
    query: FirebaseFirestore.Query<T>,
    queryConstraints: QueryConstraint[]
  ): FirebaseFirestore.Query<T> {
    let q = query;

    queryConstraints.forEach((constraint) => {
      if (constraint.type === "orderBy") {
        q = q.orderBy(constraint.fieldPath, constraint.directionStr);
      } else if (constraint.type === "where") {
        q = q.where(constraint.fieldPath, constraint.opStr!, constraint.value);
      }
    });

    return q;
  }

  /**
   * Uses a cursor to apply restrictions to a query.
   * @param query A collection reference or existing query
   * @param cursor Cursor object
   * @returns Query
   */
  async _applyCursor<T>(
    query: FirebaseFirestore.Query<T>,
    cursor: QueryCursor
  ): Promise<FirebaseFirestore.Query<T>> {
    let q = query;

    if (cursor.startAfter) {
      const doc = await this.firestore.doc("" + cursor.startAfter).get();
      q = q.startAfter(doc);
    }

    if (cursor.interval) {
      q = q.limit(cursor.interval);
    }

    return q;
  }

  /**
   * Retrieve document data from firestore.
   * @param refStr Reference string to document
   * @param t Transaction object
   * @returns Document query result or null
   */
  async docQuery<T>(
    refStr: string,
    t?: FirebaseFirestore.Transaction
  ): Promise<(T & QR) | null> {
    const ref = this.firestore.doc(refStr);
    const snapshot = await (t ? t.get(ref) : ref.get());

    if (snapshot.exists) {
      return {
        ...(snapshot.data() as T),
        id: snapshot.id,
        ref: snapshot.ref.path,
      };
    }

    return null;
  }

  /**
   * Retrieve multiple documents from firestore.
   * @param refStr Reference string to collection
   * @param queryConstraints List of query constraints
   * @param cursor Optional cursor
   * @returns List of document data
   */
  async collectionQuery<T>(
    refStr: string,
    queryConstraints: QueryConstraint[] = [],
    cursor?: QueryCursor
  ): Promise<(T & QR)[]> {
    const ref = this.firestore.collection(refStr);
    let q = this._applyQueryConstraints(ref, queryConstraints);

    if (cursor) {
      q = await this._applyCursor(q, cursor);
    }

    const querySnapshot = await q.get();

    // Convert results to correct type
    const data: (T & QR)[] = [];
    querySnapshot.forEach(
      (
        // eslint-disable-next-line max-len
        snapshot: FirebaseFirestore.QueryDocumentSnapshot<FirebaseFirestore.DocumentData>
      ) => {
        data.push({
          ...(snapshot.data() as T),
          id: snapshot.id,
          ref: snapshot.ref.path,
        });
      }
    );
    return data;
  }

  /**
   * Helper function that handles cursor initialization and updates. Makes a
   * collection query, then updates the cursor based on the data retrieved.
   * @param refStr Reference string to collection
   * @param queryConstraints List of query constraints
   * @param cursor Optional cursor
   * @returns List of document data and updated cursor
   */
  async cursorQuery<T>(
    refStr: string,
    queryConstraints: QueryConstraint[] = [],
    _cursor?: QueryCursor
  ): Promise<{ data: (T & QR)[]; cursor: QueryCursor }> {
    const cursor = _cursor || { interval: 10, hasNext: true };

    const data = await this.collectionQuery<T>(
      refStr,
      queryConstraints,
      cursor
    );

    // Update cursor
    const _length = data.length;
    const startAfter =
      _length === 0 ? cursor.startAfter : data[_length - 1].ref;
    const hasNext = _length === cursor.interval;

    return {
      data: data,
      cursor: { ...cursor, startAfter, hasNext },
    };
  }

  /**
   * Deletes a Firestore document.
   * @param refStr Reference to document
   * @param t Transaction object
   */
  async deleteDoc(refStr: string, t?: FirebaseFirestore.Transaction) {
    const ref = this.firestore.doc(refStr);
    await (t ? t.delete(ref) : ref.delete());
  }

  /**
   * Deletes all items in a Firestore collection. Requires a recursive call
   * because Firestore doesn't support deleting a collection in a single call.
   * https://firebase.google.com/docs/firestore/manage-data/delete-data#collections
   * @param refStr Reference string to collection
   * @param batchSize Size to delete at once (max is 500)
   * @returns true if successful
   */
  async deleteCollection(refStr: string, batchSize: number = 300) {
    const collectionRef = this.firestore.collection(refStr);
    const query = collectionRef.orderBy("__name__").limit(batchSize);

    return new Promise<boolean>((resolve, reject) => {
      this._deleteQueryBatch(query, resolve).catch(reject);
    });
  }

  async _deleteQueryBatch(
    query: FirebaseFirestore.Query,
    resolve: (value: boolean) => void
  ) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;
    if (batchSize === 0) {
      // When there are no documents left, we are done
      resolve(true);
      return;
    }

    // Delete documents in a batch
    const batch = this.firestore.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Recurse on the next process tick, to avoid
    // exploding the stack.
    process.nextTick(() => {
      this._deleteQueryBatch(query, resolve);
    });
  }
}
