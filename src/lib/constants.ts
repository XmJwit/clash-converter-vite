import type { ProxyProtocol } from '../../shared/types'

export const PROTOCOL_OPTIONS: Array<{ value: ProxyProtocol; label: string }> = [
  { value: 'vless', label: 'VLESS' },
  { value: 'vmess', label: 'VMess' },
  { value: 'ss', label: 'Shadowsocks' },
  { value: 'ssr', label: 'SSR' },
  { value: 'trojan', label: 'Trojan' },
]

export const PLACEHOLDERS: Record<ProxyProtocol, string> = {
  vless: 'vless://uuid@host:port?type=tcp&security=none#示例',
  vmess: 'vmess://eyJ2IjoiMiIsInBzIjoi...',
  ss: 'ss://YWVzLTI1Ni1nY206cGFzcw@host:8443#示例',
  ssr: 'ssr://MTI3LjAuMC4xOjEyMzQ6...',
  trojan: 'trojan://password@host:port?sni=example.com#示例',
}

export const TYPE_LABELS: Record<string, string> = {
  vless: 'VLESS',
  vmess: 'VMess',
  ss: 'SS',
  ssr: 'SSR',
  trojan: 'Trojan',
}

export const YAML_PLACEHOLDER = `粘贴 Clash 配置 YAML 内容

示例:
proxies:
  - name: 示例节点
    type: vless
    server: example.com
    port: 443
    uuid: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    network: ws
    tls: true`
