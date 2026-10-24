/**
 * 订阅链接加密：AES-256-GCM
 *
 * 与原 Python 版完全兼容的二进制布局：
 *   [12B nonce][16B GCM tag][ciphertext]  →  URL-safe Base64（无 padding）
 * 密钥 = SHA-256(ENCRYPTION_KEY)，因此两版服务生成的订阅链接可以互相解密。
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const NONCE_BYTES = 12
const TAG_BYTES = 16

let cachedKey: Buffer | null = null

function getKey(): Buffer {
  if (cachedKey) return cachedKey

  let raw = (process.env.ENCRYPTION_KEY ?? '').trim()
  if (!raw) {
    raw = randomBytes(32).toString('hex')
    console.warn('='.repeat(60))
    console.warn('WARNING: ENCRYPTION_KEY not set. Generated ephemeral key.')
    console.warn('Subscription links will be invalid after server restart!')
    console.warn('')
    console.warn('Set ENCRYPTION_KEY in environment to persist (any string).')
    console.warn('='.repeat(60))
  }

  cachedKey = createHash('sha256').update(raw, 'utf8').digest()
  return cachedKey
}

/** 加密代理链接，返回 URL-safe Base64 字符串 */
export function encryptUrl(url: string): string {
  const nonce = randomBytes(NONCE_BYTES)
  const cipher = createCipheriv('aes-256-gcm', getKey(), nonce)
  const ciphertext = Buffer.concat([cipher.update(url, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([nonce, tag, ciphertext]).toString('base64url')
}

/** 解密 encryptUrl() 生成的字符串 */
export function decryptUrl(token: string): string {
  const raw = Buffer.from(token, 'base64url')
  if (raw.length <= NONCE_BYTES + TAG_BYTES) {
    throw new Error('密文长度不合法')
  }
  const nonce = raw.subarray(0, NONCE_BYTES)
  const tag = raw.subarray(NONCE_BYTES, NONCE_BYTES + TAG_BYTES)
  const ciphertext = raw.subarray(NONCE_BYTES + TAG_BYTES)

  const decipher = createDecipheriv('aes-256-gcm', getKey(), nonce)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}
