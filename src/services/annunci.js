import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

export const nomeCorrente = () =>
  auth.currentUser?.displayName || auth.currentUser?.email || "Un utente";

// Una notifica fallita non deve mai bloccare l'azione principale
export async function creaNotifica({
  userId,
  type,
  message,
  listingId = null,
  listingType = null,
}) {
  if (!userId || userId === auth.currentUser.uid) return;

  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      type,
      message,
      listingId,
      listingType,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Notifica non creata", error);
  }
}

// Avvisa chi ha salvato l'annuncio nei preferiti che è stato modificato
export async function notificaModificaAnnuncio(listingId, tipo, titolo) {
  try {
    const snap = await getDocs(
      query(
        collection(db, "favorites"),
        where("listingId", "==", listingId),
        where("ownerId", "==", auth.currentUser.uid)
      )
    );

    await Promise.all(
      snap.docs.map((d) =>
        creaNotifica({
          userId: d.data().userId,
          type: "edit",
          message: `L'annuncio "${titolo}" che hai salvato è stato modificato`,
          listingId,
          listingType: tipo,
        })
      )
    );
  } catch (error) {
    console.error("Notifiche di modifica non inviate", error);
  }
}

export async function inviaRichiestaContatto(annuncio, tipo) {
  const utente = auth.currentUser;

  await setDoc(doc(db, "contactRequests", `${utente.uid}_${annuncio.id}`), {
    fromId: utente.uid,
    fromName: nomeCorrente(),
    fromEmail: utente.email || "",
    toId: annuncio.ownerId,
    listingId: annuncio.id,
    listingType: tipo,
    listingTitle: annuncio.title || "",
    status: "new",
    createdAt: serverTimestamp(),
  });

  await creaNotifica({
    userId: annuncio.ownerId,
    type: "contact",
    message: `${nomeCorrente()} ti ha contattato per "${annuncio.title}"`,
    listingId: annuncio.id,
    listingType: tipo,
  });
}

export async function inviaSegnalazione(annuncio, tipo, motivo, dettagli) {
  const utente = auth.currentUser;

  await setDoc(doc(db, "reports", `${utente.uid}_${annuncio.id}`), {
    reporterId: utente.uid,
    listingId: annuncio.id,
    listingType: tipo,
    ownerId: annuncio.ownerId,
    reason: motivo,
    details: dettagli,
    createdAt: serverTimestamp(),
  });
}