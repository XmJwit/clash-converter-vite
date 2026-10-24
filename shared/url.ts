/**
 * URL 解析小工具 —— 对应 Python urllib.parse 的常用行为
 */

/** 等价 urllib.parse.unquote（解码失败时原样返回） */
export function unquote(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/** 等价 urllib.parse.quote(value, safe='') */
export function quote(value: string): string {
  return encodeURIComponent(value)
}

/**
 * 等价 urllib.parse.parse_qsl(qs) → dict ：
 * 空值会被丢弃（keep_blank_values=False 的默认行为）
 */
export function parseQuery(qs: string): Record<string, string> {
  const out: Record<string, string> = {}
  if (!qs) return out
  for (const [key, value] of new URLSearchParams(qs)) {
    if (value !== '') out[key] = value
  }
  return out
}

/** 等价 urllib.parse.urlencode(params)，保持插入顺序 */
export function buildQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    search.append(key, String(value))
  }
  return search.toString()
}

/** 拆出 #fragment 备注 */
export function splitFragment(raw: string): { rest: string; remark: string } {
  const index = raw.indexOf('#')
  if (index === -1) return { rest: raw, remark: '' }
  return { rest: raw.slice(0, index), remark: unquote(raw.slice(index + 1)) }
}

/** 拆出 ?query */
export function splitQuery(raw: string): { main: string; query: Record<string, string> } {
  const index = raw.indexOf('?')
  if (index === -1) return { main: raw, query: {} }
  return { main: raw.slice(0, index), query: parseQuery(raw.slice(index + 1)) }
}

/** 解析 host:port 部分，等价 server.rsplit(':', 1) */
export function splitHostPort(value: string, label: string): { host: string; port: number } {
  const index = value.lastIndexOf(':')
  if (index === -1) throw new Error(`无法解析 ${label} 的端口`)
  const host = value.slice(0, index)
  const port = Number.parseInt(value.slice(index + 1), 10)
  if (!host) throw new Error(`无法解析 ${label} 的主机信息`)
  if (!Number.isFinite(port)) throw new Error(`无法解析 ${label} 的端口`)
  return { host, port }
}
