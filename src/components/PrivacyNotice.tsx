import { ShieldIcon } from './icons'

export function PrivacyNotice() {
  return (
    <div className="privacy-notice">
      <ShieldIcon size={16} strokeWidth={1.8} />
      <span>
        本工具采用<strong>纯前端转换</strong>架构，代理链接与 YAML 全部在浏览器内完成解析，
        <strong>不会上传到服务器</strong>。仅订阅链接需要服务端签发，其中携带的代理信息经
        <strong> AES-256-GCM 加密</strong>，不落盘、不留痕。
      </span>
    </div>
  )
}
