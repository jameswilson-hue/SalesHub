import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { CompanyCRM } from "../types";

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const COMPANIES_COLLECTION = "companies";

// Real-time listener for companies
export function subscribeToCompanies(
  callback: (companies: CompanyCRM[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, COMPANIES_COLLECTION));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: CompanyCRM[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ ...(docSnap.data() as CompanyCRM), id: docSnap.id });
      });
      callback(items);
    },
    (err) => {
      console.error("Firestore companies listener error:", err);
      if (onError) onError(err);
    }
  );
}

// Add new company / lead account
export async function saveCompanyToFirestore(company: CompanyCRM): Promise<void> {
  const docRef = doc(db, COMPANIES_COLLECTION, company.id);
  await setDoc(docRef, company, { merge: true });
}

// Update company
export async function updateCompanyInFirestore(company: CompanyCRM): Promise<void> {
  const docRef = doc(db, COMPANIES_COLLECTION, company.id);
  await setDoc(docRef, company, { merge: true });
}

// Delete company
export async function deleteCompanyFromFirestore(companyId: string): Promise<void> {
  const docRef = doc(db, COMPANIES_COLLECTION, companyId);
  await deleteDoc(docRef);
}
