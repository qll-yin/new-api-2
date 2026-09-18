import { useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Line = { id: number; text: string; kind: 'cmd' | 'out' | 'ok' }

/**
 * 终端演示脚本：第一行的 base_url 取自站点配置。
 * 文案走 homepage i18n（演示对话内容）。
 */
function buildTerminalScript(
  baseUrl: string,
  t: (key: string) => string
): Line[] {
  const script: Omit<Line, 'id'>[] = [
    { text: `$ curl ${baseUrl}/v1/chat/completions \\`, kind: 'cmd' },
    { text: '    -H "Authorization: Bearer sk-7code-****" \\', kind: 'cmd' },
    { text: '    -d \'{"model": "claude-sonnet-4-5",', kind: 'cmd' },
    {
      text: `           "messages": [{"role": "user", "content": "${t('Hello')}"}]}',`,
      kind: 'cmd',
    },
    { text: '', kind: 'out' },
    { text: '{', kind: 'out' },
    { text: '  "id": "chatcmpl-9f2x...",', kind: 'out' },
    { text: '  "model": "claude-sonnet-4-5",', kind: 'out' },
    {
      text: `  "choices": [{ "message": { "content": "${t('Hello, what can I help you with')}" }, "finish_reason": "stop" }],`,
      kind: 'ok',
    },
    { text: '  "usage": { "total_tokens": 38 }', kind: 'out' },
    { text: '}', kind: 'out' },
  ]
  return script.map((line, i) => ({ ...line, id: i }))
}

/**
 * 自动打字的终端窗口，播完停留后循环
 */
export default function Terminal({ baseUrl }: { baseUrl: string }) {
  const { t } = useTranslation('homepage')
  const [lines, setLines] = useState<Line[]>([])
  const [current, setCurrent] = useState('')
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reduce = useReducedMotion()
  const script = useMemo(() => buildTerminalScript(baseUrl, t), [baseUrl, t])

  useEffect(() => {
    if (reduce) {
      setLines(script)
      return
    }
    let li = 0
    let ci = 0
    let cancelled = false

    const step = () => {
      if (cancelled) return
      if (li >= script.length) {
        timer.current = setTimeout(() => {
          setLines([])
          li = 0
          ci = 0
          step()
        }, 6000)
        return
      }
      const line = script[li]
      if (line.text === '') {
        setLines((prev) => [...prev, line])
        li++
        ci = 0
        timer.current = setTimeout(step, 120)
        return
      }
      if (ci < line.text.length) {
        ci += line.kind === 'out' ? 3 : 1 // 输出快一些
        setCurrent(line.text.slice(0, ci))
        timer.current = setTimeout(step, line.kind === 'cmd' ? 34 : 10)
      } else {
        setLines((prev) => [...prev, line])
        setCurrent('')
        li++
        ci = 0
        timer.current = setTimeout(step, line.kind === 'cmd' ? 160 : 40)
      }
    }
    step()
    return () => {
      cancelled = true
      if (timer.current) clearTimeout(timer.current)
    }
  }, [reduce, script])

  const colorOf = (kind: Line['kind']) => {
    if (kind === 'cmd') return 'text-[var(--hp-frost)]'
    if (kind === 'ok') return 'text-emerald-300'
    return 'text-slate-400'
  }

  return (
    <div className='hp-glass hp-glow-border overflow-hidden rounded-2xl shadow-2xl shadow-black/50'>
      <div className='flex items-center gap-2 border-b border-white/5 px-4 py-3'>
        <span className='h-3 w-3 rounded-full bg-red-400/80' />
        <span className='h-3 w-3 rounded-full bg-amber-300/80' />
        <span className='h-3 w-3 rounded-full bg-emerald-400/80' />
        <span className='ml-3 font-mono text-xs text-slate-400'>terminal</span>
      </div>
      <div className='h-[19rem] space-y-1.5 overflow-hidden p-5 font-mono text-[13px] leading-relaxed'>
        {lines.map((l) => (
          <div key={l.id} className={colorOf(l.kind)}>
            {l.text || '\u00A0'}
          </div>
        ))}
        {current && (
          <div className={colorOf('cmd')}>
            {current}
            <span
              className='caret'
              style={{ animation: 'hp-caret-blink 1s step-end infinite' }}
            >
              ▍
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
