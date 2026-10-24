/**
 * Toast 上下文与读取钩子（与 Provider 分离，便于 Fast Refresh）
 */
import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'info'

export type ShowToast = (type: ToastType, title: string, message: ReactNode) => void

export const ToastContext = createContext<ShowToast | null>(null)

export function useToast(): ShowToast {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast 必须在 <ToastProvider> 内使用')
  return context
}
