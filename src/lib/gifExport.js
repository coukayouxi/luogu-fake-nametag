import { CANVAS_HEIGHT, CANVAS_WIDTH, renderScene } from './badgeRenderer'

export function gifFrameDelay(fps) {
  const value = Number(fps)
  if (!Number.isFinite(value) || value <= 0) return 100
  return Math.max(10, Math.round(1000 / value / 10) * 10)
}

function abortError(message = '已取消导出') {
  if (typeof DOMException !== 'undefined') {
    return new DOMException(message, 'AbortError')
  }
  const error = new Error(message)
  error.name = 'AbortError'
  return error
}

export async function exportGif({
  source,
  config,
  frameCount,
  fps,
  scale = 1,
  onProgress = () => {},
  registerCancel,
}) {
  if (!source) throw new Error('请先上传底图')

  const totalFrames = Math.max(2, Math.floor(frameCount))
  const delay = gifFrameDelay(fps)
  const outputWidth = Math.max(1, Math.round(CANVAS_WIDTH * scale))
  const outputHeight = Math.max(1, Math.round(CANVAS_HEIGHT * scale))
  const upscale = outputWidth > CANVAS_WIDTH || outputHeight > CANVAS_HEIGHT
  const renderWidth = upscale ? outputWidth : CANVAS_WIDTH
  const renderHeight = upscale ? outputHeight : CANVAS_HEIGHT

  const fullCanvas = document.createElement('canvas')
  fullCanvas.width = renderWidth
  fullCanvas.height = renderHeight
  const fullContext = fullCanvas.getContext('2d', { alpha: false })
  fullContext.imageSmoothingEnabled = true
  fullContext.imageSmoothingQuality = 'high'
  if (upscale) {
    fullContext.setTransform(
      outputWidth / CANVAS_WIDTH,
      0,
      0,
      outputHeight / CANVAS_HEIGHT,
      0,
      0,
    )
  }

  const outputCanvas = upscale ? null : document.createElement('canvas')
  if (outputCanvas) {
    outputCanvas.width = outputWidth
    outputCanvas.height = outputHeight
  }
  const outputContext = outputCanvas
    ? outputCanvas.getContext('2d', { alpha: false })
    : null
  if (outputContext) {
    outputContext.imageSmoothingEnabled = true
    outputContext.imageSmoothingQuality = 'high'
  }

  return new Promise((resolve, reject) => {
    let settled = false
    let cancelled = false
    const worker = new Worker(new URL('./gifWorker.js', import.meta.url), { type: 'module' })

    const settle = (callback, value) => {
      if (settled) return
      settled = true
      worker.terminate()
      callback(value)
    }

    const cancel = () => {
      if (settled) return
      cancelled = true
      settle(reject, abortError())
    }

    if (registerCancel) registerCancel(cancel)

    worker.onmessage = (event) => {
      const message = event.data
      if (!message || settled) return
      if (message.type === 'palette') {
        onProgress({ phase: 'palette', current: 0, total: totalFrames })
      } else if (message.type === 'progress') {
        onProgress({
          phase: message.phase || 'encode',
          current: message.current,
          total: message.total,
        })
      } else if (message.type === 'done') {
        const blob = new Blob([message.buffer], { type: 'image/gif' })
        settle(resolve, {
          blob,
          width: outputWidth,
          height: outputHeight,
          frameCount: totalFrames,
          delay,
          size: message.byteLength || blob.size,
        })
      } else if (message.type === 'error') {
        settle(reject, new Error(message.message || 'GIF 编码失败'))
      }
    }

    worker.onerror = (event) => {
      settle(reject, new Error(event.message || 'GIF 编码线程出错'))
    }

    worker.postMessage({
      type: 'start',
      width: outputWidth,
      height: outputHeight,
      delay,
    })

    const renderFrames = async () => {
      for (let index = 0; index < totalFrames; index += 1) {
        if (cancelled) throw abortError()
        renderScene(fullContext, source, config, {
          progress: index / totalFrames,
          guides: false,
        })

        if (upscale) {
          const imageData = fullContext.getImageData(0, 0, outputWidth, outputHeight)
          worker.postMessage({ type: 'frame', buffer: imageData.data.buffer }, [imageData.data.buffer])
        } else if (outputWidth === CANVAS_WIDTH && outputHeight === CANVAS_HEIGHT) {
          const imageData = fullContext.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
          worker.postMessage({ type: 'frame', buffer: imageData.data.buffer }, [imageData.data.buffer])
        } else {
          outputContext.clearRect(0, 0, outputWidth, outputHeight)
          outputContext.imageSmoothingEnabled = true
          outputContext.imageSmoothingQuality = 'high'
          outputContext.drawImage(fullCanvas, 0, 0, outputWidth, outputHeight)
          const imageData = outputContext.getImageData(0, 0, outputWidth, outputHeight)
          worker.postMessage({ type: 'frame', buffer: imageData.data.buffer }, [imageData.data.buffer])
        }

        onProgress({ phase: 'render', current: index + 1, total: totalFrames })
        await new Promise((next) => setTimeout(next, 0))
      }

      if (cancelled) throw abortError()
      worker.postMessage({ type: 'finish' })
    }

    renderFrames().catch((error) => {
      settle(reject, error)
    })
  })
}
