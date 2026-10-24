/** 轻量 YAML 结构校验（只做结构提示，真正的解析交给 js-yaml） */
export interface YamlValidation {
  valid: boolean
  error?: string
  proxyCount?: number
}

export function validateYamlBasic(text: string): YamlValidation {
  const trimmed = text.trim()

  if (!trimmed.includes(':')) {
    return { valid: false, error: '不是有效的 YAML（缺少冒号）' }
  }

  const matches = trimmed.match(/^\s+-\s+name:/gm)
  const count = matches ? matches.length : 0

  if (count === 0) {
    if (!trimmed.includes('proxies')) {
      return { valid: false, error: '未找到 proxies 配置项' }
    }
    if (!/name:\s*.+/.test(trimmed)) {
      return { valid: false, error: 'proxies 列表为空，请检查格式' }
    }
  }

  return { valid: true, proxyCount: Math.max(count, 1) }
}
