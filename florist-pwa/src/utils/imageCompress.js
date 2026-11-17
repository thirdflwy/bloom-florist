const MAX_BYTES = 1.8 * 1024 * 1024; // Target di bawah 1.8 MB (batas server 2 MB)

/**
 * Mengompres file gambar di browser menggunakan HTML5 Canvas API
 * agar ukurannya di bawah 2 MB dan berformat JPEG/WebP/PNG yang sah.
 *
 * @param {File} file File gambar asli dari input[type="file"]
 * @param {Object} options Konfigurasi dimensi dan kualitas
 * @returns {Promise<File>} File hasil kompresi
 */
export async function compressImage(
  file,
  { maxWidth = 1400, maxHeight = 1400, initialQuality = 0.84 } = {}
) {
  if (!file) {
    throw new Error('File gambar tidak ditemukan.');
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Format file tidak didukung. Pilih gambar JPG, PNG, atau WebP.');
  }

  // Jika sudah cukup kecil (< 850 KB), tetap proses ringan atau langsung kembalikan
  if (file.size <= 850 * 1024) {
    return file;
  }

  const bitmap = await loadImageElement(file);
  let { width, height } = calculateDimensions(
    bitmap.width,
    bitmap.height,
    maxWidth,
    maxHeight
  );

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  // Latar putih bersih untuk gambar transparan yang dikonversi ke JPEG
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);

  let quality = initialQuality;
  const outputMime = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
  const outputExt = outputMime === 'image/webp' ? 'webp' : 'jpg';

  let blob = await canvasToBlob(canvas, outputMime, quality);

  // Turunkan kualitas secara bertahap jika masih di atas MAX_BYTES (1.8 MB)
  while (blob && blob.size > MAX_BYTES && quality > 0.4) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, outputMime, quality);
  }

  if (!blob || blob.size > 2 * 1024 * 1024) {
    throw new Error('Gambar terlalu besar dan gagal dikompres di bawah 2 MB.');
  }

  const baseName = file.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${baseName}-compressed.${outputExt}`, {
    type: outputMime,
    lastModified: Date.now(),
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Gagal membaca file gambar.'));
    };
    img.src = objectUrl;
  });
}

function calculateDimensions(srcWidth, srcHeight, maxWidth, maxHeight) {
  let width = srcWidth;
  let height = srcHeight;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  return { width, height };
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}
