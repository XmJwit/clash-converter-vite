/**
 * Clash 配置的生成与解析
 */
import { dump, load } from 'js-yaml'
import type { ProxyNode } from './types'

/** 完整 Clash 配置（单节点 + 全局规则） */
export function buildClashConfig(proxy: ProxyNode): Record<string, unknown> {
  return {
    port: 7890,
    'socks-port': 7891,
    'allow-lan': true,
    mode: 'rule',
    'log-level': 'warning',
    proxies: [proxy],
    'proxy-groups': [
      {
        name: 'Proxy',
        type: 'select',
        proxies: [proxy.name],
      },
    ],
    rules: ['MATCH,Proxy'],
  }
}

/**
 * 订阅配置：仅返回 proxies 列表，避免覆盖用户本地的 port / mode / rules
 */
export function buildSubscriptionConfig(proxy: ProxyNode): Record<string, unknown> {
  return { proxies: [proxy] }
}

/** 序列化为 YAML（不折行、保持键顺序、不转义中文） */
export function dumpYaml(data: unknown): string {
  return dump(data, {
    noRefs: true,
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  })
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 从 YAML 文本中取出 proxies 数组 */
export function parseProxiesFromYaml(text: string): ProxyNode[] {
  let data: unknown
  try {
    data = load(text)
  } catch (error) {
    throw new Error(`YAML 解析失败: ${(error as Error).message}`)
  }

  if (data === null || data === undefined || data === '') {
    throw new Error('YAML 内容为空')
  }

  let proxies: unknown
  if (Array.isArray(data)) {
    proxies = data
  } else if (isPlainObject(data)) {
    proxies = data.proxies ?? data.proxy ?? []
  } else {
    proxies = []
  }

  if (!Array.isArray(proxies) || proxies.length === 0) {
    throw new Error('未找到 proxies 配置')
  }

  return proxies.filter(isPlainObject).map((item) => {
    const proxy = item as unknown as ProxyNode
    return {
      ...proxy,
      name: proxy.name === undefined ? '' : String(proxy.name),
      type: proxy.type === undefined ? '' : String(proxy.type),
    }
  })
}
