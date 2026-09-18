import Claude from '@lobehub/icons/es/Claude'
import Dalle from '@lobehub/icons/es/Dalle'
import DeepSeek from '@lobehub/icons/es/DeepSeek'
import Doubao from '@lobehub/icons/es/Doubao'
import ElevenLabs from '@lobehub/icons/es/ElevenLabs'
import Flux from '@lobehub/icons/es/Flux'
import Gemini from '@lobehub/icons/es/Gemini'
import Grok from '@lobehub/icons/es/Grok'
import Hailuo from '@lobehub/icons/es/Hailuo'
import Hunyuan from '@lobehub/icons/es/Hunyuan'
import Jimeng from '@lobehub/icons/es/Jimeng'
import Kimi from '@lobehub/icons/es/Kimi'
import Kling from '@lobehub/icons/es/Kling'
import Luma from '@lobehub/icons/es/Luma'
import Midjourney from '@lobehub/icons/es/Midjourney'
import OpenAI from '@lobehub/icons/es/OpenAI'
import Pika from '@lobehub/icons/es/Pika'
import Qwen from '@lobehub/icons/es/Qwen'
import Runway from '@lobehub/icons/es/Runway'
import Sora from '@lobehub/icons/es/Sora'
import Stability from '@lobehub/icons/es/Stability'
import Suno from '@lobehub/icons/es/Suno'
import Udio from '@lobehub/icons/es/Udio'
import Vidu from '@lobehub/icons/es/Vidu'
import Zhipu from '@lobehub/icons/es/Zhipu'
import { Sparkles } from 'lucide-react'
/**
 * 7Code 首页主题：icon 名 → 图标组件 的映射表
 * models.json 里的 "icon" 字段在这里查表；查不到的自动回退为通用 ✦ 图标。
 * 深路径按需引入，避免 barrel 导入把整个图标库打进 bundle。
 */
import type { ComponentType } from 'react'

type IconComp = ComponentType<{ size?: number }>

const map: Record<string, IconComp> = {
  Claude,
  OpenAI,
  Grok,
  Gemini,
  DeepSeek,
  Kimi,
  Qwen,
  Doubao,
  Hunyuan,
  Zhipu,
  Hailuo,
  Kling,
  Jimeng,
  Sora,
  Runway,
  Vidu,
  Pika,
  Luma,
  Midjourney,
  Flux,
  Stability,
  Dalle,
  Suno,
  Udio,
  ElevenLabs,
}

/**
 * 按配置名解析图标：
 *   "Claude"        → 单色版（跟随 currentColor）
 *   "Claude.Color"  → 官方彩色版（取主图标的 Color 子组件）
 * 查不到回退 ✦
 */
export function BrandIcon({
  name,
  size = 18,
}: {
  name?: string
  size?: number
}) {
  if (!name) return <Sparkles size={size} />
  const [base, sub] = name.split('.')
  const Icon = map[base]
  if (!Icon) return <Sparkles size={size} />
  if (sub) {
    const Sub = (Icon as IconComp & Record<string, IconComp | undefined>)[sub]
    if (Sub) return <Sub size={size} />
  }
  return <Icon size={size} />
}
