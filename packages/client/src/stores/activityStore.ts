import { create } from 'zustand'

export type ActivityEventType =
  | 'completion'
  | 'error'
  | 'tournament'
  | 'summarize'
  | 'regenerate'
  | 'title'
  | 'info'

interface ActivityEvent {
  id: string
  type: ActivityEventType
  message: string
  timestamp: number
  model?: string
}

const MAX_EVENTS = 100
let counter = 0

interface ActivityStore {
  events: ActivityEvent[]
  isOpen: boolean
  addEvent: (type: ActivityEventType, message: string, model?: string) => void
  clearEvents: () => void
  toggleOpen: () => void
  setOpen: (open: boolean) => void
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  events: [],
  isOpen: false,

  addEvent: (type, message, model) => {
    const event: ActivityEvent = {
      id: `activity-${++counter}`,
      type,
      message,
      timestamp: Date.now(),
      model,
    }
    const events = [event, ...get().events].slice(0, MAX_EVENTS)
    set({ events })
  },

  clearEvents: () => set({ events: [] }),
  toggleOpen: () => set({ isOpen: !get().isOpen }),
  setOpen: (isOpen) => set({ isOpen }),
}))

// Imperative helper — callable from anywhere without hooks
export const activity = {
  log: (type: ActivityEventType, message: string, model?: string) =>
    useActivityStore.getState().addEvent(type, message, model),
}
