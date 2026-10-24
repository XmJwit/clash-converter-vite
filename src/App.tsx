import { useEffect, useRef, useState } from 'react'
import { Background } from './components/Background'
import { ClashToProxy } from './components/ClashToProxy'
import { Header } from './components/Header'
import { ModeToggle } from './components/ModeToggle'
import type { Mode } from './components/ModeToggle'
import { PrivacyNotice } from './components/PrivacyNotice'
import { ProxyToClash } from './components/ProxyToClash'
import { ToastProvider } from './hooks/ToastProvider'

export default function App() {
  const [mode, setMode] = useState<Mode>('to-clash')
  const proxyInputRef = useRef<HTMLInputElement>(null)
  const yamlTextareaRef = useRef<HTMLTextAreaElement>(null)

  // 切换模式时自动聚焦对应输入框
  useEffect(() => {
    if (mode === 'to-clash') {
      proxyInputRef.current?.focus()
    } else {
      yamlTextareaRef.current?.focus()
    }
  }, [mode])

  return (
    <ToastProvider>
      <Background />
      <div className={`glass-wrap${mode === 'to-proxy' ? ' theme-teal' : ''}`}>
        <div className="glass">
          <Header />
          <ModeToggle mode={mode} onChange={setMode} />

          <section className={`panel${mode === 'to-clash' ? ' active' : ''}`} aria-hidden={mode !== 'to-clash'}>
            <ProxyToClash inputRef={proxyInputRef} />
          </section>

          <section className={`panel${mode === 'to-proxy' ? ' active' : ''}`} aria-hidden={mode !== 'to-proxy'}>
            <ClashToProxy textareaRef={yamlTextareaRef} />
          </section>

          <PrivacyNotice />
        </div>
      </div>
    </ToastProvider>
  )
}
