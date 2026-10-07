import { useEffect, useState } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";

import { auth, db } from "../firebase";
import ListingCard from "./ListingCard";
import {
  PROPERTIES,
  punteggioSuggerimento,
  secondi,
} from "../utils/helpers";

// referenti: annunci (o criteri) su cui basare i suggerimenti
// catalogo: annunci già caricati dalla pagina; se assente li carica da Firestore
// esclusi: id da non mostrare
function Suggerimenti({ referenti = [], catalogo, esclusi = [] }) {
  const [caricati, setCaricati] = useState([]);

  useEffect(() => {
    if (catalogo) return;
    let attivo = true;

    getDocs(
      query(collection(db, PROPERTIES), where("status", "==", "active"))
    )
      .then((snap) => {
        if (attivo) setCaricati(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      })
      .catch((error) => console.error(error));

    return () => {
      attivo = false;
    };
  }, [catalogo]);

  const lista = catalogo || caricati;
  if (!referenti.length || !lista.length) return null;

  const uid = auth.currentUser.uid;

  const suggeriti = lista
    .filter(
      (a) =>
        a.status === "active" &&
        a.ownerId !== uid &&
        !esclusi.includes(a.id)
    )
    .map((a) => ({ a, punti: punteggioSuggerimento(a, referenti) }))
    .filter((x) => x.punti >= 2)
    .sort(
      (x, y) =>
        y.punti - x.punti || secondi(y.a.createdAt) - secondi(x.a.createdAt)
    )
    .slice(0, 3);

  if (!suggeriti.length) return null;

  return (
    <section className="sezione">
      <h2 className="sezione__titolo">🏠 Potrebbero interessarti</h2>
      <div className="griglia-annunci">
        {suggeriti.map(({ a }) => (
          <ListingCard key={a.id} annuncio={a} tipo={PROPERTIES} compatta />
        ))}
      </div>
    </section>
  );
}

export default Suggerimenti;