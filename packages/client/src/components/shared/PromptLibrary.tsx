import { useState, useEffect } from 'react'
import { Pencil, Trash2, Plus } from 'lucide-react'
import type { Prompt } from '../../types/index'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Input, Textarea } from '../ui/Input'
import { Badge } from '../ui/Badge'
import * as api from '../../services/api'

interface PromptLibraryProps {
  onSelect: (content: string) => void
  selectedContent?: string
  mode?: 'selector' | 'manager'
}

export function PromptLibrary({
  onSelect,
  selectedContent,
  mode = 'selector',
}: PromptLibraryProps) {
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<Prompt | null>(null)
  const [creating, setCreating] = useState(false)
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formContent, setFormContent] = useState('')

  useEffect(() => {
    api.listPrompts().then(setPrompts).catch(() => {})
  }, [])

  const filtered = prompts.filter(
    (p) =>
      p.name.toLowerCase().includes(filter.toLowerCase()) ||
      p.description.toLowerCase().includes(filter.toLowerCase()),
  )

  const handleCreate = async () => {
    if (!formName.trim() || !formContent.trim()) return
    const prompt = await api.createPrompt({
      name: formName.trim(),
      description: formDescription.trim(),
      content: formContent.trim(),
    })
    setPrompts((prev) => [...prev, prompt])
    setCreating(false)
    resetForm()
  }

  const handleUpdate = async () => {
    if (!editing || !formName.trim() || !formContent.trim()) return
    const updated = await api.updatePrompt(editing.id, {
      name: formName.trim(),
      description: formDescription.trim(),
      content: formContent.trim(),
    })
    setPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
    setEditing(null)
    resetForm()
  }

  const handleDelete = async (id: string) => {
    await api.deletePrompt(id)
    setPrompts((prev) => prev.filter((p) => p.id !== id))
  }

  const startEdit = (prompt: Prompt) => {
    setEditing(prompt)
    setFormName(prompt.name)
    setFormDescription(prompt.description)
    setFormContent(prompt.content)
  }

  const resetForm = () => {
    setFormName('')
    setFormDescription('')
    setFormContent('')
  }

  const isFormOpen = creating || editing !== null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search prompts..."
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          onClick={() => {
            setCreating(true)
            setEditing(null)
            resetForm()
          }}
        >
          <Plus size={14} className="mr-1" />
          New
        </Button>
      </div>

      {isFormOpen && (
        <div className="space-y-2 rounded-lg border border-accent/30 bg-accent-muted p-3">
          <Input
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Prompt name"
            className="h-8 text-sm"
          />
          <Input
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="Description (optional)"
            className="h-8 text-sm"
          />
          <Textarea
            value={formContent}
            onChange={(e) => setFormContent(e.target.value)}
            placeholder="System prompt content..."
            rows={3}
            className="text-sm"
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreating(false)
                setEditing(null)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={editing ? handleUpdate : handleCreate}
              disabled={!formName.trim() || !formContent.trim()}
            >
              {editing ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      )}

      <div className="max-h-60 space-y-1 overflow-y-auto">
        {filtered.map((prompt) => {
          const isSelected = selectedContent === prompt.content
          return (
            <div
              key={prompt.id}
              onClick={() => onSelect(prompt.content)}
              className={`group flex cursor-pointer items-start justify-between rounded-lg border p-2 transition-all ${
                isSelected
                  ? 'border-accent bg-accent-muted'
                  : 'border-border hover:border-border-strong'
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-fg-primary">
                    {prompt.name}
                  </span>
                  {prompt.isBuiltIn && (
                    <Badge>built-in</Badge>
                  )}
                </div>
                {prompt.description && (
                  <p className="text-xs text-fg-muted">{prompt.description}</p>
                )}
              </div>
              {mode === 'manager' && !prompt.isBuiltIn && (
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(prompt)
                    }}
                    aria-label="Edit"
                    size="sm"
                  >
                    <Pencil size={13} />
                  </IconButton>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(prompt.id)
                    }}
                    aria-label="Delete"
                    variant="danger"
                    size="sm"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-fg-muted">
            {filter ? 'No prompts match your search' : 'No prompts yet'}
          </p>
        )}
      </div>
    </div>
  )
}
