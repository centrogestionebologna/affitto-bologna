import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase";
import AnteprimaChat from "../components/AnteprimaChat";

function Login() {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState("");

  const loginGoogle = async () => {
    setCaricamento(true);
    setErrore("");

    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          role: "user",
          accountType: "homeSeeker",
          verified: false,
          reportsCount: 0,
          likes: 0,
          dislikes: 0,
          banned: false,
          chatMuted: false,
          onboardingCompleted: false,
          memberSince: serverTimestamp(),
        });

        await setDoc(
          doc(db, "userContacts", user.uid),
          { phone: "", email: user.email || "" },
          { merge: true }
        );
      }
    } catch (error) {
      console.error(error);
      if (error.code !== "auth/popup-closed-by-user") {
        setErrore("Accesso non riuscito: " + error.message);
      }
      setCaricamento(false);
    }
  };

  return (
    <AnteprimaChat
      onAccedi={loginGoogle}
      caricamento={caricamento}
      errore={errore}
    />
  );
}

export default Login;