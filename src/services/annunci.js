import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import { riepilogoChat } from "../utils/helpers";

export const nomeCorrente = () =>
  auth.currentUser?.displayName || auth.currentUser?.email || "Un utente";

const nomeDaProfilo = (p) =>
  `${p?.firstName || ""} ${p?.lastName || ""}`.trim();

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

// Messaggio di servizio nella chat: evento = "new" | "reactivated"
export async function pubblicaInChat(annuncio, tipo, evento) {
  try {
    const impostazioni = await getDoc(doc(db, "settings", "community"));
    if (impostazioni.exists() && impostazioni.data().annunciInChat === false) {
      return;
    }

    await addDoc(collection(db, "chatMessages"), {
      type: "listing",
      event: evento,
      text: riepilogoChat(annuncio, tipo),
      listingId: annuncio.id,
      listingType: tipo,
      listingTitle: annuncio.title || "",
      senderId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Messaggio in chat non creato", error);
  }
}

export async function inviaRichiestaContatto(annuncio, tipo, intro) {
  const utente = auth.currentUser;

  const [profilo, contatti] = await Promise.all([
    getDoc(doc(db, "users", utente.uid)),
    getDoc(doc(db, "userContacts", utente.uid)),
  ]);

  const nome = nomeDaProfilo(profilo.data()) || nomeCorrente();
  const c = contatti.data() || {};

  await setDoc(doc(db, "contactRequests", `${utente.uid}_${annuncio.id}`), {
    fromId: utente.uid,
    fromName: nome,
    fromPhone: c.phone || "",
    fromEmail: c.email || utente.email || "",
    intro,
    toId: annuncio.ownerId,
    listingId: annuncio.id,
    listingType: tipo,
    listingTitle: annuncio.title || "",
    status: "pending",
    createdAt: serverTimestamp(),
  });

  await creaNotifica({
    userId: annuncio.ownerId,
    type: "contact",
    message: `${nome} vuole contattarti per "${annuncio.title}": approva o rifiuta la richiesta`,
    listingId: annuncio.id,
    listingType: tipo,
  });
}

// Il proprietario approva o rifiuta; il richiedente riceve sempre una notifica
export async function decidiRichiesta(richiesta, approva) {
  await updateDoc(doc(db, "contactRequests", richiesta.id), {
    status: approva ? "approved" : "rejected",
    decidedAt: serverTimestamp(),
  });

  await creaNotifica({
    userId: richiesta.fromId,
    type: "decision",
    message: approva
      ? `La tua richiesta per "${richiesta.listingTitle}" è stata approvata: il proprietario ha ricevuto il tuo contatto`
      : `La tua richiesta per "${richiesta.listingTitle}" non è stata accettata`,
    listingId: richiesta.listingId,
    listingType: richiesta.listingType,
  });
}

export async function inviaSegnalazione(annuncio, tipo, motivo, dettagli) {
  const utente = auth.currentUser;
  const batch = writeBatch(db);

  batch.set(doc(db, "reports", `${utente.uid}_${annuncio.id}`), {
    reporterId: utente.uid,
    listingId: annuncio.id,
    listingType: tipo,
    listingTitle: annuncio.title || "",
    ownerId: annuncio.ownerId,
    reason: motivo,
    details: dettagli,
    status: "open",
    createdAt: serverTimestamp(),
  });

  if (annuncio.ownerId) {
    batch.update(doc(db, "users", annuncio.ownerId), {
      reportsCount: increment(1),
    });
  }

  await batch.commit();
}

// Dati pubblici nel documento users, telefono ed email in userContacts (privati)
export async function salvaProfilo(dati) {
  const utente = auth.currentUser;
  const ref = doc(db, "users", utente.uid);
  const { phone, ...pubblici } = dati;
  const snap = await getDoc(ref);

  if (snap.exists()) {
    await updateDoc(ref, pubblici);
  } else {
    await setDoc(ref, {
      ...pubblici,
      role: "user",
      verified: false,
      reportsCount: 0,
      likes: 0,
      dislikes: 0,
      banned: false,
      chatMuted: false,
      onboardingCompleted: false,
      memberSince: serverTimestamp(),
    });
  }

  await setDoc(
    doc(db, "userContacts", utente.uid),
    { phone, email: utente.email || "" },
    { merge: true }
  );
}

export async function completaOnboarding() {
  await updateDoc(doc(db, "users", auth.currentUser.uid), {
    onboardingCompleted: true,
    disclaimerAccepted: true,
    disclaimerAcceptedAt: serverTimestamp(),
  });
}