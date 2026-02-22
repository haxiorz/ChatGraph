import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useConversationStore } from '../../stores/conversationStore'
import { Modal } from '../ui/Modal'
import { Badge } from '../ui/Badge'
import { listItem, EASE_OUT_FAST } from '../../utils/animations'
import type { SearchResult } from '../../types/index'
import * as api from '../../services/api'

const ROLE_VARIANT: Record<string, 'default' | 'accent' | 'success'> = {
  system: 'default',
  user: 'accent',
  assistant: 'success',
}

export function SearchModal() {
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query.trim()) {
      setResults([])
      return
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const response = await api.search(query, { limit: 20 })
        setResults(response.results)
        setSelectedIndex(0)
      } catch {
        setResults([])
      }
      setLoading(false)
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      setSearchOpen(false)
      navigate(`/c/${result.conversationId}`)
      setTimeout(() => {
        setActiveNode(result.nodeId)
      }, 100)
    },
    [navigate, setSearchOpen, setActiveNode],
  )

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      handleSelect(results[selectedIndex])
    }
  }

  return (
    <Modal open onClose={() => setSearchOpen(false)} className="max-w-xl" top>
      <div className="flex items-center gap-3 border-b border-[var(--glass-border)] px-5 py-4">
        <Search size={18} className="shrink-0 text-fg-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search conversations..."
          className="flex-1 bg-transparent text-sm text-fg-primary placeholder:text-fg-muted focus:outline-none"
        />
        {loading && (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        )}
      </div>

      {results.length > 0 && (
        <div className="max-h-[50vh] overflow-y-auto p-3">
          {results.map((result, idx) => (
            <motion.div
              key={`${result.nodeId}-${idx}`}
              onClick={() => handleSelect(result)}
              variants={listItem}
              initial="initial"
              animate="animate"
              transition={{ ...EASE_OUT_FAST, delay: idx * 0.03 }}
              className={`cursor-pointer rounded-lg px-4 py-3 transition-all ${
                idx === selectedIndex
                  ? 'bg-accent-muted -translate-x-0.5'
                  : 'hover:bg-[var(--glass-bg-elevated)] hover:-translate-x-0.5'
              }`}
            >
              <div className="mb-1 flex items-center gap-2">
                <Badge variant={ROLE_VARIANT[result.role] ?? 'default'}>
                  {result.role}
                </Badge>
                <span className="truncate text-xs text-fg-muted">
                  {result.conversationTitle}
                </span>
              </div>
              <p
                className="text-sm text-fg-secondary [&_mark]:rounded [&_mark]:bg-warning/20 [&_mark]:px-0.5 [&_mark]:text-warning"
                dangerouslySetInnerHTML={{ __html: result.snippet }}
              />
            </motion.div>
          ))}
        </div>
      )}

      {query.trim() && !loading && results.length === 0 && (
        <div className="p-6 text-center text-sm text-fg-muted">
          No results found for &quot;{query}&quot;
        </div>
      )}

      {!query.trim() && (
        <div className="p-6 text-center text-sm text-fg-muted">
          Type to search across all conversations
        </div>
      )}
    </Modal>
  )
}
