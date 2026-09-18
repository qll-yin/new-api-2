import { useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

/**
 * Hero 背景：舞台光束 + 单色光晕 + Canvas 粒子连线 + 网格
 */
export default function AuroraBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    if (reduce) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const COUNT = window.innerWidth < 768 ? 26 : 60
    type P = { x: number; y: number; vx: number; vy: number; r: number }
    let particles: P[] = []

    const resize = () => {
      w = canvas.offsetWidth
      h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = Array.from({ length: COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: Math.random() * 1.6 + 0.6,
      }))
    }

    const LINK = 130
    const tick = () => {
      ctx.clearRect(0, 0, w, h)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.x < 0 || p.x > w) p.vx *= -1
        if (p.y < 0 || p.y > h) p.vy *= -1
      }
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i]
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const d = Math.hypot(dx, dy)
          if (d < LINK) {
            ctx.strokeStyle = `rgba(143, 148, 255, ${0.15 * (1 - d / LINK)})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
        }
        ctx.fillStyle = 'rgba(199, 201, 255, 0.55)'
        ctx.beginPath()
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2)
        ctx.fill()
      }
      raf = requestAnimationFrame(tick)
    }

    resize()
    tick()
    window.addEventListener('resize', resize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduce])

  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden'>
      {/* 网格 */}
      <div className='hp-bg-grid absolute inset-0' />
      {/* 舞台光束 */}
      <div
        className='hp-light-rays absolute -top-1/4 left-1/2 h-[130%] w-[150%] -translate-x-1/2'
        style={{ animation: 'hp-rays-sway 14s ease-in-out infinite' }}
      />
      {/* 单色光晕：宝蓝 / 冰靛 / 霜白，克制的靛蓝调 */}
      <div
        className='hp-aurora absolute -top-1/3 left-1/4 h-[42rem] w-[42rem] rounded-full blur-[110px]'
        style={{
          background: 'radial-gradient(circle, #3637f2 0%, transparent 65%)',
          animation: 'hp-aurora-drift 22s ease-in-out infinite',
        }}
      />
      <div
        className='hp-aurora absolute -top-1/4 right-[8%] h-[38rem] w-[38rem] rounded-full blur-[110px]'
        style={{
          background: 'radial-gradient(circle, #8f94ff 0%, transparent 65%)',
          animation: 'hp-aurora-drift 26s ease-in-out reverse infinite',
        }}
      />
      <div
        className='hp-aurora absolute top-1/3 left-[45%] h-[30rem] w-[30rem] rounded-full blur-[100px]'
        style={{
          background: 'radial-gradient(circle, #eef0fb 0%, transparent 65%)',
          animation: 'hp-aurora-drift 30s ease-in-out infinite',
        }}
      />
      {/* 粒子 */}
      <canvas ref={canvasRef} className='absolute inset-0 h-full w-full' />
      {/* 底部压暗，融入下一屏 */}
      <div className='absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[var(--hp-bottom-fade)]' />
    </div>
  )
}
