export const MAX_PHOTO_SOURCE_SIZE_BYTES = 15 * 1024 * 1024;

export function fileToCompressedDataUrl(
  file: File,
  { maxWidth = 1600, quality = 0.8 } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error("Could not read the selected file"));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("Could not decode the selected image"));

      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas is not supported in this browser"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
