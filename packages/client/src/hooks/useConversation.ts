import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useConversationStore } from '../stores/conversationStore'

export function useConversation() {
  const { id } = useParams<{ id: string }>()
  const loadConversation = useConversationStore((s) => s.loadConversation)
  const reset = useConversationStore((s) => s.reset)

  useEffect(() => {
    if (id) {
      loadConversation(id)
    } else {
      reset()
    }
  }, [id, loadConversation, reset])
}
