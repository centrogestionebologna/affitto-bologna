const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Ridimensiona e comprime l'immagine nel browser prima dell'upload
function comprimiImmagine(file, latoMax = 1280, qualita = 0.82) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      const scala = Math.min(1, latoMax / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scala);
      canvas.height = Math.round(img.height * scala);
      canvas
        .getContext("2d")
        .drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error("Compressione dell'immagine non riuscita.")),
        "image/jpeg",
        qualita
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(
        new Error(
          "Impossibile leggere l'immagine. Usa un file JPG, PNG o WebP."
        )
      );
    };

    img.src = url;
  });
}

// Carica un'immagine su Cloudinary e restituisce l'URL pubblico (https)
export async function caricaImmagine(file) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Upload foto non configurato: imposta VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET nel file .env."
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error("Il file selezionato non è un'immagine.");
  }

  const blob = await comprimiImmagine(file);

  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", UPLOAD_PRESET);

  const risposta = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData }
  );

  const dati = await risposta.json().catch(() => ({}));

  if (!risposta.ok) {
    throw new Error(dati?.error?.message || "Caricamento della foto non riuscito.");
  }

  return dati.secure_url;
}