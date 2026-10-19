import { CANVAS_HEIGHT, CANVAS_WIDTH, FONT_STACK } from './badgeRenderer'

function seededRandom(seed) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

export function createSampleBackground() {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const ctx = canvas.getContext('2d')

  const background = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  background.addColorStop(0, '#071f19')
  background.addColorStop(0.42, '#0b3c2c')
  background.addColorStop(0.74, '#0a2f25')
  background.addColorStop(1, '#061510')
  ctx.fillStyle = background
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const limeGlow = ctx.createRadialGradient(1000, -70, 12, 1000, -70, 430)
  limeGlow.addColorStop(0, 'rgba(138, 255, 158, 0.36)')
  limeGlow.addColorStop(0.42, 'rgba(82, 196, 26, 0.16)')
  limeGlow.addColorStop(1, 'rgba(82, 196, 26, 0)')
  ctx.fillStyle = limeGlow
  ctx.fillRect(420, 0, 748, 300)

  const tealGlow = ctx.createRadialGradient(120, 310, 0, 120, 310, 420)
  tealGlow.addColorStop(0, 'rgba(40, 196, 160, 0.18)')
  tealGlow.addColorStop(1, 'rgba(40, 196, 160, 0)')
  ctx.fillStyle = tealGlow
  ctx.fillRect(0, 0, 600, 240)

  ctx.save()
  ctx.globalAlpha = 0.05
  ctx.strokeStyle = '#d7ffe0'
  ctx.lineWidth = 1
  for (let x = -CANVAS_HEIGHT; x < CANVAS_WIDTH + CANVAS_HEIGHT; x += 28) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x + CANVAS_HEIGHT, CANVAS_HEIGHT)
    ctx.stroke()
  }
  for (let y = 12; y < CANVAS_HEIGHT; y += 28) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(CANVAS_WIDTH, y)
    ctx.stroke()
  }
  ctx.restore()

  ctx.save()
  ctx.translate(1036, 248)
  ctx.rotate(-0.14)
  for (let index = 0; index < 6; index += 1) {
    ctx.beginPath()
    ctx.arc(0, 0, 84 + index * 52, 0, Math.PI * 2)
    ctx.strokeStyle = index % 2 === 0 ? 'rgba(151, 255, 172, 0.1)' : 'rgba(151, 255, 172, 0.045)'
    ctx.lineWidth = index === 0 ? 2 : 1
    ctx.stroke()
  }
  ctx.beginPath()
  ctx.arc(0, 0, 236, Math.PI * 1.1, Math.PI * 1.92)
  ctx.strokeStyle = 'rgba(138, 255, 158, 0.26)'
  ctx.lineWidth = 2
  ctx.setLineDash([2, 10])
  ctx.stroke()
  ctx.restore()

  const random = seededRandom(20240518)
  ctx.save()
  for (let index = 0; index < 1500; index += 1) {
    const x = random() * CANVAS_WIDTH
    const y = random() * CANVAS_HEIGHT
    const alpha = 0.025 + random() * 0.07
    const size = random() > 0.93 ? 1.6 : 0.85
    ctx.fillStyle = `rgba(208, 255, 218, ${alpha})`
    ctx.fillRect(x, y, size, size)
  }
  ctx.restore()

  ctx.save()
  ctx.globalAlpha = 0.055
  ctx.fillStyle = '#ffffff'
  ctx.font = `800 104px ${FONT_STACK}`
  ctx.textAlign = 'right'
  ctx.fillText('LUOGU', 1128, 138)
  ctx.globalAlpha = 0.1
  ctx.font = `700 11px ${FONT_STACK}`
  ctx.letterSpacing = '5px'
  ctx.fillText('PROFILE BANNER', 1128, 164)
  ctx.restore()

  const leftShade = ctx.createLinearGradient(0, 0, 620, 0)
  leftShade.addColorStop(0, 'rgba(1, 12, 8, 0.46)')
  leftShade.addColorStop(0.55, 'rgba(1, 12, 8, 0.2)')
  leftShade.addColorStop(1, 'rgba(1, 12, 8, 0)')
  ctx.fillStyle = leftShade
  ctx.fillRect(0, 0, 620, CANVAS_HEIGHT)

  const bottomShade = ctx.createLinearGradient(0, 150, 0, CANVAS_HEIGHT)
  bottomShade.addColorStop(0, 'rgba(0, 0, 0, 0)')
  bottomShade.addColorStop(1, 'rgba(0, 8, 4, 0.38)')
  ctx.fillStyle = bottomShade
  ctx.fillRect(0, 150, CANVAS_WIDTH, 90)

  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = '#a9e9b8'
  ctx.beginPath()
  ctx.arc(28, 28, 2.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = `700 9px ${FONT_STACK}`
  ctx.letterSpacing = '1.8px'
  ctx.fillStyle = 'rgba(190, 246, 203, 0.72)'
  ctx.fillText('SAMPLE BANNER / 1168 × 240', 37, 31.5)
  ctx.restore()

  ctx.save()
  ctx.fillStyle = 'rgba(132, 255, 158, 0.3)'
  ctx.fillRect(0, CANVAS_HEIGHT - 1, CANVAS_WIDTH, 1)
  ctx.restore()

  return canvas
}
