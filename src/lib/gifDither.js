const WEIGHT_FORWARD = 7 / 16
const WEIGHT_DOWN_BACK = 3 / 16
const WEIGHT_DOWN = 5 / 16
const WEIGHT_DOWN_FORWARD = 1 / 16

function clampByte(value) {
  if (value <= 0) return 0
  if (value >= 255) return 255
  return value
}

export function createPaletteLut(palette) {
  const lut = new Uint8Array(65536)
  const count = palette.length
  if (!count) return lut

  for (let r5 = 0; r5 < 32; r5 += 1) {
    const red = Math.round((r5 * 255) / 31)
    for (let g6 = 0; g6 < 64; g6 += 1) {
      const green = Math.round((g6 * 255) / 63)
      for (let b5 = 0; b5 < 32; b5 += 1) {
        const blue = Math.round((b5 * 255) / 31)
        let best = 0
        let bestDistance = Infinity
        for (let index = 0; index < count; index += 1) {
          const color = palette[index]
          const dr = color[0] - red
          const dg = color[1] - green
          const db = color[2] - blue
          const distance = dr * dr + dg * dg + db * db
          if (distance < bestDistance) {
            bestDistance = distance
            best = index
          }
        }
        lut[(r5 << 11) | (g6 << 5) | b5] = best
      }
    }
  }

  return lut
}

export function ditherToIndices(rgba, width, height, palette, lut) {
  const indices = new Uint8Array(width * height)
  let current = new Float32Array(width * 3)
  let next = new Float32Array(width * 3)
  const rowBytes = width * 4

  for (let y = 0; y < height; y += 1) {
    const reverse = (y & 1) === 1
    const rowOffset = y * rowBytes
    for (let step = 0; step < width; step += 1) {
      const x = reverse ? width - 1 - step : step
      const pixelOffset = rowOffset + x * 4
      const errorOffset = x * 3
      const red = clampByte(rgba[pixelOffset] + current[errorOffset])
      const green = clampByte(rgba[pixelOffset + 1] + current[errorOffset + 1])
      const blue = clampByte(rgba[pixelOffset + 2] + current[errorOffset + 2])
      const key = ((red >> 3) << 11) | ((green >> 2) << 5) | (blue >> 3)
      const paletteIndex = lut[key]
      indices[y * width + x] = paletteIndex
      const color = palette[paletteIndex]
      const redError = red - color[0]
      const greenError = green - color[1]
      const blueError = blue - color[2]
      const direction = reverse ? -1 : 1

      const forward = x + direction
      if (forward >= 0 && forward < width) {
        const offset = forward * 3
        current[offset] += redError * WEIGHT_FORWARD
        current[offset + 1] += greenError * WEIGHT_FORWARD
        current[offset + 2] += blueError * WEIGHT_FORWARD
      }

      const back = x - direction
      if (back >= 0 && back < width) {
        const offset = back * 3
        next[offset] += redError * WEIGHT_DOWN_BACK
        next[offset + 1] += greenError * WEIGHT_DOWN_BACK
        next[offset + 2] += blueError * WEIGHT_DOWN_BACK
      }

      const below = x * 3
      next[below] += redError * WEIGHT_DOWN
      next[below + 1] += greenError * WEIGHT_DOWN
      next[below + 2] += blueError * WEIGHT_DOWN

      if (forward >= 0 && forward < width) {
        const offset = forward * 3
        next[offset] += redError * WEIGHT_DOWN_FORWARD
        next[offset + 1] += greenError * WEIGHT_DOWN_FORWARD
        next[offset + 2] += blueError * WEIGHT_DOWN_FORWARD
      }
    }

    const swap = current
    current = next
    next = swap
    next.fill(0)
  }

  return indices
}
