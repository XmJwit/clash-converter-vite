/**
 * 共享类型定义 —— 前后端共用
 */

export type ProxyProtocol = 'vless' | 'vmess' | 'ss' | 'ssr' | 'trojan'

/** Clash 配置中的单个代理节点（字段随协议不同而不同，保持宽松类型） */
export interface ProxyNode {
  name: string
  type: string
  server: string
  port: number
  [key: string]: unknown
}

/** 代理链接 → Clash 的转换结果 */
export interface ClashConversion {
  protocol: ProxyProtocol
  proxy: ProxyNode
  /** 完整 Clash 配置（含 port / proxy-groups / rules） */
  yaml: string
  /** 建议的文件名 */
  filename: string
}

/** Clash → 代理链接的单项结果 */
export interface ProxyUrlResult {
  name: string
  type: string
  url: string | null
  error?: string
}
