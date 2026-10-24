/**
 * 代理链接 → Clash 节点对象
 * 逐条移植自原 Flask 版 app.py 中的 parse_* 函数
 */
import { decodeBase64, decodeBase64Url, padBase64 } from './base64'
import type { ProxyNode, ProxyProtocol } from './types'
import { splitFragment, splitHostPort, splitQuery, unquote } from './url'

const HOST_RE = /^([^@]+)@([^:]+):(\d+)/

/** 安全取值：undefined / null → 默认值 */
function pick(value: unknown, fallback = ''): string {
  if (value === undefined || value === null) return fallback
  return String(value)
}

function has(obj: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key)
}

export function parseVless(url: string): ProxyNode {
  const { rest, remark } = splitFragment(url.slice('vless://'.length))
  const { main, query: params } = splitQuery(rest)

  const matched = HOST_RE.exec(main)
  if (!matched) throw new Error('无法解析 VLESS 链接的主机信息')

  const [, uid, host, portText] = matched
  const port = Number.parseInt(portText, 10)

  const network = params.type ?? 'tcp'
  const security = params.security ?? 'none'
  const flow = params.flow ?? ''
  const sni = params.sni ?? ''
  const fp = params.fp ?? ''
  const pbk = params.pbk ?? ''
  const sid = params.sid ?? ''
  const spx = params.spx ?? ''
  const pathValue = params.path ?? ''
  const hostValue = params.host ?? ''
  const serviceName = params.serviceName ?? ''

  const isTls = security === 'tls' || security === 'reality'
  const isReality = security === 'reality'

  const proxy: ProxyNode = {
    name: remark || `VLESS-${uid.slice(0, 8)}`,
    type: 'vless',
    server: host,
    port,
    uuid: uid,
    network,
    tls: isTls,
    udp: true,
  }

  if (flow) proxy.flow = flow
  if (sni) {
    proxy.servername = sni
  } else if (hostValue && isTls) {
    proxy.servername = hostValue
  }
  if (fp) proxy['client-fingerprint'] = fp

  if (isReality) {
    const reality: Record<string, string> = {}
    if (pbk) reality['public-key'] = pbk
    if (sid) reality['short-id'] = sid
    if (spx) reality['spider-x'] = spx
    if (Object.keys(reality).length > 0) proxy['reality-opts'] = reality
  }

  if (network === 'ws') {
    const ws: Record<string, unknown> = {}
    if (pathValue) ws.path = pathValue
    if (hostValue) ws.headers = { Host: hostValue }
    if (Object.keys(ws).length > 0) proxy['ws-opts'] = ws
  }

  if (network === 'grpc' && serviceName) {
    proxy['grpc-opts'] = { 'grpc-service-name': serviceName }
  }

  if (network === 'h2' && pathValue) {
    proxy['h2-opts'] = { path: pathValue }
  }

  return proxy
}

/** vmess://uuid@host:port?... 这种「类 VLESS」写法 */
function parseVmessLikeVless(raw: string): ProxyNode {
  const { rest, remark } = splitFragment(raw)
  const { main, query: params } = splitQuery(rest)

  const matched = HOST_RE.exec(main)
  if (!matched) throw new Error('无法解析 VMess 链接的主机信息')

  const [, uid, host, portText] = matched
  const port = Number.parseInt(portText, 10)

  const network = params.type ?? 'tcp'
  const isTls = (params.security ?? 'none') === 'tls'
  const pathValue = params.path ?? ''
  const hostValue = params.host ?? ''
  const sni = params.sni ?? ''

  const proxy: ProxyNode = {
    name: remark || `VMess-${uid.slice(0, 8)}`,
    type: 'vmess',
    server: host,
    port,
    uuid: uid,
    alterId: Number.parseInt(params.aid ?? '0', 10) || 0,
    cipher: 'auto',
    network,
    tls: isTls,
    udp: true,
  }
  if (sni) proxy.servername = sni

  if (network === 'ws') {
    const ws: Record<string, unknown> = {}
    if (pathValue) ws.path = pathValue
    if (hostValue) ws.headers = { Host: hostValue }
    if (Object.keys(ws).length > 0) proxy['ws-opts'] = ws
  }
  if (network === 'grpc' && params.serviceName) {
    proxy['grpc-opts'] = { 'grpc-service-name': params.serviceName }
  }
  if (network === 'h2' && pathValue) {
    proxy['h2-opts'] = { path: pathValue }
  }

  return proxy
}

export function parseVmess(url: string): ProxyNode {
  const raw = url.slice('vmess://'.length)
  if (raw.includes('@')) return parseVmessLikeVless(raw)

  let decoded: string
  try {
    decoded = decodeBase64(padBase64(raw))
  } catch (error) {
    throw new Error(`VMess Base64 解码失败: ${(error as Error).message}`)
  }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(decoded) as Record<string, unknown>
  } catch (error) {
    throw new Error(`VMess JSON 解析失败: ${(error as Error).message}`)
  }

  const server = pick(data.add) || pick(data.address)
  const port = Number.parseInt(pick(data.port, '0'), 10) || 0
  const uuidValue = pick(data.id)
  const alterId = Number.parseInt(pick(data.aid) || pick(data.alterId, '0'), 10) || 0
  const rawRemark = pick(data.ps) || pick(data.remarks) || `VMess-${server}`
  const network = pick(data.net) || pick(data.network, 'tcp')
  const isTls = pick(data.tls, 'none') === 'tls'
  const hostValue = pick(data.host)
  const pathValue = pick(data.path)
  const sni = has(data, 'sni') ? pick(data.sni) : hostValue
  const alpnRaw = pick(data.alpn)

  const proxy: ProxyNode = {
    name: rawRemark.includes('%') ? unquote(rawRemark) : rawRemark,
    type: 'vmess',
    server,
    port,
    uuid: uuidValue,
    alterId,
    cipher: 'auto',
    network,
    tls: isTls,
    udp: true,
  }

  if (sni && isTls) proxy.servername = sni
  if (alpnRaw) {
    proxy.alpn = alpnRaw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }

  if (network === 'ws') {
    const ws: Record<string, unknown> = {}
    if (pathValue) ws.path = pathValue
    if (hostValue && hostValue !== sni) ws.headers = { Host: hostValue }
    if (Object.keys(ws).length > 0) proxy['ws-opts'] = ws
  }

  if (network === 'grpc' && pick(data.serviceName)) {
    proxy['grpc-opts'] = { 'grpc-service-name': pick(data.serviceName) }
  }

  if (network === 'h2' && pathValue) {
    proxy['h2-opts'] = { path: pathValue }
  }

  return proxy
}

