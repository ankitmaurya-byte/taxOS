import { create } from 'zustand'

export type DialogTone = 'default' | 'danger' | 'info'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: DialogTone
}

interface PromptOptions {
  title: string
  message?: string
  placeholder?: string
  defaultValue?: string
  confirmLabel?: string
  cancelLabel?: string
  required?: boolean
  multiline?: boolean
  tone?: DialogTone
}

interface ConfirmDialog extends ConfirmOptions {
  id: string
  kind: 'confirm'
  resolve: (value: boolean) => void
}

interface PromptDialog extends PromptOptions {
  id: string
  kind: 'prompt'
  resolve: (value: string | null) => void
}

export type Dialog = ConfirmDialog | PromptDialog

interface DialogState {
  dialogs: Dialog[]
  openConfirm: (opts: ConfirmOptions) => Promise<boolean>
  openPrompt: (opts: PromptOptions) => Promise<string | null>
  resolveDialog: (id: string, value: boolean | string | null) => void
}

function createId() {
  return `dlg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const useDialogStore = create<DialogState>((set, get) => ({
  dialogs: [],
  openConfirm: (opts) =>
    new Promise<boolean>((resolve) => {
      const dialog: ConfirmDialog = { id: createId(), kind: 'confirm', ...opts, resolve }
      set((s) => ({ dialogs: [...s.dialogs, dialog] }))
    }),
  openPrompt: (opts) =>
    new Promise<string | null>((resolve) => {
      const dialog: PromptDialog = { id: createId(), kind: 'prompt', ...opts, resolve }
      set((s) => ({ dialogs: [...s.dialogs, dialog] }))
    }),
  resolveDialog: (id, value) => {
    const dialog = get().dialogs.find((d) => d.id === id)
    if (!dialog) return
    if (dialog.kind === 'confirm') dialog.resolve(Boolean(value))
    else dialog.resolve(value as string | null)
    set((s) => ({ dialogs: s.dialogs.filter((d) => d.id !== id) }))
  },
}))

export const confirmDialog = (opts: ConfirmOptions) => useDialogStore.getState().openConfirm(opts)
export const promptDialog = (opts: PromptOptions) => useDialogStore.getState().openPrompt(opts)
