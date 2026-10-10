import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";

import { auth, db } from "../firebase";

export default function useUtente() {
  const [profilo, setProfilo] = useState(null);
  const [contatti, setContatti] = useState(null);
  const [prontoProfilo, setProntoProfilo] = useState(false);
  const [prontoContatti, setProntoContatti] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser.uid;

    const annulla1 = onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        setProfilo(snap.exists() ? snap.data() : null);
        setProntoProfilo(true);
      },
      (error) => {
        console.error(error);
        setProntoProfilo(true);
      }
    );

    const annulla2 = onSnapshot(
      doc(db, "userContacts", uid),
      (snap) => {
        setContatti(snap.exists() ? snap.data() : null);
        setProntoContatti(true);
      },
      (error) => {
        console.error(error);
        setProntoContatti(true);
      }
    );

    return () => {
      annulla1();
      annulla2();
    };
  }, []);

  return {
    profilo,
    contatti,
    caricamento: !(prontoProfilo && prontoContatti),
    isAdmin: profilo?.role === "admin",
  };
}