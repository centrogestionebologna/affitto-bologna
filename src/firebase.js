import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBY68G0pllARMzZzWYZgwOhbNr2JINwoec",
  authDomain: "affitto-bologna.firebaseapp.com",
  projectId: "affitto-bologna",
  storageBucket: "affitto-bologna.firebasestorage.app",
  messagingSenderId: "726549149775",
  appId: "1:726549149775:web:2df34ed970a93bf544d23a",
  measurementId: "G-J67SKSF5CJ"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;