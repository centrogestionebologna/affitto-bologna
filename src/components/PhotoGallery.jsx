import { useEffect, useState } from "react";

function PhotoGallery({ photos = [], alt = "" }) {
  const [indice, setIndice] = useState(0);
  const [aperta, setAperta] = useState(false);

  useEffect(() => {
    if (indice >= photos.length) setIndice(0);
  }, [photos.length, indice]);

  useEffect(() => {
    if (!aperta) return;
    const onKey = (e) => {
      if (e.key === "Escape") setAperta(false);
      if (e.key === "ArrowRight") vai(1);
      if (e.key === "ArrowLeft") vai(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!photos.length) {
    return <div className="galleria galleria--vuota">📷 Nessuna foto</div>;
  }

  const vai = (delta) =>
    setIndice((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="galleria">
      <div className="galleria__principale">
        <img
          src={photos[indice]}
          alt={`${alt} - foto ${indice + 1}`}
          onClick={() => setAperta(true)}
        />

        {photos.length > 1 && (
          <>
            <button
              type="button"
              className="galleria__nav galleria__nav--prev"
              onClick={() => vai(-1)}
              aria-label="Foto precedente"
            >
              ‹
            </button>
            <button
              type="button"
              className="galleria__nav galleria__nav--next"
              onClick={() => vai(1)}
              aria-label="Foto successiva"
            >
              ›
            </button>
            <span className="card__conteggio">
              {indice + 1} / {photos.length}
            </span>
          </>
        )}
      </div>

      {photos.length > 1 && (
        <div className="galleria__miniature">
          {photos.map((url, i) => (
            <button
              type="button"
              key={url + i}
              className={i === indice ? "attiva" : ""}
              onClick={() => setIndice(i)}
              aria-label={`Mostra foto ${i + 1}`}
            >
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      )}

      {aperta && (
        <div className="lightbox" onClick={() => setAperta(false)}>
          <img
            src={photos[indice]}
            alt={`${alt} - foto ${indice + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="lightbox__chiudi"
            onClick={() => setAperta(false)}
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

export default PhotoGallery;