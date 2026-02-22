import { readFile } from 'fs/promises'
import path from 'path'

export type FileCategory = 'text' | 'code' | 'pdf' | 'image'

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.kt',
  '.swift', '.c', '.cpp', '.h', '.hpp', '.cs', '.rb', '.php', '.sql',
  '.sh', '.bash', '.zsh', '.yml', '.yaml', '.toml', '.json', '.xml',
  '.html', '.css', '.scss', '.less', '.vue', '.svelte', '.astro',
  '.dockerfile', '.prisma', '.graphql', '.proto', '.r', '.m', '.lua',
])

const IMAGE_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico',
])

const TEXT_EXTENSIONS = new Set([
  '.txt', '.md', '.markdown', '.rst', '.csv', '.log', '.env', '.ini',
  '.cfg', '.conf', '.properties',
])

export function detectCategory(filename: string): FileCategory {
  const ext = path.extname(filename).toLowerCase()

  if (IMAGE_EXTENSIONS.has(ext)) return 'image'
  if (ext === '.pdf') return 'pdf'
  if (CODE_EXTENSIONS.has(ext)) return 'code'
  if (TEXT_EXTENSIONS.has(ext)) return 'text'

  // Default to text for unknown extensions
  return 'text'
}

export async function extractText(filePath: string, category: FileCategory): Promise<string> {
  if (category === 'image') return ''

  if (category === 'pdf') {
    return extractPdfText(filePath)
  }

  // Text and code files
  try {
    const content = await readFile(filePath, 'utf-8')
    // Truncate very large files
    const MAX_CHARS = 50000
    if (content.length > MAX_CHARS) {
      return content.substring(0, MAX_CHARS) + '\n\n[... truncated — file exceeds 50,000 characters]'
    }
    return content
  } catch {
    return '[Unable to read file]'
  }
}

const PDF_PARSE_TIMEOUT = 30000

async function extractPdfText(filePath: string): Promise<string> {
  try {
    const pdfParseModule = await import('pdf-parse')
    const pdfParse = (pdfParseModule as unknown as { default?: (buf: Buffer) => Promise<{ text: string }> }).default
      ?? (pdfParseModule as unknown as (buf: Buffer) => Promise<{ text: string }>)
    const dataBuffer = await readFile(filePath)
    const data = await Promise.race([
      pdfParse(dataBuffer),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('PDF parsing timeout')), PDF_PARSE_TIMEOUT),
      ),
    ])
    const text = data.text ?? ''
    const MAX_CHARS = 50000
    if (text.length > MAX_CHARS) {
      return text.substring(0, MAX_CHARS) + '\n\n[... truncated — PDF text exceeds 50,000 characters]'
    }
    return text
  } catch {
    return '[Unable to extract PDF text]'
  }
}

const ALLOWED_EXTENSIONS = new Set([
  ...CODE_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...TEXT_EXTENSIONS,
  '.pdf',
])

export function isAllowedExtension(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase()
  return ALLOWED_EXTENSIONS.has(ext)
}

export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_FILES = 10
