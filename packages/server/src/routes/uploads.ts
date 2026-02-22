import { Router } from 'express'
import type { Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import { randomUUID } from 'crypto'
import { mkdir } from 'fs/promises'
import { detectCategory, extractText, isAllowedExtension, MAX_FILE_SIZE, MAX_FILES } from '../utils/fileProcessing.js'

export const uploadsRouter = Router()

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    const conversationId = (_req.params as Record<string, string>).conversationId ?? 'temp'
    const dir = path.join('uploads', conversationId)
    await mkdir(dir, { recursive: true })
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const uuid = randomUUID()
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
    cb(null, `${uuid}-${safeName}`)
  },
})

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (!isAllowedExtension(file.originalname)) {
      cb(new Error(`File type not allowed: ${path.extname(file.originalname)}`))
      return
    }
    cb(null, true)
  },
})

uploadsRouter.post(
  '/conversations/:conversationId/upload',
  (req: Request, res: Response, next: NextFunction) => {
    // Validate conversation ID format
    const conversationId = (req.params as Record<string, string>).conversationId
    if (!conversationId || !UUID_REGEX.test(conversationId)) {
      res.status(400).json({ error: { message: 'Invalid conversation ID' } })
      return
    }

    // Handle multer errors with standard error format
    upload.array('files', MAX_FILES)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        res.status(400).json({ error: { message: err.message, code: 'UPLOAD_ERROR' } })
        return
      }
      if (err) {
        res.status(400).json({ error: { message: err.message, code: 'UPLOAD_ERROR' } })
        return
      }
      next()
    })
  },
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined
      if (!files || files.length === 0) {
        res.status(400).json({ error: { message: 'No files uploaded' } })
        return
      }

      const results = await Promise.all(
        files.map(async (file) => {
          const category = detectCategory(file.originalname)
          const extractedText = await extractText(file.path, category)

          return {
            id: randomUUID(),
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            category,
            storagePath: file.path,
            extractedText: category !== 'image' ? extractedText : undefined,
          }
        }),
      )

      res.json({ files: results })
    } catch (error) {
      next(error)
    }
  },
)
