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
import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'

interface FloatingMascotProps {
  className?: string
  /** 动画相位偏移，多个吉祥物同时出现时错开节奏 */
  delay?: number
}

/**
 * 圆脸卡通吉祥物：SVG 手绘(渐变脸蛋+眨眼+吹泡泡表情)，
 * motion 做上下漂浮 + 轻微摇摆，尊重系统"减弱动态效果"设置。
 */
export function FloatingMascot({ className, delay = 0 }: FloatingMascotProps) {
  const reduceMotion = useReducedMotion()
  const gradientId = useId()

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { opacity: 0, scale: 0.6 }}
      animate={
        reduceMotion
          ? undefined
          : {
              opacity: 1,
              scale: 1,
              y: [0, -12, 0],
              rotate: [0, 3, -3, 0],
            }
      }
      transition={{
        opacity: { duration: 0.5, delay },
        scale: { duration: 0.5, delay },
        y: {
          duration: 3.6,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        },
        rotate: {
          duration: 5.2,
          repeat: Infinity,
          ease: 'easeInOut',
          delay,
        },
      }}
    >
      <svg
        viewBox='0 0 96 96'
        fill='none'
        role='img'
        aria-hidden='true'
        className='h-full w-full drop-shadow-lg'
      >
        <defs>
          <linearGradient id={gradientId} x1='48' y1='10' x2='48' y2='88'>
            <stop stopColor='#fbbf24' />
            <stop offset='1' stopColor='#fb923c' />
          </linearGradient>
        </defs>
        {/* 脸 */}
        <circle cx='48' cy='48' r='38' fill={`url(#${gradientId})`} />
        {/* 高光 */}
        <ellipse
          cx='33'
          cy='28'
          rx='12'
          ry='7'
          fill='#ffffff'
          opacity='0.35'
          transform='rotate(-24 33 28)'
        />
        {/* 眼睛(animate 眨眼) */}
        <g fill='#3b2a1a'>
          <ellipse cx='35' cy='42' rx='4' ry='5.5'>
            <animate
              attributeName='ry'
              values='5.5;5.5;0.6;5.5;5.5'
              keyTimes='0;0.42;0.46;0.5;1'
              dur='4s'
              repeatCount='indefinite'
            />
          </ellipse>
          <ellipse cx='61' cy='42' rx='4' ry='5.5'>
            <animate
              attributeName='ry'
              values='5.5;5.5;0.6;5.5;5.5'
              keyTimes='0;0.42;0.46;0.5;1'
              dur='4s'
              repeatCount='indefinite'
            />
          </ellipse>
        </g>
        {/* 腮红 */}
        <ellipse cx='24' cy='55' rx='6' ry='3.6' fill='#f472b6' opacity='0.55' />
        <ellipse cx='72' cy='55' rx='6' ry='3.6' fill='#f472b6' opacity='0.55' />
        {/* 微笑 */}
        <path
          d='M36 60c3.4 4.6 8.2 6.9 12 6.9S56.6 64.6 60 60'
          stroke='#3b2a1a'
          strokeWidth='3.4'
          strokeLinecap='round'
        />
        {/* 小喇叭(推广) */}
        <g transform='translate(63 8) rotate(18)'>
          <path
            d='M2 10l14-7v16L2 12v-2z'
            fill='#38bdf8'
            stroke='#0369a1'
            strokeWidth='1.6'
            strokeLinejoin='round'
          />
          <rect x='0' y='9' width='4' height='6' rx='1.5' fill='#0369a1' />
        </g>
        {/* 声波 */}
        <path
          d='M86 14c2.4 1.8 2.4 6.2 0 8'
          stroke='#38bdf8'
          strokeWidth='2.2'
          strokeLinecap='round'
          opacity='0.9'
        >
          <animate
            attributeName='opacity'
            values='0.15;0.9;0.15'
            dur='1.6s'
            repeatCount='indefinite'
          />
        </path>
      </svg>
    </motion.div>
  )
}
