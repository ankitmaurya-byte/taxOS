import multer from 'multer'

// Memory storage keeps the file buffer in-process. We never write to local
// disk — Cloudinary is the only persistent blob store.
const storage = multer.memoryStorage()

const allowed = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/json',
]

export const upload = multer({
  storage,
  // Hard cap the request body at 25 MB. Files under CLOUDINARY_SIZE_LIMIT (1 MB)
  // get pushed to Cloudinary; larger files are still accepted but we only run
  // extraction on them — they are never persisted as blobs.
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`))
    }
  },
})
