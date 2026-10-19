import { GIFEncoder, quantize } from 'gifenc'
import { createPaletteLut, ditherToIndices } from './gifDither'

let width = 0
let height = 0
let delay = 0
let frames = []

function post(type, payload = {}, transfer = []) {
  self.postMessage({ type, ...payload }, transfer)
}

function changedPixelCount(current, previous) {
  const currentWords = new Uint32Array(current.buffer, current.byteOffset, width * height)
  const previousWords = new Uint32Array(previous.buffer, previous.byteOffset, width * height)
  let count = 0
  for (let pixel = 0; pixel < currentWords.length; pixel += 1) {
    if (currentWords[pixel] !== previousWords[pixel]) count += 1
  }
  return count
}

function buildPaletteSample() {
  if (!frames.length) return new Uint8ClampedArray(0)

  const first = frames[0]
  let capacity = first.length + 262144
  let sample = new Uint8ClampedArray(capacity)
  sample.set(first, 0)
  let offset = first.length

  for (let index = 1; index < frames.length; index += 1) {
    const current = frames[index]
    const previous = frames[index - 1]
    const changed = changedPixelCount(current, previous)
    const needed = offset + changed * 4
    if (needed > capacity) {
      let nextCapacity = capacity * 2
      while (nextCapacity < needed) nextCapacity *= 2
      const bigger = new Uint8ClampedArray(nextCapacity)
      bigger.set(sample.subarray(0, offset), 0)
      sample = bigger
      capacity = nextCapacity
    }

    for (let pointer = 0; pointer < current.length; pointer += 4) {
      if (
        current[pointer] !== previous[pointer] ||
        current[pointer + 1] !== previous[pointer + 1] ||
        current[pointer + 2] !== previous[pointer + 2] ||
        current[pointer + 3] !== previous[pointer + 3]
      ) {
        sample[offset] = current[pointer]
        sample[offset + 1] = current[pointer + 1]
        sample[offset + 2] = current[pointer + 2]
        sample[offset + 3] = current[pointer + 3]
        offset += 4
      }
    }
  }

  return sample.subarray(0, offset)
}

function encode() {
  try {
    if (!frames.length || !width || !height) {
      throw new Error('没有可编码的帧')
    }

    post('palette')
    const sample = buildPaletteSample()
    const colors = quantize(sample, 255, { format: 'rgb565' })
    const palette = colors.slice()
    while (palette.length < 256) palette.push([0, 0, 0])

    const lut = createPaletteLut(colors)
    const gif = GIFEncoder()
    const pixelCount = width * height
    let previous = null

    for (let index = 0; index < frames.length; index += 1) {
      const current = frames[index]
      const indices = ditherToIndices(current, width, height, colors, lut)

      if (previous) {
        const currentWords = new Uint32Array(current.buffer, current.byteOffset, pixelCount)
        const previousWords = new Uint32Array(previous.buffer, previous.byteOffset, pixelCount)
        for (let pixel = 0; pixel < pixelCount; pixel += 1) {
          if (currentWords[pixel] === previousWords[pixel]) indices[pixel] = 255
        }
      }

      if (index === 0) {
        gif.writeFrame(indices, width, height, {
          palette,
          delay,
          repeat: 0,
          dispose: 1,
        })
      } else {
        gif.writeFrame(indices, width, height, {
          delay,
          transparent: true,
          transparentIndex: 255,
          dispose: 1,
        })
      }

      previous = current
      post('progress', { phase: 'encode', current: index + 1, total: frames.length })
    }

    gif.finish()
    const bytes = gif.bytes()
    post('done', { buffer: bytes.buffer, byteLength: bytes.byteLength }, [bytes.buffer])
    frames = []
  } catch (error) {
    post('error', { message: error && error.message ? error.message : String(error) })
    frames = []
  }
}

self.onmessage = (event) => {
  const message = event.data
  if (!message || typeof message !== 'object') return

  if (message.type === 'start') {
    width = Math.max(1, Math.floor(message.width))
    height = Math.max(1, Math.floor(message.height))
    delay = Math.max(10, Math.floor(message.delay))
    frames = []
    return
  }

  if (message.type === 'frame') {
    frames.push(new Uint8ClampedArray(message.buffer))
    return
  }

  if (message.type === 'finish') {
    encode()
  }
}
