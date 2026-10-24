/**
 * 面板一：代理链接 → Clash 配置
 * 转换在浏览器本地完成；订阅链接通过后端签发（含 AES-256-GCM 加密）
 */
import { useState } from 'react'
import type { RefObject } from 'react'
import { PROTOCOL_PREFIXES, convertUrlToClash } from '../../shared'
import type { ClashConversion, ProxyProtocol } from '../../shared'
import {
  ChevronDownIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  LinkIcon,
  SwapRightIcon,
  TrashIcon,
} from '../components/icons'
import { useToast } from '../hooks/toastContext'
import { requestSubscriptionUrl } from '../lib/api'
import { copyText } from '../lib/clipboard'
import { PLACEHOLDERS, PROTOCOL_OPTIONS } from '../lib/constants'
import { downloadText } from '../lib/download'

type SubState = 'idle' | 'loading' | 'ready' | 'error'

interface Props {
  inputRef: RefObject<HTMLInputElement | null>
}

export function ProxyToClash({ inputRef }: Props) {
  const showToast = useToast()

  const [protocol, setProtocol] = useState<ProxyProtocol>('vless')
  const [url, setUrl] = useState('')
  const [locked, setLocked] = useState(false)
  const [result, setResult] = useState<ClashConversion | null>(null)
  // 每次转换自增，用作结果区 key —— 触发入场动画
  const [runId, setRunId] = useState(0)
  const [subUrl, setSubUrl] = useState('')
  const [subState, setSubState] = useState<SubState>('idle')
  const [subError, setSubError] = useState('')

  const loadSubscription = async (value: string) => {
    setSubState('loading')
    setSubError('')
    setSubUrl('')
    try {
      const link = await requestSubscriptionUrl(value)
      setSubUrl(link)
      setSubState('ready')
    } catch (error) {
      setSubState('error')
      setSubError((error as Error).message)
    }
  }

  const resetOutput = () => {
    setLocked(false)
    setResult(null)
    setSubUrl('')
    setSubState('idle')
    setSubError('')
  }

  const handleConvert = () => {
    if (locked) {
      resetOutput()
      inputRef.current?.focus()
      return
    }

    const value = url.trim()
    if (!value) {
      showToast('info', '提示', '请先输入代理链接')
      return
    }

    if (!value.startsWith(PROTOCOL_PREFIXES[protocol])) {
      showToast(
        'error',
        '协议不匹配',
        <>
          选择了 <strong>{protocol.toUpperCase()}</strong>，但链接以 <code>{value.slice(0, 12)}…</code> 开头
        </>,
      )
      return
    }

    let conversion: ClashConversion
    try {
      conversion = convertUrlToClash(value)
    } catch (error) {
      showToast('error', '转换失败', (error as Error).message)
      return
    }

    setResult(conversion)
    setRunId((id) => id + 1)
    setLocked(true)
    showToast(
      'success',
      '转换成功',
      <>
        已生成 <strong>{conversion.protocol}</strong> 配置，共 {conversion.yaml.length} 字节
      </>,
    )
    void loadSubscription(value)
  }

  const handleClear = () => {
    resetOutput()
    setUrl('')
    inputRef.current?.focus()
  }

  const handleCopySub = async () => {
    if (subState !== 'ready' || !subUrl) {
      showToast('info', '提示', '订阅链接尚未就绪')
      return
    }
    await copyText(subUrl)
    showToast('success', '已复制', '订阅链接已复制到剪贴板')
  }

  const handleDownloadYaml = () => {
    if (!result) {
      showToast('info', '提示', '请先进行转换')
      return
    }
    downloadText(result.filename, result.yaml, 'application/yaml;charset=utf-8')
    showToast('success', '下载成功', `文件 ${result.filename} 已开始下载`)
  }

  const handleCopyYaml = async () => {
    if (!result) {
      showToast('info', '提示', '请先进行转换')
      return
    }
    await copyText(result.yaml)
    showToast('success', '已复制', 'Clash 配置已复制到剪贴板')
  }

  const subHint = subState === 'error'
    ? null
    : '将此链接添加到 Clash / Clash Meta 的「订阅」中，每次请求都会实时转换'

  return (
    <>
      <div className="proto-selector" role="tablist" aria-label="选择协议">
        {PROTOCOL_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={protocol === option.value}
            className={`proto-btn${protocol === option.value ? ' active' : ''}${locked ? ' disabled' : ''}`}
            onClick={() => {
              if (locked) return
              setProtocol(option.value)
            }}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="form-group">
        <div className="label-row">
          <label htmlFor="proxy-input">代理链接</label>
        </div>
        <div className={`input-wrap${locked ? ' locked' : ''}`}>
          <LinkIcon />
          <input
            id="proxy-input"
            ref={inputRef}
            type="text"
            value={url}
            disabled={locked}
            placeholder={PLACEHOLDERS[protocol]}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !locked) handleConvert()
            }}
          />
        </div>
      </div>

      <div className="btn-row">
        <button type="button" className={`btn ${locked ? 'btn-edit' : 'btn-primary'}`} onClick={handleConvert}>
          {locked ? (
            <>
              <EditIcon size={18} /> 重新编辑
            </>
          ) : (
            <>
              <SwapRightIcon size={18} /> 转换
            </>
          )}
        </button>
        <button type="button" className="btn btn-outline" onClick={handleClear}>
          <TrashIcon size={18} /> 清空
        </button>
      </div>

      <div key={runId} className={`output-area${result ? ' visible' : ''}`}>
        <div className="sub-section">
          <div className="sub-label">
            <LinkIcon size={18} />
            订阅链接
          </div>
          {subHint ? <div className="sub-hint">{subHint}</div> : null}
          {subState === 'error' ? (
            <div className="sub-hint error">
              订阅端点不可用（{subError}）：本地配置已生成，但订阅链接需要 Node 服务。请运行{' '}
              <code>npm run dev:server</code> 或部署服务端后
              <button
                type="button"
                className="link-btn"
                onClick={() => void loadSubscription(url.trim())}
              >
                重试
              </button>
              。
            </div>
          ) : null}
          <div className="sub-url-box">
            <input
              type="text"
              readOnly
              value={subUrl}
              placeholder={subState === 'loading' ? '正在生成订阅链接…' : '转换后自动生成'}
              aria-label="订阅链接"
            />
            <button
              type="button"
              className="btn-copy-sub"
              onClick={() => void handleCopySub()}
              disabled={subState !== 'ready'}
            >
              <CopyIcon size={15} />
              复制
            </button>
          </div>
        </div>

        <div className="yaml-section">
          <details open>
            <summary>
              <ChevronDownIcon size={16} className="chevron" />
              Clash 配置预览
            </summary>
            <div className="yaml-preview">{result?.yaml ?? ''}</div>
            <div className="output-actions">
              <button type="button" className="btn-action btn-primary-act" onClick={handleDownloadYaml}>
                <DownloadIcon size={18} />
                下载 YAML
              </button>
              <button type="button" className="btn-action btn-soft-act" onClick={() => void handleCopyYaml()}>
                <CopyIcon size={18} />
                复制配置
              </button>
            </div>
          </details>
        </div>
      </div>
    </>
  )
}
