import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import PageContainer from "../components/PageContainer";
import { percorsoDettaglio, secondi } from "../utils/helpers";

const ICONE = { contact: "📨", decision: "✅", favorite: "❤️", edit: "✏️" };

function Notifiche() {
  const navigate = useNavigate();
  const [notifiche, setNotifiche] = useState([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid)
    );

    return onSnapshot(
      q,
      (snap) => {
        setNotifiche(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => secondi(b.createdAt) - secondi(a.createdAt))
        );
        setErrore("");
        setCaricamento(false);
      },
      (error) => {
        console.error(error);
        setErrore("Impossibile caricare le notifiche.");
        setCaricamento(false);
      }
    );
  }, []);

  const apri = async (n) => {
    if (!n.read) {
      try {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      } catch (error) {
        console.error(error);
      }
    }
    if (n.type === "contact") {
      navigate("/annunci");
    } else if (n.listingId && n.listingType) {
      navigate(percorsoDettaglio(n.listingType, n.listingId));
    }
  };

  const segnaTutte = async () => {
    const nonLette = notifiche.filter((n) => !n.read);
    if (!nonLette.length) return;

    try {
      const batch = writeBatch(db);
      nonLette.forEach((n) =>
        batch.update(doc(db, "notifications", n.id), { read: true })
      );
      await batch.commit();
    } catch (error) {
      console.error(error);
      alert("Operazione non riuscita, riprova.");
    }
  };

  const nonLette = notifiche.filter((n) => !n.read).length;

  return (
    <PageContainer>
      <h1 className="titolo-pagina">🔔 Notifiche</h1>

      {caricamento ? (
        <p className="caricamento">Caricamento notifiche...</p>
      ) : errore ? (
        <p className="alert alert--errore">{errore}</p>
      ) : notifiche.length === 0 ? (
        <div className="vuoto">
          <p>Nessuna notifica per ora.</p>
        </div>
      ) : (
        <>
          <button
            type="button"
            className="btn btn--sec btn--piccolo"
            onClick={segnaTutte}
            disabled={!nonLette}
          >
            ✔ Segna tutte come lette
          </button>

          <ul className="notifiche">
            {notifiche.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={"notifica" + (n.read ? "" : " notifica--nuova")}
                  onClick={() => apri(n)}
                >
                  <span className="notifica__icona">{ICONE[n.type] || "🔔"}</span>
                  <span className="notifica__testo">
                    {n.message}
                    {n.createdAt?.toDate && (
                      <small className="tenue">
                        {n.createdAt.toDate().toLocaleString("it-IT", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </small>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </PageContainer>
  );
}

export default Notifiche;