/**
 * 订阅链接 API —— 只有「生成订阅地址」需要服务端（Clash 必须通过 HTTP 拉取）
 * 转换本身在浏览器里完成，所以后端不可用时页面依然完全可用。
 */
const REQUEST_TIMEOUT_MS = 8000

interface SubTokenResponse {
  token: string
  sub_url: string
}

/** 请求加密后的订阅链接 */
export async function requestSubscriptionUrl(url: string): Promise<string> {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('/api/sub-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })

    const data = (await response.json().catch(() => null)) as (SubTokenResponse & { error?: string }) | null

    if (!response.ok) {
      throw new Error(data?.error || `服务返回 ${response.status}`)
    }
    if (!data?.sub_url) {
      throw new Error('服务返回的订阅链接为空')
    }
    return data.sub_url
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      throw new Error('请求超时')
    }
    if (error instanceof TypeError) {
      throw new Error('无法连接到订阅服务')
    }
    throw error
  } finally {
    window.clearTimeout(timer)
  }
}