export function parseSs(url: string): ProxyNode {
  const { rest, remark } = splitFragment(url.slice('ss://'.length))
  const { main, query } = splitQuery(rest)
  const plugin = query.plugin ?? ''

  let method: string
  let password: string
  let host: string
  let port: number

  const atIndex = main.indexOf('@')
  if (atIndex !== -1) {
    // SIP002: ss://base64(method:password)@host:port
    const b64Part = main.slice(0, atIndex)
    const serverPart = main.slice(atIndex + 1)
    let decoded: string
    try {
      decoded = decodeBase64(padBase64(b64Part))
    } catch (error) {
      throw new Error(`SS Base64 解码失败: ${(error as Error).message}`)
    }
    const sep = decoded.indexOf(':')
    if (sep === -1) throw new Error('SS 链接缺少密码字段')
    method = decoded.slice(0, sep)
    password = decoded.slice(sep + 1)
    const parsed = splitHostPort(serverPart, 'SS')
    host = parsed.host
    port = parsed.port
  } else {
    // 传统格式: ss://base64(method:password@host:port)
    let decoded: string
    try {
      decoded = decodeBase64(padBase64(main))
    } catch (error) {
      throw new Error(`SS Base64 解码失败: ${(error as Error).message}`)
    }
    const at = decoded.lastIndexOf('@')
    if (at === -1) throw new Error('SS 链接格式不完整')
    const methodPass = decoded.slice(0, at)
    const serverPort = decoded.slice(at + 1)
    const sep = methodPass.indexOf(':')
    if (sep === -1) throw new Error('SS 链接缺少密码字段')
    method = methodPass.slice(0, sep)
    password = methodPass.slice(sep + 1)
    const parsed = splitHostPort(serverPort, 'SS')
    host = parsed.host
    port = parsed.port
  }

  const proxy: ProxyNode = {
    name: remark || `SS-${host}`,
    type: 'ss',
    server: host,
    port,
    cipher: method,
    password,
  }
  if (plugin) proxy.plugin = plugin

  return proxy
}

export function parseSsr(url: string): ProxyNode {
  let decoded: string
  try {
    decoded = decodeBase64Url(url.slice('ssr://'.length))
  } catch (error) {
    throw new Error(`SSR Base64 解码失败: ${(error as Error).message}`)
  }

  const params: Record<string, string> = {}
  const queryIndex = decoded.indexOf('?')
  if (queryIndex !== -1) {
    const qs = decoded.slice(queryIndex + 1)
    decoded = decoded.slice(0, queryIndex)
    for (const [key, value] of new URLSearchParams(qs)) {
      try {
        params[key] = decodeBase64Url(value)
      } catch {
        params[key] = value
      }
    }
  }

  const parts = decoded.split(':')
  if (parts.length < 6) throw new Error('SSR 链接格式不完整')

  const host = parts[0]
  const port = Number.parseInt(parts[1], 10)
  if (!host || !Number.isFinite(port)) throw new Error('SSR 链接格式不完整')

  const protocol = parts[2]
  const cipher = parts[3]
  const obfs = parts[4]

  let password: string
  try {
    password = decodeBase64Url(parts[5])
  } catch {
    password = parts[5]
  }

  return {
    name: params.remarks || `SSR-${host}`,
    type: 'ssr',
    server: host,
    port,
    cipher,
    password,
    protocol,
    'protocol-param': params.protoparam ?? '',
    obfs,
    'obfs-param': params.obfsparam ?? '',
    udp: true,
  }
}

export function parseTrojan(url: string): ProxyNode {
  const { rest, remark } = splitFragment(url.slice('trojan://'.length))
  const { main, query: params } = splitQuery(rest)

  const matched = HOST_RE.exec(main)
  if (!matched) throw new Error('无法解析 Trojan 链接的主机信息')

  const [, password, host, portText] = matched
  const port = Number.parseInt(portText, 10)

  const sni = params.sni ?? ''
  const allowInsecure = params.allowInsecure ?? '0'
  const alpnRaw = params.alpn ?? ''
  const flow = params.flow ?? ''

  const proxy: ProxyNode = {
    name: remark || `Trojan-${host}`,
    type: 'trojan',
    server: host,
    port,
    password,
    udp: true,
  }
  if (sni) {
    proxy.sni = sni
  } else if (host) {
    proxy.sni = host
  }
  if (allowInsecure === '1' || allowInsecure === 'true') proxy['skip-cert-verify'] = true
  if (alpnRaw) {
    proxy.alpn = alpnRaw
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
  if (flow) proxy.flow = flow

  return proxy
}

export const PARSERS: Record<ProxyProtocol, (url: string) => ProxyNode> = {
  vless: parseVless,
  vmess: parseVmess,
  ss: parseSs,
  ssr: parseSsr,
  trojan: parseTrojan,
}
