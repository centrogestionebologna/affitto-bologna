import { useState } from "react";

import {
  FILTRI_INIZIALI,
  GENERI,
  OCCUPAZIONI,
  TIPOLOGIE,
  ZONE,
} from "../utils/helpers";

function Filtri({ filtri, setFiltri, mostraDeposito = true }) {
  const [aperto, setAperto] = useState(false);

  const cambia = (chiave) => (e) => {
    const valore =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setFiltri((f) => ({ ...f, [chiave]: valore }));
  };

  const attivi = [
    filtri.zona,
    filtri.genere,
    filtri.occupazione,
    filtri.prezzoMax,
    filtri.tipologia,
    filtri.animali,
    filtri.fumatori,
    filtri.disponibileEntro,
    mostraDeposito && filtri.depositoMax,
    filtri.ordine !== "recenti" && filtri.ordine,
  ].filter(Boolean).length;

  return (
    <div className="filtri">
      <div className="filtri__barra">
        <input
          type="search"
          placeholder="🔍 Cerca..."
          value={filtri.testo}
          onChange={cambia("testo")}
          aria-label="Cerca per titolo, descrizione, zona o sottozona"
        />

        <button
          type="button"
          className={"btn filtri__bottone " + (aperto || attivi ? "btn--primario" : "btn--sec")}
          onClick={() => setAperto((v) => !v)}
          aria-expanded={aperto}
        >
          ⚙️ Filtri{attivi ? ` (${attivi})` : ""}
        </button>
      </div>

      {aperto && (
        <div className="filtri__pannello">
          <div className="campo">
            <label htmlFor="f-zona">Zona</label>
            <select id="f-zona" value={filtri.zona} onChange={cambia("zona")}>
              <option value="">Tutte le zone</option>
              {ZONE.map((z) => (
                <option key={z}>{z}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="f-genere">Genere</label>
            <select id="f-genere" value={filtri.genere} onChange={cambia("genere")}>
              <option value="">Tutti</option>
              {GENERI.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="f-occ">Occupazione</label>
            <select id="f-occ" value={filtri.occupazione} onChange={cambia("occupazione")}>
              <option value="">Tutte</option>
              {OCCUPAZIONI.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="campo">
            <label htmlFor="f-prezzo">Prezzo massimo (€)</label>
            <input
              id="f-prezzo"
              type="number"
              min="0"
              value={filtri.prezzoMax}
              onChange={cambia("prezzoMax")}
            />
          </div>

          <div className="campo">
            <label htmlFor="f-tipologia">Tipologia alloggio</label>
            <select id="f-tipologia" value={filtri.tipologia} onChange={cambia("tipologia")}>
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

          <div className="campo">
            <label htmlFor="f-ordine">Ordina per</label>
            <select id="f-ordine" value={filtri.ordine} onChange={cambia("ordine")}>
              <option value="recenti">Più recenti</option>
              <option value="vecchi">Meno recenti</option>
              <option value="prezzo-asc">Prezzo crescente</option>
              <option value="prezzo-desc">Prezzo decrescente</option>
            </select>
          </div>

          <div className="filtri__opzioni">
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
          </div>

          <div className="filtri__azioni">
            <button
              type="button"
              className="btn btn--sec btn--piccolo"
              onClick={() => setFiltri({ ...FILTRI_INIZIALI, testo: filtri.testo })}
            >
              ✖ Azzera filtri
            </button>
            <button
              type="button"
              className="btn btn--primario btn--piccolo"
              onClick={() => setAperto(false)}
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Filtri;