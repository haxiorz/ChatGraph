import { create } from 'zustand'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  action?: ToastAction
}

interface ToastStore {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

let counter = 0

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  addToast: (toast) => {
    const id = `toast-${++counter}`
    set({ toasts: [...get().toasts, { ...toast, id }] })
    setTimeout(() => {
      get().removeToast(id)
    }, toast.duration)
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) })
  },
}))

// Imperative helpers — callable from anywhere without hooks
export const toast = {
  success: (message: string, duration = 4000) =>
    useToastStore.getState().addToast({ type: 'success', message, duration }),
  error: (message: string, duration = 5000) =>
    useToastStore.getState().addToast({ type: 'error', message, duration }),
  info: (message: string, duration = 4000) =>
    useToastStore.getState().addToast({ type: 'info', message, duration }),
  warning: (message: string, duration = 4500) =>
    useToastStore.getState().addToast({ type: 'warning', message, duration }),
  withAction: (
    message: string,
    action: ToastAction,
    type: ToastType = 'info',
    duration = 8000,
  ) =>
    useToastStore.getState().addToast({ type, message, duration, action }),
}
