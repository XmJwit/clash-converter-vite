/**
 * Clash 节点对象 → 代理链接
 * 逐条移植自原 Flask 版 app.py 中的 proxy_to_* 函数
 */
import { encodeBase64, encodeBase64Url } from './base64'
import type { ProxyNode, ProxyProtocol } from './types'
import { buildQuery, quote } from './url'

function str(proxy: ProxyNode, key: string, fallback = ''): string {
  const value = proxy[key]
  if (value === undefined || value === null) return fallback
  return String(value)
}

function requireStr(proxy: ProxyNode, key: string): string {
  const value = str(proxy, key)
  if (!value) throw new Error(`节点缺少必要字段: ${key}`)
  return value
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return undefined
}

function readStr(obj: Record<string, unknown>, key: string): string {
  const value = obj[key]
  if (value === undefined || value === null) return ''
  return String(value)
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item))
  if (typeof value === 'string' && value) return value.split(',').map((item) => item.trim())
  return []
}

export function proxyToVless(proxy: ProxyNode): string {
  const uid = requireStr(proxy, 'uuid')
  const server = requireStr(proxy, 'server')
  const port = proxy.port
  const name = str(proxy, 'name')
  const network = str(proxy, 'network', 'tcp')
  const tls = Boolean(proxy.tls)
  const reality = asRecord(proxy['reality-opts'])

  const params: Record<string, string> = { type: network }
  if (tls) params.security = reality ? 'reality' : 'tls'
  if (str(proxy, 'flow')) params.flow = str(proxy, 'flow')
  if (str(proxy, 'servername')) params.sni = str(proxy, 'servername')
  if (str(proxy, 'client-fingerprint')) params.fp = str(proxy, 'client-fingerprint')

  if (reality) {
    const publicKey = readStr(reality, 'public-key')
    const shortId = readStr(reality, 'short-id')
    const spiderX = readStr(reality, 'spider-x')
    if (publicKey) params.pbk = publicKey
    if (shortId) params.sid = shortId
    if (spiderX) params.spx = spiderX
  }

  if (network === 'ws') {
    const ws = asRecord(proxy['ws-opts'])
    if (ws) {
      const path = readStr(ws, 'path')
      const headers = asRecord(ws.headers)
      if (path) params.path = path
      if (headers && readStr(headers, 'Host')) params.host = readStr(headers, 'Host')
    }
  }

  if (network === 'grpc') {
    const grpc = asRecord(proxy['grpc-opts'])
    const service = grpc ? readStr(grpc, 'grpc-service-name') : ''
    if (service) params.serviceName = service
  }

  if (network === 'h2') {
    const h2 = asRecord(proxy['h2-opts'])
    const path = h2 ? readStr(h2, 'path') : ''
    if (path) params.path = path
  }

  let url = `vless://${uid}@${server}:${port}?${buildQuery(params)}`
  if (name) url += `#${quote(name)}`
  return url
}

export function proxyToVmess(proxy: ProxyNode): string {
  const name = str(proxy, 'name')
  const server = requireStr(proxy, 'server')
  const port = proxy.port
  const uuid = requireStr(proxy, 'uuid')
  const alterId = Number(proxy.alterId ?? 0) || 0
  const network = str(proxy, 'network', 'tcp')
  const isTls = Boolean(proxy.tls)
  const sni = str(proxy, 'servername')
  const alpn = asStringArray(proxy.alpn)

  const data: Record<string, unknown> = {
    v: '2',
    ps: name,
    add: server,
    port,
    id: uuid,
    aid: alterId,
    net: network,
    type: 'none',
    tls: isTls ? 'tls' : 'none',
  }

  let host = ''
  let path = ''

  if (network === 'ws') {
    const ws = asRecord(proxy['ws-opts'])
    if (ws) {
      if (ws.path) path = String(ws.path)
      const headers = asRecord(ws.headers)
      if (headers?.Host) host = String(headers.Host)
    }
  }

  if (network === 'grpc') {
    const grpc = asRecord(proxy['grpc-opts'])
    if (grpc?.['grpc-service-name']) {
      data.serviceName = String(grpc['grpc-service-name'])
    }
  }

  if (network === 'h2') {
    const h2 = asRecord(proxy['h2-opts'])
    if (h2?.path) path = String(h2.path)
  }

  data.host = host
  data.path = path
  if (sni) data.sni = sni
  if (alpn.length > 0) data.alpn = alpn.join(',')

  return `vmess://${encodeBase64(JSON.stringify(data))}`
}

export function proxyToSs(proxy: ProxyNode): string {
  const method = requireStr(proxy, 'cipher')
  const password = requireStr(proxy, 'password')
  const server = requireStr(proxy, 'server')
  const port = proxy.port
  const name = str(proxy, 'name')

  const encoded = encodeBase64(`${method}:${password}`).replace(/=+$/, '')

  let url = `ss://${encoded}@${server}:${port}`
  const plugin = str(proxy, 'plugin')
  if (plugin) url += `?plugin=${encodeURIComponent(plugin)}`
  if (name) url += `#${quote(name)}`
  return url
}

export function proxyToSsr(proxy: ProxyNode): string {
  const server = requireStr(proxy, 'server')
  const port = proxy.port
  const protocol = requireStr(proxy, 'protocol')
  const cipher = requireStr(proxy, 'cipher')
  const obfs = requireStr(proxy, 'obfs')
  const password = requireStr(proxy, 'password')
  const name = str(proxy, 'name')

  const encodedPassword = encodeBase64Url(password)
  const raw = `${server}:${port}:${protocol}:${cipher}:${obfs}:${encodedPassword}`
  const encoded = encodeBase64Url(raw)

  const params: Record<string, string> = {}
  if (name) params.remarks = encodeBase64Url(name)
  if (str(proxy, 'protocol-param')) params.protoparam = encodeBase64Url(str(proxy, 'protocol-param'))
  if (str(proxy, 'obfs-param')) params.obfsparam = encodeBase64Url(str(proxy, 'obfs-param'))

  let url = `ssr://${encoded}`
  const qs = buildQuery(params)
  if (qs) url += `?${qs}`
  return url
}

export function proxyToTrojan(proxy: ProxyNode): string {
  const password = requireStr(proxy, 'password')
  const server = requireStr(proxy, 'server')
  const port = proxy.port
  const name = str(proxy, 'name')

  const params: Record<string, string> = {}
  if (str(proxy, 'sni')) {
    params.sni = str(proxy, 'sni')
  } else if (server) {
    params.sni = server
  }
  if (proxy['skip-cert-verify']) params.allowInsecure = '1'
  const alpn = asStringArray(proxy.alpn)
  if (alpn.length > 0) params.alpn = alpn.join(',')
  if (str(proxy, 'flow')) params.flow = str(proxy, 'flow')

  let url = `trojan://${password}@${server}:${port}`
  const qs = buildQuery(params)
  if (qs) url += `?${qs}`
  if (name) url += `#${quote(name)}`
  return url
}

export const URL_BUILDERS: Record<ProxyProtocol, (proxy: ProxyNode) => string> = {
  vless: proxyToVless,
  vmess: proxyToVmess,
  ss: proxyToSs,
  ssr: proxyToSsr,
  trojan: proxyToTrojan,
}
