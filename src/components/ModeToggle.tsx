import { SwapLeftIcon, SwapRightIcon } from './icons'

export type Mode = 'to-clash' | 'to-proxy'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

const OPTIONS: Array<{ value: Mode; label: string; icon: typeof SwapRightIcon }> = [
  { value: 'to-clash', label: '代理 → Clash', icon: SwapRightIcon },
  { value: 'to-proxy', label: 'Clash → 代理', icon: SwapLeftIcon },
]

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle" role="tablist" aria-label="切换转换方向">
      <div className={`mode-slider ${mode === 'to-clash' ? 'left' : 'right'}`} aria-hidden="true" />
      {OPTIONS.map((option) => {
        const Icon = option.icon
        const active = mode === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={`mode-btn${active ? ' active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            <Icon size={16} strokeWidth={2.2} />
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
