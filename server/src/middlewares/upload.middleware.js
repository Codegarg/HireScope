import multer from 'multer';

// Store files in memory — buffer is passed directly to the controller / storage service
const storage = multer.memoryStorage();

// Accepted MIME types for resume uploads
const ALLOWED_MIMETYPES = new Set([
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword',  // .doc (legacy Word)
    'text/plain',          // .txt
]);

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIMETYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only PDF, DOCX, and TXT files are allowed'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});
