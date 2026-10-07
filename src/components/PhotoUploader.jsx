import { useEffect, useRef, useState } from "react";

import { caricaImmagine } from "../utils/cloudinary";
import { MAX_FOTO } from "../utils/helpers";

// photos: array di URL. setPhotos: setter di useState (accetta anche funzioni).
function PhotoUploader({ photos, setPhotos, onBusy }) {
  const inputAggiungi = useRef(null);
  const inputSostituisci = useRef(null);
  const indiceSostituzione = useRef(null);

  const [inCorso, setInCorso] = useState(0);
  const [errore, setErrore] = useState("");

  useEffect(() => {
    if (onBusy) onBusy(inCorso > 0);
  }, [inCorso, onBusy]);

  const aggiungi = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    const liberi = MAX_FOTO - photos.length - inCorso;
    if (liberi <= 0) {
      setErrore(`Puoi caricare al massimo ${MAX_FOTO} foto.`);
      return;
    }

    const daCaricare = files.slice(0, liberi);
    setErrore(
      files.length > liberi
        ? `Massimo ${MAX_FOTO} foto: ne ho caricate ${daCaricare.length}.`
        : ""
    );

    setInCorso((n) => n + daCaricare.length);

    const risultati = await Promise.allSettled(
      daCaricare.map((f) => caricaImmagine(f))
    );

    const urls = risultati
      .filter((r) => r.status === "fulfilled")
      .map((r) => r.value);
    const fallito = risultati.find((r) => r.status === "rejected");

    if (urls.length) {
      setPhotos((prev) => [...prev, ...urls].slice(0, MAX_FOTO));
    }
    if (fallito) {
      setErrore(fallito.reason?.message || "Caricamento non riuscito.");
    }

    setInCorso((n) => n - daCaricare.length);
  };

  const avviaSostituzione = (indice) => {
    indiceSostituzione.current = indice;
    inputSostituisci.current?.click();
  };

  const sostituisci = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    const indice = indiceSostituzione.current;
    if (!file || indice === null) return;

    setErrore("");
    setInCorso((n) => n + 1);

    try {
      const url = await caricaImmagine(file);
      setPhotos((prev) => prev.map((u, i) => (i === indice ? url : u)));
    } catch (error) {
      setErrore(error.message || "Sostituzione non riuscita.");
    } finally {
      setInCorso((n) => n - 1);
    }
  };

  const rendiPrincipale = (indice) =>
    setPhotos((prev) => {
      const copia = [...prev];
      const [scelta] = copia.splice(indice, 1);
      return [scelta, ...copia];
    });

  const rimuovi = (indice) =>
    setPhotos((prev) => prev.filter((_, i) => i !== indice));

  return (
    <div className="foto-uploader">
      <div className="foto-uploader__testa">
        <strong>
          Foto ({photos.length}/{MAX_FOTO})
        </strong>
        <span>La prima foto è quella principale</span>
      </div>

      <div className="foto-uploader__griglia">
        {photos.map((url, i) => (
          <div className="foto-tile" key={url + i}>
            <img src={url} alt={`Anteprima foto ${i + 1}`} />

            {i === 0 && <span className="foto-tile__badge">Principale</span>}

            <div className="foto-tile__azioni">
              {i > 0 && (
                <button
                  type="button"
                  title="Imposta come principale"
                  onClick={() => rendiPrincipale(i)}
                >
                  ⭐
                </button>
              )}
              <button
                type="button"
                title="Sostituisci"
                onClick={() => avviaSostituzione(i)}
              >
                🔄
              </button>
              <button
                type="button"
                title="Rimuovi"
                onClick={() => rimuovi(i)}
              >
                🗑
              </button>
            </div>
          </div>
        ))}

        {Array.from({ length: inCorso }).map((_, i) => (
          <div className="foto-tile foto-tile--carica" key={`carica-${i}`}>
            <span className="spinner" />
          </div>
        ))}

        {photos.length + inCorso < MAX_FOTO && (
          <button
            type="button"
            className="foto-tile foto-tile--aggiungi"
            onClick={() => inputAggiungi.current?.click()}
          >
            ➕
            <span>Aggiungi</span>
          </button>
        )}
      </div>

      <input
        ref={inputAggiungi}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={aggiungi}
      />
      <input
        ref={inputSostituisci}
        type="file"
        accept="image/*"
        hidden
        onChange={sostituisci}
      />

      {errore && <p className="alert alert--errore">{errore}</p>}
    </div>
  );
}

export default PhotoUploader;