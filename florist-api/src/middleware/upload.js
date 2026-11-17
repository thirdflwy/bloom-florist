import multer from 'multer';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Deteksi tipe gambar sesungguhnya berdasarkan Magic Bytes (file signature)
 * Hanya menerima JPG, PNG, dan WebP.
 */
export function detectImageMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { mime: 'image/png', ext: 'png' };
  }

  // WebP: "RIFF" (52 49 46 46) pada byte 0..3 dan "WEBP" (57 45 42 50) pada byte 8..11
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  return null;
}

/**
 * Middleware pembuat handler upload single file + validasi ukuran 2MB & magic bytes.
 * @param {string} fieldName Nama field pada multipart/form-data ('proof' atau 'image')
 * @param {boolean} required Apakah file wajib ada
 */
export function uploadSingleImage(fieldName, required = false) {
  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            error: 'Ukuran file melebihi batas maksimal 2 MB.',
          });
        }
        return res.status(400).json({
          error: err.message || 'Gagal memproses unggahan file.',
        });
      }

      if (!req.file) {
        if (required) {
          return res.status(400).json({
            error: `File gambar (${fieldName}) wajib diunggah.`,
          });
        }
        return next();
      }

      if (req.file.size > MAX_FILE_SIZE) {
        return res.status(400).json({
          error: 'Ukuran file melebihi batas maksimal 2 MB.',
        });
      }

      const detected = detectImageMagicBytes(req.file.buffer);
      if (!detected) {
        return res.status(400).json({
          error: 'Format file tidak valid. Hanya gambar JPG, PNG, atau WebP asli yang diizinkan.',
        });
      }

      req.file.detectedMime = detected.mime;
      req.file.detectedExt = detected.ext;
      next();
    });
  };
}
