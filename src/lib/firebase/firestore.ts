// src/lib/firebase/firestore.ts
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  type DocumentData,
  QueryConstraint,
  FirestoreError,
  DocumentReference,
  QuerySnapshot,
  DocumentSnapshot,
  type WhereFilterOp,
  type OrderByDirection,
  Query,
  CollectionReference,
} from "firebase/firestore";
import { db } from "./firebase";

// Define types for function returns
interface SuccessResponse<T> {
  success: true;
  data?: T;
  id?: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ResponseType<T> = SuccessResponse<T> | ErrorResponse;

// Define types for query parameters
interface WhereCondition {
  field: string;
  operator: WhereFilterOp;
  value: unknown;
}

interface SortByOption {
  field: string;
  direction?: OrderByDirection;
}

// Add a document to a collection
export const addDocument = async <T extends DocumentData>(
  collectionName: string,
  data: T
): Promise<ResponseType<never>> => {
  try {
    const docRef: DocumentReference = await addDoc(
      collection(db, collectionName),
      data
    );
    return { success: true, id: docRef.id };
  } catch (error) {
    const firestoreError = error as FirestoreError;
    return { success: false, error: firestoreError.message };
  }
};

// Get a document by ID
export const getDocument = async <T extends DocumentData>(
  collectionName: string,
  id: string
): Promise<ResponseType<T & { id: string }>> => {
  try {
    const docRef: DocumentReference = doc(db, collectionName, id);
    const docSnap: DocumentSnapshot = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as T;
      return { success: true, data: { id: docSnap.id, ...data } };
    } else {
      return { success: false, error: "Document not found" };
    }
  } catch (error) {
    const firestoreError = error as FirestoreError;
    return { success: false, error: firestoreError.message };
  }
};

// Get all documents from a collection
export const getCollection = async <T extends DocumentData>(
  collectionName: string
): Promise<ResponseType<Array<T & { id: string }>>> => {
  try {
    const querySnapshot: QuerySnapshot = await getDocs(
      collection(db, collectionName)
    );
    const documents: Array<T & { id: string }> = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...(doc.data() as T) });
    });

    return { success: true, data: documents };
  } catch (error) {
    const firestoreError = error as FirestoreError;
    return { success: false, error: firestoreError.message };
  }
};

// Update a document
export const updateDocument = async (
  collectionName: string,
  id: string,
  data: Partial<DocumentData>
): Promise<ResponseType<never>> => {
  try {
    const docRef: DocumentReference = doc(db, collectionName, id);
    await updateDoc(docRef, data);
    return { success: true };
  } catch (error) {
    const firestoreError = error as FirestoreError;
    return { success: false, error: firestoreError.message };
  }
};

// Delete a document
export const deleteDocument = async (
  collectionName: string,
  id: string
): Promise<ResponseType<never>> => {
  try {
    const docRef: DocumentReference = doc(db, collectionName, id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    const firestoreError = error as FirestoreError;
    return { success: false, error: firestoreError.message };
  }
};

// Query documents with conditions
export const queryDocuments = async <T extends DocumentData>(
  collectionName: string,
  conditions: WhereCondition[] = [],
  sortBy: SortByOption | null = null,
  limitTo: number | null = null
): Promise<ResponseType<Array<T & { id: string }>>> => {
  try {
    let collectionRef: CollectionReference = collection(db, collectionName);
    let queryConstraints: QueryConstraint[] = [];

    // Add where conditions
    if (conditions.length > 0) {
      conditions.forEach((condition) => {
        queryConstraints.push(
          where(condition.field, condition.operator, condition.value)
        );
      });
    }

    // Add orderBy
    if (sortBy) {
      queryConstraints.push(orderBy(sortBy.field, sortBy.direction || "asc"));
    }

    // Add limit
    if (limitTo !== null) {
      queryConstraints.push(limit(limitTo));
    }

    // Build the query
    const q: Query = query(collectionRef, ...queryConstraints);

    // Execute the query
    const querySnapshot: QuerySnapshot = await getDocs(q);
    const documents: Array<T & { id: string }> = [];

    querySnapshot.forEach((doc) => {
      documents.push({ id: doc.id, ...(doc.data() as T) });
    });

    return { success: true, data: documents };
  } catch (error) {
    const firestoreError = error as FirestoreError;
    return { success: false, error: firestoreError.message };
  }
};
