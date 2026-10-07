import { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

import { auth, db } from "../firebase";

function Login() {
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState("");

  const loginGoogle = async () => {
    setCaricamento(true);
    setErrore("");

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          firstName: user.displayName?.split(" ")[0] || "",
          lastName: user.displayName?.split(" ").slice(1).join(" ") || "",
          email: user.email,
          phone: "",
          role: "user",
          accountType: "homeSeeker",
          verified: false,
          reportsCount: 0,
          likes: 0,
          dislikes: 0,
          banned: false,
          memberSince: serverTimestamp(),
        });
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
    <div className="login">
      <div className="login__box">
        <h1>Affitto Bologna</h1>
        <p>Stanze, appartamenti e coinquilini per studenti e lavoratori.</p>

        <button
          type="button"
          className="btn btn--primario btn--blocco"
          onClick={loginGoogle}
          disabled={caricamento}
        >
          {caricamento ? "Accesso in corso..." : "Accedi con Google"}
        </button>

        {errore && <p className="alert alert--errore">{errore}</p>}
      </div>
    </div>
  );
}

export default Login;