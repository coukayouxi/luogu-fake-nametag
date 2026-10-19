export const CANVAS_WIDTH = 1168
export const CANVAS_HEIGHT = 240
export const FONT_STACK =
  '-apple-system,BlinkMacSystemFont,"Helvetica Neue","PingFang SC","Noto Sans","Noto Sans SC","Source Sans Pro","Source Han Sans","Segoe UI",Arial,"Microsoft YaHei","WenQuanYi Micro Hei",sans-serif'

const TAG_FONT_SIZE = 12.25
const TAG_LINE_HEIGHT = 18.375
const TAG_PAD_X = 6.125
const TAG_BORDER = 1
const TAG_RADIUS = 2
const DESCENDER = 3.0625

export const BADGE_PATH =
  'M0 256C0 292.8 20.7 324.8 51.1 340.9 41 373.8 49 411 75 437s63.3 34 96.1 23.9C187.2 491.3 219.2 512 256 512s68.8-20.7 84.9-51.1C373.8 471 411 463 437 437s34-63.3 23.9-96.1C491.3 324.8 512 292.8 512 256s-20.7-68.8-51.1-84.9C471 138.2 463 101 437 75s-63.3-34-96.1-23.9C324.8 20.7 292.8 0 256 0s-68.8 20.7-84.9 51.1C138.2 41 101 49 75 75s-34 63.3-23.9 96.1C20.7 187.2 0 219.2 0 256zm152.3 41.6c-9.2-9.5-9-24.7 .6-33.9 9.5-9.2 24.7-8.9 33.9 .6l35.8 37 106.1-145.8c7.8-10.7 22.8-13.1 33.5-5.3 10.7 7.8 13.1 22.8 5.3 33.5L244.7 352.7c-4.2 5.7-10.7 9.4-17.8 9.8-7.1 .5-14-2.2-18.9-7.3l-55.7-57.6z'
export const CHECK_PATH =
  'M328.7 155.5c7.8-10.7 22.8-13.1 33.5-5.3 10.7 7.8 13.1 22.8 5.3 33.5L244.7 352.7c-4.2 5.7-10.7 9.4-17.8 9.8-7.1 .5-14-2.2-18.9-7.3l-55.7-57.6c-9.2-9.5-9-24.7 .6-33.9 9.5-9.2 24.7-8.9 33.9 .6l35.8 37 106.1-145.8z'
export const BALLOON_PRIMARY_PATH =
  'M0 192C0 86 86 0 192 0S384 86 384 192c0 128-160 240-160 240l27.9 41.8c2.7 4 4.1 8.8 4.1 13.6 0 13.6-11 24.6-24.6 24.6l-78.9 0c-13.6 0-24.6-11-24.6-24.6 0-4.8 1.4-9.6 4.1-13.6L160 432S0 320 0 192zm104-16c0-39.8 32.2-72 72-72 13.3 0 24-10.7 24-24s-10.7-24-24-24c-66.3 0-120 53.7-120 120 0 13.3 10.7 24 24 24s24-10.7 24-24z'
export const BALLOON_SECONDARY_PATH =
  'M56 176c0 13.3 10.7 24 24 24s24-10.7 24-24c0-39.8 32.2-72 72-72 13.3 0 24-10.7 24-24s-10.7-24-24-24C109.7 56 56 109.7 56 176z'

let paths = null
let measureContext = null

function getPaths() {
  if (!paths) {
    paths = {
      badge: new Path2D(BADGE_PATH),
      check: new Path2D(CHECK_PATH),
      balloonPrimary: new Path2D(BALLOON_PRIMARY_PATH),
      balloonSecondary: new Path2D(BALLOON_SECONDARY_PATH),
    }
  }
  return paths
}

export function getMeasureContext() {
  if (!measureContext) {
    const canvas = document.createElement('canvas')
    canvas.width = 8
    canvas.height = 8
    measureContext = canvas.getContext('2d')
  }
  return measureContext
}

export function normalizeHex(value) {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return null
  let hex = match[1]
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('')
  }
  return `#${hex.toLowerCase()}`
}

