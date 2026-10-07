import { useCallback, useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { db } from "../firebase";
import { secondi } from "../utils/helpers";

export default function useRecensioni(userId) {
  const [recensioni, setRecensioni] = useState([]);
  const [caricamento, setCaricamento] = useState(Boolean(userId));
  const [errore, setErrore] = useState("");

  const ricarica = useCallback(async () => {
    if (!userId) {
      setRecensioni([]);
      setCaricamento(false);
      return;
    }

    try {
      const snap = await getDocs(
        query(collection(db, "reviews"), where("reviewedId", "==", userId))
      );

      setRecensioni(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt))
      );
      setErrore("");
    } catch (error) {
      console.error(error);
      setErrore("Impossibile caricare le recensioni.");
    } finally {
      setCaricamento(false);
    }
  }, [userId]);

  useEffect(() => {
    ricarica();
  }, [ricarica]);

  const media = recensioni.length
    ? recensioni.reduce((somma, r) => somma + r.rating, 0) / recensioni.length
    : 0;

  return { recensioni, media, caricamento, errore, ricarica };
}