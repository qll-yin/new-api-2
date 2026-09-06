/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef } from 'react'

interface ConfettiPiece {
  x: number
  y: number
  vx: number
  vy: number
  width: number
  height: number
  rotation: number
  rotationSpeed: number
  color: string
  opacity: number
}

const CONFETTI_COLORS = [
  '#f43f5e',
  '#f97316',
  '#facc15',
  '#4ade80',
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
]

interface FireOptions {
  originX?: number // 0-1 视口横向比例
  originY?: number // 0-1 视口纵向比例
  angle?: number // 弧度，纸片初速方向
  spread?: number // 弧度，随机散射范围
  count?: number
  power?: number // 初速(px/frame)
}

/**
 * 轻量彩纸礼炮：自绘 canvas 粒子，不引入第三方依赖。
 * 通过 ref 向外部暴露 fire()，可在任意时机(入场/复制成功等)触发。
 */
export interface ConfettiCannonsHandle {
  fire: (options?: FireOptions) => void
}

interface ConfettiCannonsProps {
  /** 挂载后自动从屏幕两侧开炮 */
  autoFireOnMount?: boolean
  /** 自动开炮延迟(ms)，等页面动画先落定 */
  autoFireDelay?: number
  handleRef?: React.MutableRefObject<ConfettiCannonsHandle | null>
}

export function ConfettiCannons({
  autoFireOnMount = false,
  autoFireDelay = 300,
  handleRef,
}: ConfettiCannonsProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const piecesRef = useRef<ConfettiPiece[]>([])
  const rafRef = useRef<number>(0)
  const runningRef = useRef(false)

  useEffect(() => {
    if (handleRef) {
      handleRef.current = {
        fire: (options?: FireOptions) => fire(options),
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spawn = (options: FireOptions) => {
    const {
      originX = 0,
      originY = 0.7,
      angle = -Math.PI / 3.4,
      spread = Math.PI / 5,
      count = 70,
      power = 17,
    } = options
    const next: ConfettiPiece[] = []
    for (let i = 0; i < count; i++) {
      const a = angle + (Math.random() - 0.5) * spread
      const speed = power * (0.55 + Math.random() * 0.75)
      next.push({
        x: window.innerWidth * originX,
        y: window.innerHeight * originY,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        width: 6 + Math.random() * 6,
        height: 8 + Math.random() * 8,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.32,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        opacity: 1,
      })
    }
    piecesRef.current = piecesRef.current.concat(next)
    if (!runningRef.current) {
      runningRef.current = true
      rafRef.current = requestAnimationFrame(step)
    }
  }

  const fire = (options?: FireOptions) => {
    if (typeof window === 'undefined') return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (options) {
      spawn(options)
      return
    }
    // 默认：左右两侧对射
    spawn({
      originX: 0,
      angle: -Math.PI / 3.4,
      count: 80,
    })
    spawn({
      originX: 1,
      angle: -Math.PI + Math.PI / 3.4,
      count: 80,
    })
  }

  const step = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) {
      runningRef.current = false
      return
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (
      canvas.width !== window.innerWidth * dpr ||
      canvas.height !== window.innerHeight * dpr
    ) {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)

    const alive: ConfettiPiece[] = []
    for (const p of piecesRef.current) {
      p.vy += 0.34 // 重力
      p.vx *= 0.985 // 空气阻力
      p.vy *= 0.985
      p.x += p.vx
      p.y += p.vy
      p.rotation += p.rotationSpeed
      // 出屏或落地后淡出
      if (p.y > window.innerHeight + 40) p.opacity -= 0.08
      if (p.opacity <= 0) continue
      alive.push(p)

      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      // 模拟纸片翻面的透视缩放
      const flip = Math.sin(p.rotation * 1.7)
      ctx.globalAlpha = Math.max(p.opacity, 0)
      ctx.fillStyle = p.color
      ctx.fillRect(
        -p.width / 2,
        (-p.height / 2) * (0.35 + 0.65 * Math.abs(flip)),
        p.width,
        p.height * (0.35 + 0.65 * Math.abs(flip))
      )
      ctx.restore()
    }
    piecesRef.current = alive

    if (piecesRef.current.length > 0) {
      rafRef.current = requestAnimationFrame(step)
    } else {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      runningRef.current = false
    }
  }

  useEffect(() => {
    if (!autoFireOnMount) return
    const timer = window.setTimeout(() => fire(), autoFireDelay)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFireOnMount, autoFireDelay])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      runningRef.current = false
      piecesRef.current = []
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden='true'
      className='pointer-events-none fixed inset-0 z-[60]'
    />
  )
}
