import { useCallback, useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { creaNotifica, nomeCorrente } from "../services/annunci";

export default function useFavorites() {
  const [favDocs, setFavDocs] = useState([]);
  const [favIds, setFavIds] = useState(new Set());
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "favorites"),
      where("userId", "==", auth.currentUser.uid)
    );

    const annulla = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setFavDocs(docs);
        setFavIds(new Set(docs.map((d) => d.listingId)));
        setErrore("");
        setCaricamento(false);
      },
      (err) => {
        console.error(err);
        setErrore("Impossibile caricare i preferiti.");
        setCaricamento(false);
      }
    );

    return annulla;
  }, []);

  const toggle = useCallback(
    async (annuncio, tipo) => {
      const utente = auth.currentUser;
      const ref = doc(db, "favorites", `${utente.uid}_${annuncio.id}`);

      if (favIds.has(annuncio.id)) {
        await deleteDoc(ref);
        return;
      }

      await setDoc(ref, {
        userId: utente.uid,
        listingId: annuncio.id,
        listingType: tipo,
        ownerId: annuncio.ownerId || "",
        createdAt: serverTimestamp(),
      });

      await creaNotifica({
        userId: annuncio.ownerId,
        type: "favorite",
        message: `${nomeCorrente()} ha salvato "${annuncio.title}" nei preferiti`,
        listingId: annuncio.id,
        listingType: tipo,
      });
    },
    [favIds]
  );

  return { favDocs, favIds, caricamento, errore, toggle };
}