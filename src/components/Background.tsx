/** 背景装饰：三个漂浮的模糊光斑（跟随主题变色） */
export function Background() {
  return (
    <div className="bg-deco" aria-hidden="true">
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />
    </div>
  )
}
