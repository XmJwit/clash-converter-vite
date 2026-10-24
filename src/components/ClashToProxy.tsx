/**
 * 面板二：Clash 配置 → 代理链接
 * 支持粘贴、拖拽 / 点击上传，输入时实时校验
 */
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { convertYamlToProxyUrls } from '../../shared'
import type { ProxyUrlResult } from '../../shared'
import {
  CheckCircleIcon,
  CopyIcon,
  DownloadIcon,
  FileIcon,
  SearchIcon,
  SwapLeftIcon,
  TrashIcon,
  UploadIcon,
  XCircleIcon,
} from '../components/icons'
import { useToast } from '../hooks/toastContext'
import { copyText } from '../lib/clipboard'
import { TYPE_LABELS, YAML_PLACEHOLDER } from '../lib/constants'
import { downloadText } from '../lib/download'
import { validateYamlBasic } from '../lib/validate'
import type { YamlValidation } from '../lib/validate'

interface Props {
  textareaRef: RefObject<HTMLTextAreaElement | null>
}

export function ClashToProxy({ textareaRef }: Props) {
  const showToast = useToast()

  const [text, setText] = useState('')
  const [hint, setHint] = useState<YamlValidation | null>(null)
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [results, setResults] = useState<ProxyUrlResult[]>([])
  // 每次提取自增，用作结果区 key —— 触发入场动画
  const [runId, setRunId] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const hasResults = results.length > 0
  const validResults = results.filter((item) => item.url)

  // 输入防抖校验（400ms），输入变化时立即清空上一次的提示
  useEffect(() => {
    if (!text.trim()) return
    const timer = window.setTimeout(() => setHint(validateYamlBasic(text)), 400)
    return () => window.clearTimeout(timer)
  }, [text])

  const handleFile = (file: File) => {
    if (!/\.(yaml|yml|txt)$/i.test(file.name)) {
      showToast('error', '文件格式不支持', '请上传 .yaml / .yml / .txt 文件')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const content = String(reader.result ?? '')
      setFileName(file.name)
      setText(content)
      // 上传后立即提取
      extract(content)
    }
    reader.readAsText(file)
  }

  const extract = (raw?: string) => {
    const value = (raw ?? text).trim()
    if (!value) {
      showToast('info', '提示', '请先输入或上传 YAML 内容')
      return
    }

    const validation = validateYamlBasic(value)
    if (!validation.valid) {
      setHint(validation)
      showToast('error', '格式校验未通过', validation.error ?? '请检查 YAML 格式')
      return
    }

    setExtracting(true)
    // 让 loading 状态有机会渲染后再做同步转换
    window.setTimeout(() => {
      try {
        const items = convertYamlToProxyUrls(value)
        setResults(items)
        setRunId((id) => id + 1)
        const validCount = items.filter((item) => item.url).length
        showToast(
          'success',
          '提取成功',
          <>
            共 <strong>{items.length}</strong> 个代理，<strong>{validCount}</strong> 个有效
          </>,
        )
      } catch (error) {
        setResults([])
        showToast('error', '提取失败', (error as Error).message)
      } finally {
        setExtracting(false)
      }
    }, 0)
  }

  const handleClear = () => {
    setText('')
    setHint(null)
    setResults([])
    setFileName('')
    if (fileRef.current) fileRef.current.value = ''
    textareaRef.current?.focus()
  }

  const handleCopyOne = async (url: string) => {
    await copyText(url)
    showToast('success', '已复制', '代理链接已复制到剪贴板')
  }

  const handleCopyAll = async () => {
    const urls = validResults.map((item) => item.url as string)
    if (urls.length === 0) {
      showToast('info', '提示', '没有可复制的链接')
      return
    }
    await copyText(urls.join('\n'))
    showToast(
      'success',
      '已复制',
      <>
        已复制 {urls.length} 个代理链接到剪贴板
      </>,
    )
  }

  const handleDownloadAll = () => {
    const urls = validResults.map((item) => item.url as string)
    if (urls.length === 0) {
      showToast('info', '提示', '没有可下载的链接')
      return
    }
    downloadText('proxies.txt', urls.join('\n'))
    showToast(
      'success',
      '下载成功',
      <>
        共 {urls.length} 个链接已开始下载
      </>,
    )
  }

  const hintClass = hint ? (hint.valid ? 'validate-hint ok' : 'validate-hint error') : 'validate-hint'

  return (
    <>
      <div className="form-group">
        <div className="label-row">
          <label htmlFor="yaml-input">Clash 配置 (YAML)</label>
          <span className={hintClass}>
            {hint ? (hint.valid ? `✓ 格式有效·${hint.proxyCount} 个代理` : hint.error) : ''}
          </span>
        </div>
        <div className="yaml-input-wrap">
          <textarea
            id="yaml-input"
            ref={textareaRef}
            value={text}
            placeholder={YAML_PLACEHOLDER}
            spellCheck={false}
            className={hint && !hint.valid ? 'input-error' : undefined}
            onChange={(event) => {
              setText(event.target.value)
              setHint(null)
            }}
            onKeyDown={(event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault()
                extract()
              }
            }}
          />
        </div>
      </div>

      <div
        className={`upload-zone${dragging ? ' dragover' : ''}${fileName ? ' has-file' : ''}`}
        role="button"
        tabIndex={0}
        aria-label="上传 YAML 文件"
        onClick={() => fileRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            fileRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          const file = event.dataTransfer.files.item(0)
          if (file) handleFile(file)
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".yaml,.yml,.txt"
          onChange={(event) => {
            const file = event.target.files?.item(0)
            if (file) handleFile(file)
          }}
        />
        <div className="upload-icon-big">
          <UploadIcon size={32} strokeWidth={1.5} />
        </div>
        <div className="upload-text">
          点击上传 <strong>.yaml</strong> 文件，或拖拽到此处
        </div>
        <div className="upload-hint">支持 Clash 完整配置或 proxies 列表</div>
        <div className="file-name">
          <FileIcon size={16} />
          <span>{fileName}</span>
        </div>
      </div>

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={() => extract()} disabled={extracting}>
          {extracting ? (
            <>
              <span className="spinner" /> 提取中…
            </>
          ) : (
            <>
              <SwapLeftIcon size={18} /> 提取代理链接
            </>
          )}
        </button>
        <button type="button" className="btn btn-outline" onClick={handleClear}>
          <TrashIcon size={18} /> 清空
        </button>
      </div>

      <div key={runId} className={`output-area${hasResults ? ' visible' : ''}`}>
        <div className="proxy-results-header">
          <div className="result-count">
            共提取 <span>{validResults.length}</span> 个代理链接
          </div>
          <button type="button" className="btn btn-sm btn-success" onClick={() => void handleCopyAll()}>
            <CopyIcon size={15} />
            复制全部
          </button>
        </div>

        <div className="proxy-grid">
          {validResults.length === 0 ? (
            <div className="empty-state">
              <SearchIcon size={48} strokeWidth={1.5} />
              <p>未找到可转换的代理配置</p>
            </div>
          ) : (
            results.map((item, index) => {
              const isError = !item.url
              const badgeClass = isError ? 'unknown' : item.type || 'unknown'
              const badgeLabel = TYPE_LABELS[item.type] ?? item.type ?? '未知'
              return (
                <div
                  key={`${item.name}-${index}`}
                  className={`proxy-card ${isError ? 'error' : 'success'}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="card-top">
                    <div className="card-left">
                      <span className={`proto-badge ${badgeClass}`}>
                        {isError ? <XCircleIcon size={12} strokeWidth={2.5} /> : <CheckCircleIcon size={12} strokeWidth={2.5} />}
                        {badgeLabel}
                      </span>
                      <span className="card-name" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className={`card-url${isError ? ' error-text' : ''}`} title={item.url ?? item.error ?? ''}>
                      {isError ? `⚠ ${item.error}` : item.url}
                    </div>
                    {isError ? null : (
                      <div className="card-actions">
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => void handleCopyOne(item.url as string)}
                        >
                          <CopyIcon size={14} />
                          复制
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {validResults.length > 0 ? (
          <div className="copy-all-bar">
            <button type="button" className="btn btn-sm btn-outline" onClick={handleDownloadAll}>
              <DownloadIcon size={15} />
              下载全部
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
