import { useEffect, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "../firebase";
import useRecensioni from "../hooks/useRecensioni";
import { nomeCorrente } from "../services/annunci";

export function Stelle({ valore = 0 }) {
  const piene = Math.round(valore);
  return (
    <span className="stelle" aria-label={`${valore.toFixed(1)} su 5`}>
      {"★".repeat(piene)}
      {"☆".repeat(5 - piene)}
    </span>
  );
}

function SelettoStelle({ valore, onChange }) {
  return (
    <div className="stelle stelle--input" role="radiogroup" aria-label="Valutazione">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          role="radio"
          aria-checked={valore === n}
          className={n <= valore ? "on" : ""}
          onClick={() => onChange(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export function ValutazioneSintetica({ userId }) {
  const { media, recensioni, caricamento } = useRecensioni(userId);

  if (caricamento) return null;
  if (!recensioni.length) return <span className="tenue">Nessuna recensione</span>;

  return (
    <span>
      <Stelle valore={media} /> {media.toFixed(1)} ({recensioni.length}{" "}
      {recensioni.length === 1 ? "recensione" : "recensioni"})
    </span>
  );
}

function Recensioni({ userId, puoiRecensire }) {
  const { recensioni, media, caricamento, errore, ricarica } =
    useRecensioni(userId);

  const mia = recensioni.find((r) => r.reviewerId === auth.currentUser.uid);

  const [voto, setVoto] = useState(5);
  const [testo, setTesto] = useState("");
  const [invio, setInvio] = useState(false);
  const [messaggio, setMessaggio] = useState("");

  useEffect(() => {
    if (mia) {
      setVoto(mia.rating);
      setTesto(mia.comment || "");
    }
  }, [mia?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const invia = async (e) => {
    e.preventDefault();
    setInvio(true);
    setMessaggio("");

    try {
      const me = auth.currentUser.uid;
      await setDoc(doc(db, "reviews", `${me}_${userId}`), {
        reviewedId: userId,
        reviewerId: me,
        reviewerName: nomeCorrente(),
        rating: voto,
        comment: testo.trim(),
        createdAt: serverTimestamp(),
      });
      setMessaggio(mia ? "Recensione aggiornata." : "Recensione pubblicata.");
      await ricarica();
    } catch (error) {
      console.error(error);
      setMessaggio("Recensione non salvata, riprova.");
    } finally {
      setInvio(false);
    }
  };

  return (
    <section className="sezione">
      <h2 className="sezione__titolo">⭐ Recensioni</h2>

      {caricamento ? (
        <p className="caricamento">Caricamento recensioni...</p>
      ) : errore ? (
        <p className="alert alert--errore">{errore}</p>
      ) : (
        <>
          <p className="recensioni__media">
            {recensioni.length ? (
              <>
                <Stelle valore={media} /> <strong>{media.toFixed(1)}</strong> su
                5 · {recensioni.length}{" "}
                {recensioni.length === 1 ? "recensione" : "recensioni"}
              </>
            ) : (
              "Ancora nessuna recensione."
            )}
          </p>

          {recensioni.map((r) => (
            <article className="recensione" key={r.id}>
              <div>
                <strong>{r.reviewerName || "Utente"}</strong>{" "}
                <Stelle valore={r.rating} />
              </div>
              {r.comment && <p>{r.comment}</p>}
              {r.createdAt?.toDate && (
                <small className="tenue">
                  {r.createdAt.toDate().toLocaleDateString("it-IT")}
                </small>
              )}
            </article>
          ))}
        </>
      )}

      {puoiRecensire && (
        <form className="scheda" onSubmit={invia}>
          <h3>{mia ? "Modifica la tua recensione" : "Lascia una recensione"}</h3>
          <SelettoStelle valore={voto} onChange={setVoto} />
          <div className="campo">
            <textarea
              placeholder="Com'è stata la tua esperienza? (facoltativo)"
              value={testo}
              maxLength={500}
              onChange={(e) => setTesto(e.target.value)}
            />
          </div>
          {messaggio && <p className="alert alert--ok">{messaggio}</p>}
          <button type="submit" className="btn btn--primario" disabled={invio}>
            {invio ? "Invio..." : mia ? "Aggiorna recensione" : "Pubblica recensione"}
          </button>
        </form>
      )}
    </section>
  );
}

export default Recensioni;