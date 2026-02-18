import { prisma } from '../prisma.js'
import { AppError } from '../types/index.js'

const BUILT_IN_PROMPTS = [
  {
    name: 'Default Assistant',
    description: 'A helpful general-purpose assistant',
    content: 'You are a helpful assistant.',
  },
  {
    name: 'Code Reviewer',
    description: 'Reviews code for bugs, style, and best practices',
    content:
      'You are an expert code reviewer. Analyze code for bugs, security issues, performance problems, and style violations. Provide specific, actionable feedback with code examples where appropriate.',
  },
  {
    name: 'Technical Writer',
    description: 'Writes clear technical documentation',
    content:
      'You are a technical writer who creates clear, concise documentation. Use simple language, provide examples, and structure content with headings and lists for readability.',
  },
  {
    name: 'Socratic Tutor',
    description: 'Teaches by asking guiding questions',
    content:
      'You are a Socratic tutor. Instead of giving direct answers, guide the learner through questions that help them discover the answer themselves. Provide hints when they are stuck.',
  },
  {
    name: 'Creative Writer',
    description: 'Assists with creative writing and storytelling',
    content:
      'You are a creative writing assistant. Help with storytelling, character development, world-building, and prose style. Be imaginative and provide vivid, engaging suggestions.',
  },
  {
    name: 'Debate Partner',
    description: 'Argues the opposing side of any topic',
    content:
      'You are a debate partner. When given a position, argue the opposing side with well-reasoned, evidence-based arguments. Be respectful but challenging. Help strengthen the user\'s thinking.',
  },
  {
    name: 'Data Analyst',
    description: 'Analyzes data and explains insights',
    content:
      'You are a data analyst. Help interpret data, suggest visualizations, write SQL queries, and explain statistical concepts. Be precise with numbers and transparent about assumptions.',
  },
  {
    name: 'Concise Mode',
    description: 'Gives brief, direct answers',
    content:
      'Be extremely concise. Give the shortest correct answer possible. No filler, no preamble, no caveats unless critical. Use bullet points over paragraphs.',
  },
]

export async function ensureBuiltInPrompts(): Promise<void> {
  const existing = await prisma.prompt.findMany({
    where: { isBuiltIn: true },
    select: { name: true },
  })
  const existingNames = new Set(existing.map((p) => p.name))

  const toCreate = BUILT_IN_PROMPTS.filter((p) => !existingNames.has(p.name))
  if (toCreate.length > 0) {
    await prisma.prompt.createMany({
      data: toCreate.map((p) => ({ ...p, isBuiltIn: true })),
    })
  }
}

export async function list() {
  return prisma.prompt.findMany({
    orderBy: [{ isBuiltIn: 'desc' }, { lastUsedAt: 'desc' }, { name: 'asc' }],
  })
}

export async function create(input: {
  name: string
  description?: string
  content: string
}) {
  return prisma.prompt.create({
    data: {
      name: input.name,
      description: input.description ?? '',
      content: input.content,
    },
  })
}

export async function update(
  id: string,
  input: { name?: string; description?: string; content?: string },
) {
  const prompt = await prisma.prompt.findUnique({ where: { id } })
  if (!prompt) {
    throw new AppError('Prompt not found', 404, 'NOT_FOUND')
  }
  if (prompt.isBuiltIn) {
    throw new AppError('Cannot modify built-in prompts', 403, 'FORBIDDEN')
  }
  return prisma.prompt.update({
    where: { id },
    data: input,
  })
}

export async function remove(id: string) {
  const prompt = await prisma.prompt.findUnique({ where: { id } })
  if (!prompt) {
    throw new AppError('Prompt not found', 404, 'NOT_FOUND')
  }
  if (prompt.isBuiltIn) {
    throw new AppError('Cannot delete built-in prompts', 403, 'FORBIDDEN')
  }
  await prisma.prompt.delete({ where: { id } })
}

export async function markUsed(id: string) {
  await prisma.prompt.update({
    where: { id },
    data: { lastUsedAt: new Date() },
  })
}
