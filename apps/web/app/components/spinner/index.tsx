import { interpolate } from 'flubber'
import {
  AnimatePresence,
  easeInOut,
  motion,
  transform,
  useAnimationFrame,
  useMotionValue,
  useTransform,
} from 'framer-motion'
import { FC, useRef } from 'react'
import { path1, path2, path3, path4 } from './path'

// path pattern
const allPaths = [path1, path2, path3, path2, path4, path1]

const timePerPath = 0.7
const totalFrames = Math.floor(60 * (allPaths.length + 1) * timePerPath)

const t = transform(
  allPaths.map((_, i) => i),
  allPaths,
  {
    mixer: (a, b) => interpolate(a, b, { maxSegmentLength: 0.25 }),
    ease: easeInOut,
  },
)

// output an array of each frame of t at 60fps
const frames = Array.from({ length: totalFrames }, (_, i) => {
  return t(i / (60 * timePerPath))
})

function Spinner({ size = 32, fill = '#307b34', stroke = 'black', strokeWidth = 0.7 }) {
  const actualPath = useMotionValue(frames[0])
  const ref = useRef(null)
  const rotation = useMotionValue(0)
  const easedRotation = useTransform(rotation, [0, 1], [0, 360], {
    ease: easeInOut,
  })

  useAnimationFrame((t) => {
    actualPath.set(frames[Math.floor((60 * (t / 1000 / 0.7)) % totalFrames)])
    rotation.set((t / 1000 / 0.8) % 1)
    if (ref?.current) {
      const path = ref.current as SVGPathElement
      path.setAttribute('d', actualPath.get())
      path.style.transform = `rotate(${easedRotation.get()}deg)`
    }
  })

  return (
    <svg width={size} height={size} viewBox='0 0 16 16'>
      <g>
        <motion.path
          style={{
            transformOrigin: `8px 8px`,
          }}
          ref={ref}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
        />
      </g>
    </svg>
  )
}

export const AnimateSpinner: FC<{
  size: number
  color?: string
}> = ({ size, color }) => {
  return (
    <div className='flex justify-center align-center mt-32'>
      <AnimatePresence>
        <motion.div initial='hidden' animate='visible' exit='hidden'>
          <motion.div>
            <Spinner size={size} fill={color} />
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
