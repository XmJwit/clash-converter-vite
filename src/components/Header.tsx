import { LogoIcon } from './icons'

export function Header() {
  return (
    <header className="header">
      <div className="icon">
        <LogoIcon size={28} />
      </div>
      <h1>Proxy ↔ Clash 双向转换</h1>
      <p>代理链接与 Clash 配置互转，浏览器端实时转换，无需服务端存储</p>
    </header>
  )
}
