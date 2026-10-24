/**
 * 转换门面 —— 前后端共用的唯一入口
 *
 * 所有转换都在本地完成（浏览器端零请求、服务端仅用于订阅链接），
 * 因此同一份逻辑既能在 React 组件里跑，也能在 Node 服务里跑。
 */
import { URL_BUILDERS } from './builders'
import { buildClashConfig, buildSubscriptionConfig, dumpYaml, parseProxiesFromYaml } from './clash'
import { PARSERS } from './parsers'
import type { ClashConversion, ProxyNode, ProxyProtocol, ProxyUrlResult } from './types'

export const PROTOCOL_PREFIXES: Record<ProxyProtocol, string> = {
  vless: 'vless://',
  vmess: 'vmess://',
  ss: 'ss://',
  ssr: 'ssr://',
  trojan: 'trojan://',
}

const PREFIX_TO_PROTOCOL: Array<[string, ProxyProtocol]> = [
  ['vless://', 'vless'],
  ['vmess://', 'vmess'],
  ['ss://', 'ss'],
  ['ssr://', 'ssr'],
  ['trojan://', 'trojan'],
]

/** 根据链接前缀识别协议 */
export function detectProtocol(url: string): ProxyProtocol | null {
  const matched = PREFIX_TO_PROTOCOL.find(([prefix]) => url.startsWith(prefix))
  return matched ? matched[1] : null
}

function parseProxyUrl(url: string): { protocol: ProxyProtocol; proxy: ProxyNode } {
  const protocol = detectProtocol(url)
  if (!protocol) throw new Error('不支持的协议类型')
  return { protocol, proxy: PARSERS[protocol](url) }
}

/** 文件名安全化：去掉路径分隔符等非法字符 */
function safeFilename(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\r\n]+/g, '_').trim()
  return cleaned || 'config'
}

/** 代理链接 → 完整 Clash 配置 */
export function convertUrlToClash(url: string): ClashConversion {
  const { protocol, proxy } = parseProxyUrl(url)
  const yaml = dumpYaml(buildClashConfig(proxy))
  return {
    protocol,
    proxy,
    yaml,
    filename: `clash_${safeFilename(proxy.name)}.yaml`,
  }
}

/** 代理链接 → 订阅用 YAML（仅 proxies） */
export function convertUrlToSubscription(url: string): string {
  const { proxy } = parseProxyUrl(url)
  return dumpYaml(buildSubscriptionConfig(proxy))
}

/** Clash YAML → 代理链接列表 */
export function convertYamlToProxyUrls(text: string): ProxyUrlResult[] {
  const proxies = parseProxiesFromYaml(text)
  const results: ProxyUrlResult[] = []

  for (const proxy of proxies) {
    const type = proxy.type
    const builder = URL_BUILDERS[type as ProxyProtocol]
    if (!builder) {
      results.push({
        name: proxy.name,
        type,
        url: null,
        error: `不支持的协议: ${type}`,
      })
      continue
    }
    try {
      results.push({ name: proxy.name, type, url: builder(proxy) })
    } catch (error) {
      results.push({
        name: proxy.name,
        type,
        url: null,
        error: (error as Error).message,
      })
    }
  }

  return results
}

export * from './types'
