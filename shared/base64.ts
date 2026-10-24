/**
 * Base64 工具 —— 纯环境无关实现（浏览器 / Node 18+ 均可运行）
 * 对应原 Python 版的 base64 / urlsafe_b64encode / _b64_pad / _ssr_b64
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** UTF-8 字符串 → 标准 Base64（带 padding） */
export function encodeBase64(input: string): string {
  const bytes = encoder.encode(input)
  let binary = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}

/** 标准 Base64 → UTF-8 字符串 */
export function decodeBase64(input: string): string {
  const binary = atob(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return decoder.decode(bytes)
}

/** 补齐 Base64 的 '=' padding */
export function padBase64(input: string): string {
  const pad = (4 - (input.length % 4)) % 4
  return pad ? input + '='.repeat(pad) : input
}

/** Base64 → URL-safe Base64（去掉 padding） */
export function toBase64Url(input: string): string {
  return input.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** URL-safe Base64 → 标准 Base64（含 padding） */
export function fromBase64Url(input: string): string {
  return padBase64(input.replace(/-/g, '+').replace(/_/g, '/'))
}

/** UTF-8 字符串 → URL-safe Base64（无 padding），等价 Python urlsafe_b64encode().rstrip('=') */
export function encodeBase64Url(input: string): string {
  return toBase64Url(encodeBase64(input))
}

/** URL-safe Base64 → UTF-8 字符串，等价原版 _ssr_b64() */
export function decodeBase64Url(input: string): string {
  return decodeBase64(fromBase64Url(input))
}
