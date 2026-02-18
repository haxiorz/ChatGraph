import { describe, it, expect, vi, beforeEach } from 'vitest'
import { prisma } from '../prisma.js'
import * as promptService from './promptService.js'
import { AppError } from '../types/index.js'

const db = prisma as unknown as {
  prompt: {
    findMany: ReturnType<typeof vi.fn>
    findUnique: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
    createMany: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('promptService.ensureBuiltInPrompts', () => {
  it('creates missing built-in prompts', async () => {
    db.prompt.findMany.mockResolvedValue([{ name: 'Default Assistant' }])
    db.prompt.createMany.mockResolvedValue({ count: 7 })

    await promptService.ensureBuiltInPrompts()
    expect(db.prompt.createMany).toHaveBeenCalled()
    const createArg = db.prompt.createMany.mock.calls[0]![0] as { data: Array<{ name: string }> }
    // Should NOT include 'Default Assistant' since it already exists
    expect(createArg.data.every((p: { name: string }) => p.name !== 'Default Assistant')).toBe(true)
  })

  it('does nothing when all built-in prompts exist', async () => {
    // Return all 8 built-in names
    db.prompt.findMany.mockResolvedValue([
      { name: 'Default Assistant' },
      { name: 'Code Reviewer' },
      { name: 'Technical Writer' },
      { name: 'Socratic Tutor' },
      { name: 'Creative Writer' },
      { name: 'Debate Partner' },
      { name: 'Data Analyst' },
      { name: 'Concise Mode' },
    ])

    await promptService.ensureBuiltInPrompts()
    expect(db.prompt.createMany).not.toHaveBeenCalled()
  })
})

describe('promptService.list', () => {
  it('returns prompts sorted by built-in, lastUsedAt, name', async () => {
    const mockPrompts = [{ id: 'p1' }]
    db.prompt.findMany.mockResolvedValue(mockPrompts)

    const result = await promptService.list()
    expect(result).toEqual(mockPrompts)
    expect(db.prompt.findMany).toHaveBeenCalledWith({
      orderBy: [{ isBuiltIn: 'desc' }, { lastUsedAt: 'desc' }, { name: 'asc' }],
    })
  })
})

describe('promptService.create', () => {
  it('creates a custom prompt', async () => {
    const mock = { id: 'p1', name: 'My Prompt', description: 'Desc', content: 'Content' }
    db.prompt.create.mockResolvedValue(mock)

    const result = await promptService.create({ name: 'My Prompt', description: 'Desc', content: 'Content' })
    expect(result).toEqual(mock)
  })

  it('defaults description to empty string', async () => {
    db.prompt.create.mockResolvedValue({})
    await promptService.create({ name: 'Test', content: 'Content' })
    expect(db.prompt.create).toHaveBeenCalledWith({
      data: { name: 'Test', description: '', content: 'Content' },
    })
  })
})

describe('promptService.update', () => {
  it('updates a custom prompt', async () => {
    db.prompt.findUnique.mockResolvedValue({ id: 'p1', isBuiltIn: false })
    db.prompt.update.mockResolvedValue({ id: 'p1', name: 'Updated' })

    const result = await promptService.update('p1', { name: 'Updated' })
    expect(result.name).toBe('Updated')
  })

  it('throws 403 for built-in prompts', async () => {
    db.prompt.findUnique.mockResolvedValue({ id: 'p1', isBuiltIn: true })
    await expect(promptService.update('p1', { name: 'Changed' })).rejects.toThrow('Cannot modify built-in prompts')
  })

  it('throws 404 when prompt not found', async () => {
    db.prompt.findUnique.mockResolvedValue(null)
    await expect(promptService.update('missing', { name: 'x' })).rejects.toThrow('Prompt not found')
  })
})

describe('promptService.remove', () => {
  it('deletes a custom prompt', async () => {
    db.prompt.findUnique.mockResolvedValue({ id: 'p1', isBuiltIn: false })
    db.prompt.delete.mockResolvedValue({})

    await promptService.remove('p1')
    expect(db.prompt.delete).toHaveBeenCalledWith({ where: { id: 'p1' } })
  })

  it('throws 403 for built-in prompts', async () => {
    db.prompt.findUnique.mockResolvedValue({ id: 'p1', isBuiltIn: true })
    await expect(promptService.remove('p1')).rejects.toThrow('Cannot delete built-in prompts')
  })

  it('throws 404 when prompt not found', async () => {
    db.prompt.findUnique.mockResolvedValue(null)
    await expect(promptService.remove('missing')).rejects.toThrow('Prompt not found')
  })
})
