import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type User } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { writable } from "svelte/store";

// Your web app's Firebase configuration
// Replace these values with your Firebase project settings
const firebaseConfig = {
  apiKey: "AIzaSyDrgTzbVmdimG0MH-XxSFQ2ySdrqAGYwW4",
  authDomain: "rhye-d6da2.firebaseapp.com",
  projectId: "rhye-d6da2",
  storageBucket: "rhye-d6da2.firebasestorage.app",
  messagingSenderId: "363927305513",
  appId: "1:363927305513:web:03fc9e5b4c582e3c7acb38",
  measurementId: "G-Z99GTF3LJY",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Create a user store to track authentication state
export const user = writable<User | null>(null);

// Subscribe to auth state changes
onAuthStateChanged(auth, (currentUser) => {
  user.set(currentUser);
});
