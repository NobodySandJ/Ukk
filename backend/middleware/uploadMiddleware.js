const multer = require("multer");

// Konfigurasi Multer untuk pengunggahan ke Supabase
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Hanya berkas gambar yang diperbolehkan!'), false);
        }
    }
});

module.exports = upload;
