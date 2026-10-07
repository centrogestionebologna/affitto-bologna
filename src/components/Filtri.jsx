import { useState } from "react";

import {
  FILTRI_INIZIALI,
  GENERI,
  OCCUPAZIONI,
  TIPOLOGIE,
  ZONE,
} from "../utils/helpers";

function Filtri({ filtri, setFiltri, mostraDeposito = true }) {
  const [avanzati, setAvanzati] = useState(false);

  const cambia = (chiave) => (e) => {
    const valore =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFiltri((f) => ({ ...f, [chiave]: valore }));
  };

  const attiviAvanzati = [
    filtri.tipologia,
    filtri.animali,
    filtri.fumatori,
    filtri.disponibileEntro,
    mostraDeposito && filtri.depositoMax,
  ].filter(Boolean).length;

  return (
    <div className="filtri">
      <input
        type="search"
        className="filtri__ricerca"
        placeholder="🔍 Cerca..."
        value={filtri.testo}
        onChange={cambia("testo")}
        aria-label="Cerca per titolo, descrizione, zona o sottozona"
      />

      <div className="filtri__riga">
        <select value={filtri.zona} onChange={cambia("zona")} aria-label="Zona">
          <option value="">📍 Tutte le zone</option>
          {ZONE.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>

        <select
          value={filtri.genere}
          onChange={cambia("genere")}
          aria-label="Genere"
        >
          <option value="">🩷💙🤍 Tutti</option>
          {GENERI.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <select
          value={filtri.occupazione}
          onChange={cambia("occupazione")}
          aria-label="Occupazione"
        >
          <option value="">🎓💼 Tutti</option>
          {OCCUPAZIONI.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          placeholder="💰 Prezzo massimo (€)"
          value={filtri.prezzoMax}
          onChange={cambia("prezzoMax")}
        />

        <select
          value={filtri.ordine}
          onChange={cambia("ordine")}
          aria-label="Ordinamento"
        >
          <option value="recenti">🕒 Più recenti</option>
          <option value="vecchi">🕒 Meno recenti</option>
          <option value="prezzo-asc">💰 Prezzo crescente</option>
          <option value="prezzo-desc">💰 Prezzo decrescente</option>
        </select>
      </div>

      <div className="filtri__azioni">
        <button
          type="button"
          className="btn btn--sec btn--piccolo"
          onClick={() => setAvanzati((v) => !v)}
          aria-expanded={avanzati}
        >
          ⚙️ Filtri avanzati{attiviAvanzati ? ` (${attiviAvanzati})` : ""}
        </button>

        <button
          type="button"
          className="btn btn--sec btn--piccolo"
          onClick={() => setFiltri({ ...FILTRI_INIZIALI })}
        >
          ✖ Azzera filtri
        </button>
      </div>

      {avanzati && (
        <div className="filtri__avanzati">
          <label className="check">
            <input
              type="checkbox"
              checked={filtri.animali}
              onChange={cambia("animali")}
            />
            🐶 Animali ammessi
          </label>

          <label className="check">
            <input
              type="checkbox"
              checked={filtri.fumatori}
              onChange={cambia("fumatori")}
            />
            🚬 Fumatori ammessi
          </label>

          <div className="campo">
            <label htmlFor="f-tipologia">Tipologia alloggio</label>
            <select
              id="f-tipologia"
              value={filtri.tipologia}
              onChange={cambia("tipologia")}
            >
              <option value="">Tutte</option>
              {TIPOLOGIE.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="f-data">Disponibile entro il</label>
            <input
              id="f-data"
              type="date"
              value={filtri.disponibileEntro}
              onChange={cambia("disponibileEntro")}
            />
          </div>

          {mostraDeposito && (
            <div className="campo">
              <label htmlFor="f-deposito">Deposito massimo (€)</label>
              <input
                id="f-deposito"
                type="number"
                min="0"
                value={filtri.depositoMax}
                onChange={cambia("depositoMax")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Filtri;