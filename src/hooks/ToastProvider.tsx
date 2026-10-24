/**
 * 顶部 Toast：从顶部滑入 → 停留 2s → 3s 淡出；悬停暂停，点 × 立即消失
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CheckIcon, InfoIcon, XCircleIcon, XIcon } from '../components/icons'
import { ToastContext } from './toastContext'
import type { ShowToast, ToastType } from './toastContext'

interface ToastContent {
  type: ToastType
  title: string
  message: ReactNode
}

/** 停留时长，之后进入淡出动画 */
const HOLD_MS = 2000

export function ToastProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ToastContent | null>(null)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<number | null>(null)
  const hoveredRef = useRef(false)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const scheduleFade = useCallback(() => {
    clearTimer()
    if (hoveredRef.current) return
    timerRef.current = window.setTimeout(() => setFading(true), HOLD_MS)
  }, [clearTimer])

  const show = useCallback<ShowToast>(
    (type, title, message) => {
      hoveredRef.current = false
      setContent({ type, title, message })
      setFading(false)
      scheduleFade()
    },
    [scheduleFade],
  )

  useEffect(() => clearTimer, [clearTimer])

  const handleEnter = () => {
    hoveredRef.current = true
    clearTimer()
    setFading(false)
  }

  const handleLeave = () => {
    hoveredRef.current = false
    setFading(true)
  }

  const handleDismiss = () => {
    clearTimer()
    setFading(true)
  }

  const icon = useMemo(() => {
    const type = content?.type ?? 'info'
    if (type === 'success') return <CheckIcon size={15} />
    if (type === 'error') return <XCircleIcon size={15} />
    return <InfoIcon size={15} />
  }, [content?.type])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className={`toast${content ? ' show' : ''}${fading ? ' fading' : ''}`}
        role="status"
        aria-live="polite"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div className="toast-inner">
          <div className={`ti ${content?.type ?? 'info'}`}>{icon}</div>
          <span className="tt">{content?.title}</span>
          <span className="tm">{content?.message}</span>
          <button className="dismiss" type="button" aria-label="关闭提示" onClick={handleDismiss}>
            <XIcon size={14} />
          </button>
        </div>
      </div>
    </ToastContext.Provider>
  )
}
