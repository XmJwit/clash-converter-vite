/**
 * 轻量 API 服务
 *
 * 前端（Vite + React）已经能在浏览器里完成全部转换，这个服务只做三件事：
 *   1. 提供 /api/sub 订阅端点（Clash 必须通过 HTTP 拉取配置）
 *   2. 签发加密订阅 token（密钥只存在服务端）
 *   3. 生产模式下托管 dist 静态资源，并提供与原版一致的 /api/convert、/api/to-url
 */
import cors from 'cors'
import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { convertUrlToClash, convertUrlToSubscription, convertYamlToProxyUrls } from '../shared/index'
import { decryptUrl, encryptUrl } from './crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = Number.parseInt(process.env.PORT ?? '8787', 10) || 8787

const app = express()
// 信任反向代理（Caddy / Nginx）转发的协议与主机头
app.set('trust proxy', true)
app.use(cors())
app.use(express.json({ limit: '4mb' }))

/** 由请求推导出对外可访问的 origin，用于拼装订阅链接 */
function resolveOrigin(req: express.Request): string {
  const forwardedProto = req.headers['x-forwarded-proto']
  const forwardedHost = req.headers['x-forwarded-host']
  const first = (value: string | string[] | undefined): string | undefined => {
    if (!value) return undefined
    const raw = Array.isArray(value) ? value[0] : value
    return raw.split(',')[0]?.trim() || undefined
  }
  const protocol = first(forwardedProto) ?? req.protocol
  const host = first(forwardedHost) ?? req.get('host') ?? `127.0.0.1:${PORT}`
  return `${protocol}://${host.replace(/\/+$/, '')}`
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'clash-converter', version: '2.0.0' })
})

/** 代理链接 → Clash 配置（与原 Flask 版接口一致） */
app.post('/api/convert', (req, res) => {
  const url = readString((req.body as Record<string, unknown> | undefined)?.url)
  if (!url) {
    res.status(400).json({ error: '请提供代理链接' })
    return
  }

  try {
    const result = convertUrlToClash(url)
    res.json({
      protocol: result.protocol,
      yaml: result.yaml,
      filename: result.filename,
      sub_url: `${resolveOrigin(req)}/api/sub?d=${encryptUrl(url)}`,
    })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

/** Clash YAML → 代理链接（与原 Flask 版接口一致） */
app.post('/api/to-url', (req, res) => {
  const yamlText = typeof (req.body as Record<string, unknown> | undefined)?.yaml === 'string'
    ? ((req.body as Record<string, unknown>).yaml as string).trim()
    : ''
  if (!yamlText) {
    res.status(400).json({ error: '请提供 YAML 内容' })
    return
  }

  try {
    const proxies = convertYamlToProxyUrls(yamlText)
    if (proxies.length === 0) {
      res.status(400).json({ error: '未找到可转换的代理配置' })
      return
    }
    res.json({ proxies, total: proxies.length })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

/** 只签发订阅 token：前端已完成本地转换，不需要再传一次结果 */
app.post('/api/sub-token', (req, res) => {
  const url = readString((req.body as Record<string, unknown> | undefined)?.url)
  if (!url) {
    res.status(400).json({ error: '请提供代理链接' })
    return
  }

  try {
    // 先校验链接是否可解析，避免签发无效 token
    convertUrlToSubscription(url)
    const token = encryptUrl(url)
    res.json({ token, sub_url: `${resolveOrigin(req)}/api/sub?d=${token}` })
  } catch (error) {
    res.status(400).json({ error: (error as Error).message })
  }
})

/** 订阅端点：无状态实时转换 */
app.get('/api/sub', (req, res) => {
  res.set('Content-Type', 'text/plain; charset=utf-8')
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  // 告知 Clash 此订阅无流量 / 到期限制
  res.set('Subscription-Userinfo', 'upload=0; download=0; total=0; expire=0')

  const encrypted = readString(req.query.d)
  const plain = readString(req.query.url)

  let rawUrl = plain
  if (encrypted) {
    try {
      rawUrl = decryptUrl(encrypted)
    } catch (error) {
      res.status(400).send(`解密失败: ${(error as Error).message}`)
      return
    }
  }

  if (!rawUrl) {
    res.status(400).send('错误: 缺少 url 参数')
    return
  }

  try {
    res.send(convertUrlToSubscription(rawUrl))
  } catch (error) {
    res.status(400).send(`错误: ${(error as Error).message}`)
  }
})

/** 旧版 /api/sub/<id> 链接的兼容提示 */
app.get('/api/sub/*fallback', (_req, res) => {
  res.status(400).type('text/plain; charset=utf-8').send('错误: 订阅链接格式已更新，请重新生成')
})

app.use('/api', (_req, res) => {
  res.status(404).json({ error: '接口不存在' })
})

// ---- 生产模式：托管构建产物 ----
const distDir = path.resolve(__dirname, '..', 'dist')
if (fs.existsSync(path.join(distDir, 'index.html'))) {
  app.use(express.static(distDir, { index: false }))
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    res.sendFile(path.join(distDir, 'index.html'))
  })
} else {
  app.get('/', (_req, res) => {
    res
      .type('html')
      .send(
        '<h1>前端尚未构建</h1><p>开发模式请运行 <code>npm run dev</code>（Vite 端口 5173）；生产模式请先 <code>npm run build</code>。</p>',
      )
  })
}

app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server]', error.message)
  res.status(500).json({ error: error.message || '服务器内部错误' })
})

app.listen(PORT, () => {
  console.log(`[server] API ready on http://127.0.0.1:${PORT}`)
  if (!process.env.ENCRYPTION_KEY) {
    console.warn('[server] ENCRYPTION_KEY 未设置，本次运行使用临时密钥')
  }
})
