/** 触发浏览器下载一段文本内容 */
export function downloadText(filename: string, text: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  // 让浏览器有机会开始下载再释放
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