export function hexToHue(value) {
  const hex = normalizeHex(value) || '#52c41a'
  const red = parseInt(hex.slice(1, 3), 16) / 255
  const green = parseInt(hex.slice(3, 5), 16) / 255
  const blue = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  if (delta === 0) return 0
  let hue = 0
  if (max === red) hue = ((green - blue) / delta) % 6
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4
  return (hue * 60 + 360) % 360
}

function clamp(value, min, max, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function validColor(value, fallback) {
  return normalizeHex(value) || fallback
}

function hsl(hue, saturation, lightness) {
  const normalizedHue = ((hue % 360) + 360) % 360
  return `hsl(${normalizedHue.toFixed(2)}, ${saturation}%, ${lightness}%)`
}

function tagGradient(ctx, x, top, width, height, color, hueShift) {
  const gradient = ctx.createLinearGradient(x, top, x + Math.max(width, 1), top + height)
  const baseHue = hexToHue(color)
  const stops = [
    [0, 0, 42],
    [0.34, 48, 46],
    [0.68, 96, 43],
    [1, 144, 47],
  ]
  for (const [stop, hueOffset, lightness] of stops) {
    gradient.addColorStop(stop, hsl(baseHue + hueShift + hueOffset, 82, lightness))
  }
  return gradient
}

function iconGradient(ctx, width, height, color, hueShift) {
  const gradient = ctx.createLinearGradient(0, 0, width, height)
  const baseHue = hexToHue(color)
  gradient.addColorStop(0, hsl(baseHue + hueShift, 88, 51))
  gradient.addColorStop(0.55, hsl(baseHue + hueShift + 52, 92, 56))
  gradient.addColorStop(1, hsl(baseHue + hueShift + 108, 86, 48))
  return gradient
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

export function measureName(ctx, text) {
  ctx.font = `bold 24px ${FONT_STACK}`
  return ctx.measureText(text || '').width
}

export function measureTag(ctx, text) {
  ctx.font = `400 ${TAG_FONT_SIZE}px ${FONT_STACK}`
  const textWidth = ctx.measureText((text || '').trim()).width
  return textWidth + TAG_PAD_X * 2 + TAG_BORDER * 2
}

export function buildLayout(ctx, config = {}) {
  const nameX = clamp(config.nameX, -2000, 4000, 97)
  const baseY = clamp(config.baseY, -2000, 4000, 178)
  const gap = clamp(config.itemGap, 0, 40, 3)
  const iconSize = clamp(config.iconSize, 4, 80, 16)
  const username = typeof config.username === 'string' ? config.username : ''
  const nameWidth = measureName(ctx, username)
  let cursor = nameX + nameWidth
  const items = []

  const existingText = typeof config.existingTagText === 'string' ? config.existingTagText.trim() : ''
  if (config.hasTag && existingText) {
    cursor += gap
    const width = measureTag(ctx, existingText)
    items.push({ type: 'existingTag', x: cursor, w: width, text: existingText })
    cursor += width
  }

  if (config.addTag) {
    cursor += gap
    const text = typeof config.tagText === 'string' ? config.tagText.trim() : ''
    const width = measureTag(ctx, text)
    items.push({ type: 'tag', x: cursor, w: width, text })
    cursor += width
  }

  if (config.addBadge) {
    cursor += gap
    items.push({ type: 'badge', x: cursor, w: iconSize })
    cursor += iconSize
  }

  if (config.addBalloon) {
    cursor += gap
    const width = iconSize * 0.75
    items.push({ type: 'balloon', x: cursor, w: width })
    cursor += width
  }

  return {
    x: nameX,
    y: baseY,
    nameWidth,
    gap,
    iconSize,
    items,
    endX: cursor,
  }
}

export function drawCover(ctx, source, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  if (!source || !source.width || !source.height) return false
  ctx.imageSmoothingEnabled = true
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high'
  const scale = Math.max(width / source.width, height / source.height)
  const sourceWidth = width / scale
  const sourceHeight = height / scale
  const sourceX = (source.width - sourceWidth) / 2
  const sourceY = (source.height - sourceHeight) / 2
  ctx.drawImage(source, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height)
  return true
}

export function drawTag(ctx, x, baseline, width, text, color, rainbow, hueShift) {
  const fontSize = TAG_FONT_SIZE
  const lineHeight = TAG_LINE_HEIGHT
  const totalHeight = lineHeight + TAG_BORDER * 2
  const top = baseline - (lineHeight - DESCENDER) - TAG_BORDER

  ctx.save()
  ctx.fillStyle = rainbow
    ? tagGradient(ctx, x, top, width, totalHeight, color, hueShift)
    : validColor(color, '#9d3dcf')
  roundRect(ctx, x, top, width, totalHeight, TAG_RADIUS)
  ctx.fill()

  ctx.font = `400 ${fontSize}px ${FONT_STACK}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#ffffff'
  if (rainbow) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.32)'
    ctx.shadowBlur = 2
    ctx.shadowOffsetY = 0.5
  }
  const textBaseline = top + TAG_BORDER + (lineHeight - fontSize) / 2 + fontSize * 0.8
  ctx.fillText(text, x + TAG_BORDER + TAG_PAD_X, textBaseline)
  ctx.restore()
}

export function drawBadge(ctx, x, baseline, size, color, rainbow, hueShift) {
  const { badge, check } = getPaths()
  const centerY = baseline - size * 0.375
  ctx.save()
  ctx.translate(x, centerY - size / 2)
  ctx.scale(size / 512, size / 512)
  ctx.fillStyle = rainbow ? iconGradient(ctx, 512, 512, color, hueShift) : validColor(color, '#52c41a')
  ctx.fill(badge)
  ctx.fillStyle = '#ffffff'
  ctx.fill(check)
  ctx.restore()
}

export function drawBalloon(ctx, x, baseline, size, color, rainbow, hueShift) {
  const { balloonPrimary, balloonSecondary } = getPaths()
  const width = size * 0.75
  const centerY = baseline - size * 0.375
  ctx.save()
  ctx.translate(x, centerY - size / 2)
  ctx.scale(width / 384, size / 512)
  ctx.fillStyle = rainbow ? iconGradient(ctx, 384, 512, color, hueShift) : validColor(color, '#52c41a')
  ctx.fill(balloonPrimary)
  ctx.fillStyle = '#ffffff'
  ctx.fill(balloonSecondary)
  ctx.restore()
}

function drawGuides(ctx, config, layout) {
  ctx.save()
  ctx.font = `bold 24px ${FONT_STACK}`
  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = 'rgba(255, 255, 255, 0.94)'
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
  ctx.shadowBlur = 4
  ctx.fillText(config.username || '', layout.x, layout.y)
  ctx.shadowBlur = 0
  ctx.shadowOffsetY = 0

  for (const item of layout.items) {
    if (item.type === 'existingTag') {
      drawTag(ctx, item.x, layout.y, item.w, item.text, '#9d3dcf', false, 0)
    }
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.38)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  for (const item of layout.items) {
    if (item.type === 'existingTag') continue
    ctx.beginPath()
    ctx.moveTo(item.x, 18)
    ctx.lineTo(item.x, CANVAS_HEIGHT - 18)
    ctx.stroke()
  }
  ctx.setLineDash([])
  ctx.restore()
}

export function renderScene(ctx, source, config = {}, options = {}) {
  const progress = Number.isFinite(options.progress) ? ((options.progress % 1) + 1) % 1 : 0
  const guides = Boolean(options.guides)
  const cycles = clamp(config.cycles, 1, 6, 1)
  const hueShift = progress * 360 * cycles

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  if (!drawCover(ctx, source, CANVAS_WIDTH, CANVAS_HEIGHT)) {
    const fallback = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    fallback.addColorStop(0, '#111b16')
    fallback.addColorStop(1, '#0a100d')
    ctx.fillStyle = fallback
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  const layout = buildLayout(ctx, config)
  for (const item of layout.items) {
    if (item.type === 'tag') {
      drawTag(ctx, item.x, layout.y, item.w, item.text, config.tagColor, Boolean(config.tagRainbow), hueShift)
    } else if (item.type === 'badge') {
      drawBadge(ctx, item.x, layout.y, layout.iconSize, config.badgeColor, Boolean(config.badgeRainbow), hueShift)
    } else if (item.type === 'balloon') {
      drawBalloon(
        ctx,
        item.x,
        layout.y,
        layout.iconSize,
        config.balloonColor,
        Boolean(config.balloonRainbow),
        hueShift,
      )
    }
  }

  if (guides) drawGuides(ctx, config, layout)
  return layout
}
