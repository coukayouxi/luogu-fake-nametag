<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef, watch } from 'vue'
import ColorEditor from './components/ColorEditor.vue'
import ToggleSwitch from './components/ToggleSwitch.vue'
import {
  BALLOON_PRIMARY_PATH,
  BALLOON_SECONDARY_PATH,
  BADGE_PATH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHECK_PATH,
  buildLayout,
  getMeasureContext,
  renderScene,
} from './lib/badgeRenderer'
import { createSampleBackground } from './lib/sampleBackground'
import { exportGif, gifFrameDelay } from './lib/gifExport'

const DEFAULT_STATE = Object.freeze({
  username: 'Cute_Wazzy',
  hasTag: false,
  existingTagText: '',
  addTag: true,
  tagText: '管理员',
  tagColor: '#9d3dcf',
  tagRainbow: true,
  addBadge: true,
  badgeColor: '#52c41a',
  badgeRainbow: true,
  addBalloon: false,
  balloonColor: '#52c41a',
  balloonRainbow: true,
  nameX: 97,
  baseY: 178,
  itemGap: 3,
  iconSize: 16,
  showGuides: true,
  frames: 25,
  fps: 12.5,
  cycles: 1,
  scale: 1,
})

const TAG_PRESETS = [
  { name: '紫', color: '#9d3dcf' },
  { name: '红', color: '#fe4c61' },
  { name: '橙', color: '#f39c11' },
  { name: '绿', color: '#52c41a' },
  { name: '蓝', color: '#3498db' },
  { name: '灰', color: '#bfbfbf' },
  { name: '棕', color: '#ad8b00' },
]

const ICON_PRESETS = [
  { name: '绿', color: '#52c41a' },
  { name: '蓝', color: '#3498db' },
  { name: '金', color: '#ffc116' },
]

const FRAME_OPTIONS = [16, 20, 25, 30, 36]
const FPS_OPTIONS = [8, 10, 12.5, 20]
const SCALE_OPTIONS = [
  { value: 0.5, label: '0.5×' },
  { value: 0.75, label: '0.75×' },
  { value: 1, label: '1×' },
  { value: 1.5, label: '1.5×' },
  { value: 2, label: '2×' },
]
const ITEM_LABELS = { tag: 'Tag', badge: '钩子', balloon: '气球' }

const state = reactive({ ...DEFAULT_STATE })
const previewCanvas = ref(null)
const fileInput = ref(null)
const backgroundSource = shallowRef(null)
const backgroundMeta = reactive({
  name: '示例底图',
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  sample: true,
})
const backgroundError = ref('')
const isDragging = ref(false)
const previewPlaying = ref(true)
const exporting = ref(false)
const exportProgress = reactive({ phase: 'idle', current: 0, total: 0 })
const exportNotice = ref(null)

let progress = 0
let animationFrame = 0
let lastTimestamp = 0
let cancelExport = null

const measurementContext = getMeasureContext()

const hasAdded = computed(() => state.addTag || state.addBadge || state.addBalloon)
const enabledCount = computed(
  () => [state.addTag, state.addBadge, state.addBalloon].filter(Boolean).length,
)
const hasRainbowEnabled = computed(
  () =>
    (state.addTag && state.tagRainbow) ||
    (state.addBadge && state.badgeRainbow) ||
    (state.addBalloon && state.balloonRainbow),
)
const rainbowItems = computed(() => {
  const items = []
  if (state.addTag && state.tagRainbow) items.push('Tag')
  if (state.addBadge && state.badgeRainbow) items.push('钩子')
  if (state.addBalloon && state.balloonRainbow) items.push('气球')
  return items
})
const frameDelayMs = computed(() => gifFrameDelay(state.fps))
const loopDurationMs = computed(() => frameDelayMs.value * state.frames)
const loopDurationLabel = computed(() => (loopDurationMs.value / 1000).toFixed(2))
const outputSizeLabel = computed(
  () => `${Math.round(CANVAS_WIDTH * state.scale)} × ${Math.round(CANVAS_HEIGHT * state.scale)}`,
)
const layout = computed(() => buildLayout(measurementContext, state))
const layoutStatus = computed(() => {
  const items = layout.value.items.filter((item) => item.type !== 'existingTag')
  if (!items.length) return '尚未选择要添加的认证'
  return items.map((item) => `${ITEM_LABELS[item.type]} X≈${item.x.toFixed(1)}`).join('；')
})
const baseSizeOk = computed(
  () => backgroundMeta.width === CANVAS_WIDTH && backgroundMeta.height === CANVAS_HEIGHT,
)
const canExport = computed(() => Boolean(backgroundSource.value) && hasAdded.value && !exporting.value)
const phaseLabel = computed(() => {
  if (exportProgress.phase === 'render') {
    return `正在绘制第 ${exportProgress.current} / ${exportProgress.total} 帧`
  }
  if (exportProgress.phase === 'palette') return '正在准备 GIF 调色板…'
  if (exportProgress.phase === 'encode') {
    return `正在编码第 ${exportProgress.current} / ${exportProgress.total} 帧`
  }
  return '正在准备导出…'
})
const progressPercent = computed(() => {
  const current = exportProgress.current
  const total = exportProgress.total
  if (exportProgress.phase === 'render') {
    return total ? Math.min(24, (current / total) * 24) : 4
  }
  if (exportProgress.phase === 'palette') return 30
  if (exportProgress.phase === 'encode') {
    return total ? 32 + (current / total) * 68 : 32
  }
  return exporting.value ? 5 : 0
})

function drawPreview(progressValue = progress) {
  const canvas = previewCanvas.value
  if (!canvas) return
  const context = canvas.getContext('2d')
  renderScene(context, backgroundSource.value, state, {
    progress: progressValue,
    guides: state.showGuides,
  })
}

function tickAnimation(timestamp) {
  animationFrame = 0
  if (!previewPlaying.value || !hasRainbowEnabled.value) return
  if (!lastTimestamp) lastTimestamp = timestamp
  const delta = Math.min(120, timestamp - lastTimestamp)
  lastTimestamp = timestamp
  progress = (progress + delta / loopDurationMs.value) % 1
  drawPreview(progress)
  animationFrame = requestAnimationFrame(tickAnimation)
}

function startAnimation() {
  if (animationFrame) return
  lastTimestamp = 0
  animationFrame = requestAnimationFrame(tickAnimation)
}

function stopAnimation() {
  if (animationFrame) cancelAnimationFrame(animationFrame)
  animationFrame = 0
}

function togglePreview() {
  if (!hasRainbowEnabled.value) return
  previewPlaying.value = !previewPlaying.value
}

function setSampleBackground() {
  const sample = createSampleBackground()
  backgroundSource.value = sample
  Object.assign(backgroundMeta, {
    name: '示例底图',
    width: sample.width,
    height: sample.height,
    sample: true,
  })
  backgroundError.value = ''
}

function loadBackgroundFile(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) {
    backgroundError.value = '请选择图片文件（PNG / JPG / WebP）。'
    return
  }
  const objectUrl = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.onload = () => {
    backgroundSource.value = image
    Object.assign(backgroundMeta, {
      name: file.name,
      width: image.naturalWidth,
      height: image.naturalHeight,
      sample: false,
    })
    backgroundError.value = ''
    URL.revokeObjectURL(objectUrl)
  }
  image.onerror = () => {
    backgroundError.value = '图片读取失败，请换一张试试。'
    URL.revokeObjectURL(objectUrl)
  }
  image.src = objectUrl
}

function triggerFile() {
  fileInput.value?.click()
}

function onFileChange(event) {
  const file = event.target.files?.[0]
  if (file) loadBackgroundFile(file)
  event.target.value = ''
}

function onDragOver(event) {
  event.preventDefault()
  isDragging.value = true
}

function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) isDragging.value = false
}

function onDrop(event) {
  event.preventDefault()
  isDragging.value = false
  const file = event.dataTransfer?.files?.[0]
  if (file) loadBackgroundFile(file)
}

function onDropzoneKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    triggerFile()
  }
}

function onPaste(event) {
  const items = event.clipboardData?.items
  if (!items) return
  for (const item of items) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        loadBackgroundFile(file)
        event.preventDefault()
        return
      }
    }
  }
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(index === 0 || value >= 10 ? 0 : 1)} ${units[index]}`
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

async function handleExportPng() {
  if (!canExport.value) return
  exportNotice.value = null
  try {
    const canvas = document.createElement('canvas')
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    const context = canvas.getContext('2d', { alpha: false })
    renderScene(context, backgroundSource.value, state, { progress, guides: false })
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((value) => {
        if (value) resolve(value)
        else reject(new Error('PNG 生成失败，底图可能包含跨域资源。'))
      }, 'image/png')
    })
    downloadBlob(blob, 'luogu-background-certifications.png')
    exportNotice.value = { type: 'success', text: `PNG 已导出 · ${formatBytes(blob.size)}` }
  } catch (error) {
    exportNotice.value = { type: 'error', text: error.message || 'PNG 导出失败' }
  }
}

async function handleExportGif() {
  if (!canExport.value || exporting.value) return
  exportNotice.value = null
  exporting.value = true
  Object.assign(exportProgress, { phase: 'render', current: 0, total: state.frames })
  try {
    const result = await exportGif({
      source: backgroundSource.value,
      config: { ...state },
      frameCount: state.frames,
      fps: state.fps,
      scale: state.scale,
      onProgress: (value) => Object.assign(exportProgress, value),
      registerCancel: (fn) => {
        cancelExport = fn
      },
    })
    downloadBlob(result.blob, 'luogu-background-certifications-color.gif')
    exportNotice.value = {
      type: 'success',
      text: `GIF 已导出 · ${result.width}×${result.height} · ${result.frameCount} 帧 · ${formatBytes(result.size)}`,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      exportNotice.value = { type: 'info', text: '已取消 GIF 导出' }
    } else {
      exportNotice.value = { type: 'error', text: error.message || 'GIF 导出失败' }
    }
  } finally {
    exporting.value = false
    cancelExport = null
  }
}

function handleCancelExport() {
  if (cancelExport) cancelExport()
}

function resetAll() {
  if (exporting.value && cancelExport) cancelExport()
  Object.assign(state, DEFAULT_STATE)
  progress = 0
  previewPlaying.value = true
  exportNotice.value = null
  Object.assign(exportProgress, { phase: 'idle', current: 0, total: 0 })
  setSampleBackground()
  if (fileInput.value) fileInput.value.value = ''
  drawPreview(0)
}

watch(
  () => state.hasTag,
  (value) => {
    if (value) state.addTag = false
  },
)

watch(
  state,
  () => {
    drawPreview()
  },
  { deep: true },
)

watch(backgroundSource, () => {
  drawPreview()
})

watch(
  [hasRainbowEnabled, previewPlaying, loopDurationMs],
  () => {
    stopAnimation()
    if (hasRainbowEnabled.value && previewPlaying.value) startAnimation()
  },
  { immediate: true },
)

onMounted(() => {
  setSampleBackground()
  window.addEventListener('paste', onPaste)
})

onBeforeUnmount(() => {
  stopAnimation()
  if (exporting.value && cancelExport) cancelExport()
  window.removeEventListener('paste', onPaste)
})
</script>

<template>
  <div class="app-shell" :class="{ 'is-exporting': exporting }">
    <div class="ambient ambient-a" aria-hidden="true"></div>
    <div class="ambient ambient-b" aria-hidden="true"></div>
    <div class="ambient-grid" aria-hidden="true"></div>

    <header class="hero">
      <div class="hero-main">
        <div class="logo-mark" aria-hidden="true">
          <svg viewBox="0 0 64 64">
            <defs>
              <linearGradient id="logo-gradient" x1="8" y1="5" x2="56" y2="61" gradientUnits="userSpaceOnUse">
                <stop stop-color="#b6ffc4" />
                <stop offset=".52" stop-color="#52c41a" />
                <stop offset="1" stop-color="#087a3d" />
              </linearGradient>
            </defs>
            <path
              d="M32 4.5 53 10.4l6.5 21.1L45.6 53H18.4L4.5 31.5 11 10.4 32 4.5Z"
              fill="url(#logo-gradient)"
            />
            <path
              d="m20.7 32.1 7.6 7.4 15.7-18"
              fill="none"
              stroke="#fff"
              stroke-width="5.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="hero-copy">
          <div class="eyebrow">
            <span class="eyebrow-dot"></span>
            LUOGU PROFILE BADGE STUDIO
          </div>
          <h1>洛谷底图认证<span>生成器</span></h1>
          <p>
            给底图加上 Tag、钩子与气球。彩色版支持每个元素独立配色，
            导出 GIF 后颜色会持续流转，循环无缝。
          </p>
        </div>
      </div>
      <div class="hero-meta" aria-label="项目信息">
        <span class="meta-pill">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5.5h16v13H4zM8 9h8M8 13h5" />
          </svg>
          1168 × 240
        </span>
        <span class="meta-pill">Vue 3</span>
        <span class="meta-pill accent">
          <span class="spark"></span>
          GIF 彩色版
        </span>
      </div>
    </header>

    <main class="studio">
      <aside class="controls">
        <section class="panel">
          <div class="panel-heading">
            <div>
              <span class="section-kicker">01 / BASE</span>
              <h2>底图与用户名</h2>
            </div>
            <span class="mini-badge" :class="{ good: baseSizeOk }">
              {{ baseSizeOk ? '尺寸合适' : '自动裁切' }}
            </span>
          </div>

          <div
            class="dropzone"
            :class="{ dragging: isDragging, 'has-image': !!backgroundSource }"
            role="button"
            tabindex="0"
            aria-label="上传底图"
            @click="triggerFile"
            @keydown="onDropzoneKeydown"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
          >
            <input
              ref="fileInput"
              class="sr-only"
              type="file"
              accept="image/*"
              @change="onFileChange"
            />
            <div class="dropzone-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 16V4m0 0 4.5 4.5M12 4 7.5 8.5" />
                <path d="M4 14v4.2c0 .9.7 1.8 1.8 1.8h12.4c1.1 0 1.8-.9 1.8-1.8V14" />
              </svg>
            </div>
            <div class="dropzone-copy">
              <strong>{{ backgroundMeta.sample ? '点击或拖拽上传你的底图' : backgroundMeta.name }}</strong>
              <span>
                {{ backgroundMeta.width }} × {{ backgroundMeta.height }}
                · 支持 PNG / JPG / WebP · 自动居中裁切
              </span>
            </div>
            <div class="dropzone-actions">
              <button type="button" class="ghost-button" @click.stop="triggerFile">上传</button>
              <button type="button" class="ghost-button" @click.stop="setSampleBackground">示例</button>
            </div>
          </div>
          <p v-if="backgroundError" class="inline-error">{{ backgroundError }}</p>
          <p v-else class="fineprint">也可以直接按 Ctrl+V 粘贴剪贴板图片。</p>

          <div class="field">
            <label for="username">
              用户名
              <span class="field-hint">仅用于定位与预览</span>
            </label>
            <input
              id="username"
              v-model="state.username"
              type="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="例如 Cute_Wazzy"
            />
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div>
              <span class="section-kicker">02 / BASELINE</span>
              <h2>已有认证</h2>
            </div>
          </div>

          <label class="toggle-row">
            <span class="toggle-copy">
              <b>底图上已经有 Tag</b>
              <small>只计算宽度用于定位，不会画进导出结果</small>
            </span>
            <ToggleSwitch v-model="state.hasTag" label="底图上已经有 Tag" />
          </label>

          <div v-if="state.hasTag" class="subfield">
            <label for="existing-tag">已有 Tag 文字</label>
            <input
              id="existing-tag"
              v-model="state.existingTagText"
              type="text"
              maxlength="24"
              autocomplete="off"
              placeholder="例如 管理员"
            />
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div>
              <span class="section-kicker">03 / BADGES</span>
              <h2>认证内容</h2>
            </div>
            <span class="mini-badge">{{ enabledCount }} 项已启用</span>
          </div>

          <div class="cert-card" :class="{ active: state.addTag }">
            <div class="cert-head">
              <div class="cert-identity">
                <span
                  class="mini-tag"
                  :class="{ 'is-rainbow': state.tagRainbow }"
                  :style="state.tagRainbow ? undefined : { background: state.tagColor }"
                >
                  {{ state.tagText || 'Tag' }}
                </span>
                <div class="cert-copy">
                  <b>Tag</b>
                  <small>文字标签</small>
                </div>
              </div>
              <div class="cert-controls">
                <span v-if="state.addTag && state.tagRainbow" class="rainbow-flag">彩虹</span>
                <ToggleSwitch
                  v-model="state.addTag"
                  :disabled="state.hasTag"
                  label="添加 Tag"
                />
              </div>
            </div>
            <div v-if="state.addTag" class="cert-body">
              <div class="field">
                <label for="tag-text">Tag 文字</label>
                <input
                  id="tag-text"
                  v-model="state.tagText"
                  type="text"
                  maxlength="24"
                  autocomplete="off"
                  placeholder="例如 管理员"
                />
              </div>
              <ColorEditor
                v-model="state.tagColor"
                v-model:rainbow="state.tagRainbow"
                :presets="TAG_PRESETS"
              />
            </div>
            <p v-else-if="state.hasTag" class="cert-note">已有 Tag 时不能再叠加新的 Tag。</p>
          </div>

          <div class="cert-card" :class="{ active: state.addBadge }">
            <div class="cert-head">
              <div class="cert-identity">
                <span
                  class="cert-symbol hook-symbol"
                  :class="{ 'rainbow-icon': state.badgeRainbow && state.addBadge }"
                  :style="{ color: state.badgeColor }"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 512 512">
                    <path :d="BADGE_PATH" fill="currentColor" />
                    <path :d="CHECK_PATH" fill="#fff" />
                  </svg>
                </span>
                <div class="cert-copy">
                  <b>钩子</b>
                  <small>认证图标</small>
                </div>
              </div>
              <div class="cert-controls">
                <span v-if="state.addBadge && state.badgeRainbow" class="rainbow-flag">彩虹</span>
                <ToggleSwitch v-model="state.addBadge" label="添加钩子" />
              </div>
            </div>
            <div v-if="state.addBadge" class="cert-body">
              <ColorEditor
                v-model="state.badgeColor"
                v-model:rainbow="state.badgeRainbow"
                :presets="ICON_PRESETS"
              />
            </div>
          </div>

          <div class="cert-card" :class="{ active: state.addBalloon }">
            <div class="cert-head">
              <div class="cert-identity">
                <span
                  class="cert-symbol balloon-symbol"
                  :class="{ 'rainbow-icon': state.balloonRainbow && state.addBalloon }"
                  :style="{ color: state.balloonColor }"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 384 512">
                    <path :d="BALLOON_PRIMARY_PATH" fill="currentColor" />
                    <path :d="BALLOON_SECONDARY_PATH" fill="#fff" />
                  </svg>
                </span>
                <div class="cert-copy">
                  <b>气球</b>
                  <small>获奖气球</small>
                </div>
              </div>
              <div class="cert-controls">
                <span v-if="state.addBalloon && state.balloonRainbow" class="rainbow-flag">彩虹</span>
                <ToggleSwitch v-model="state.addBalloon" label="添加气球" />
              </div>
            </div>
            <div v-if="state.addBalloon" class="cert-body">
              <ColorEditor
                v-model="state.balloonColor"
                v-model:rainbow="state.balloonRainbow"
                :presets="ICON_PRESETS"
              />
            </div>
          </div>

          <p v-if="!hasAdded" class="inline-error">请至少添加 Tag、钩子或气球中的一项。</p>
        </section>

        <section class="panel rainbow-panel">
          <div class="panel-heading">
            <div>
              <span class="section-kicker">04 / COLOR ENGINE</span>
              <h2>彩色版 · GIF</h2>
            </div>
            <span class="mini-badge" :class="{ rainbow: hasRainbowEnabled }">
              {{ hasRainbowEnabled ? '动效开启' : '静态' }}
            </span>
          </div>

          <p class="section-note">
            为 Tag / 钩子 / 气球分别选择起始色，打开「彩虹」后，
            颜色会在 GIF 中持续变幻。
          </p>

          <div class="engine-status" :class="{ running: hasRainbowEnabled && previewPlaying }">
            <span class="engine-orb" aria-hidden="true"></span>
            <div class="engine-copy">
              <strong>{{ hasRainbowEnabled ? '色相持续变幻' : '颜色保持固定' }}</strong>
              <span v-if="hasRainbowEnabled">
                {{ rainbowItems.join(' + ') }} · 循环 {{ loopDurationLabel }}s · 每轮
                {{ state.cycles }} 圈色相
              </span>
              <span v-else>开启任一项「彩虹」即可生成动态 GIF</span>
            </div>
          </div>

          <div class="field-grid three">
            <label class="field">
              <span>GIF 帧数</span>
              <select v-model.number="state.frames">
                <option v-for="option in FRAME_OPTIONS" :key="option" :value="option">
                  {{ option }} 帧
                </option>
              </select>
            </label>
            <label class="field">
              <span>帧率</span>
              <select v-model.number="state.fps">
                <option v-for="option in FPS_OPTIONS" :key="option" :value="option">
                  {{ option }} fps
                </option>
              </select>
            </label>
            <label class="field">
              <span>色相圈数</span>
              <select v-model.number="state.cycles">
                <option v-for="option in [1, 2, 3]" :key="option" :value="option">
                  {{ option }} 圈
                </option>
              </select>
            </label>
          </div>

          <div class="field">
            <span class="fake-label">GIF 尺寸 <em>{{ outputSizeLabel }}</em></span>
            <div class="segmented" role="group" aria-label="GIF 尺寸">
              <button
                v-for="option in SCALE_OPTIONS"
                :key="option.value"
                type="button"
                :class="{ active: state.scale === option.value }"
                @click="state.scale = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <p class="fineprint">
            循环 {{ loopDurationLabel }}s · 首尾无缝衔接。GIF 使用全局调色板与抖动映射，渐变更平滑；
            1.5× / 2× 按矢量重绘，适合高分屏，体积也更大。
          </p>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div>
              <span class="section-kicker">05 / TUNING</span>
              <h2>定位微调</h2>
            </div>
          </div>

          <div class="field-grid two">
            <label class="field">
              <span>用户名起始 X</span>
              <input v-model.number="state.nameX" type="number" step="1" />
            </label>
            <label class="field">
              <span>文字基线 Y</span>
              <input v-model.number="state.baseY" type="number" step="1" />
            </label>
            <label class="field">
              <span>认证间距</span>
              <input v-model.number="state.itemGap" type="number" min="0" max="20" step="0.5" />
            </label>
            <label class="field">
              <span>图标高度</span>
              <input v-model.number="state.iconSize" type="number" min="8" max="40" step="1" />
            </label>
          </div>

          <label class="toggle-row">
            <span class="toggle-copy">
              <b>显示定位辅助</b>
              <small>用户名、已有 Tag 与虚线参考线，仅预览可见</small>
            </span>
            <ToggleSwitch v-model="state.showGuides" label="显示定位辅助" />
          </label>

          <button type="button" class="ghost-button reset-button" @click="resetAll">
            恢复默认设置
          </button>
        </section>
      </aside>

      <section class="preview-column">
        <div class="panel preview-panel">
          <div class="preview-head">
            <div class="preview-title">
              <span
                class="live-dot"
                :class="{ pulse: hasRainbowEnabled && previewPlaying }"
                aria-hidden="true"
              ></span>
              <div>
                <span class="section-kicker">LIVE PREVIEW</span>
                <h2>实时预览</h2>
              </div>
            </div>
            <div class="preview-tools">
              <span class="dimension-chip">{{ CANVAS_WIDTH }} × {{ CANVAS_HEIGHT }}</span>
              <button
                type="button"
                class="icon-button"
                :disabled="!hasRainbowEnabled"
                :title="hasRainbowEnabled ? (previewPlaying ? '暂停动效' : '播放动效') : '未开启彩虹'"
                :aria-label="previewPlaying ? '暂停动效' : '播放动效'"
                @click="togglePreview"
              >
                <svg v-if="previewPlaying" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5.5v13M16 5.5v13" />
                </svg>
                <svg v-else viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m8.5 5.5 10 6.5-10 6.5z" />
                </svg>
              </button>
              <label class="tool-toggle">
                <span>辅助线</span>
                <ToggleSwitch v-model="state.showGuides" label="显示定位辅助" />
              </label>
            </div>
          </div>

          <div
            class="canvas-stage"
            :class="{ dragging: isDragging, 'is-busy': exporting }"
            @dragover="onDragOver"
            @dragleave="onDragLeave"
            @drop="onDrop"
          >
            <canvas
              ref="previewCanvas"
              :width="CANVAS_WIDTH"
              :height="CANVAS_HEIGHT"
              aria-label="洛谷底图认证实时预览"
            ></canvas>
            <span class="stage-tag top-left">PREVIEW</span>
            <span class="stage-tag bottom-right">{{ backgroundMeta.sample ? 'SAMPLE' : 'BANNER' }}</span>
            <div v-if="exporting" class="stage-overlay">
              <span class="spinner" aria-hidden="true"></span>
              <strong>正在生成 GIF</strong>
              <span>{{ phaseLabel }}</span>
            </div>
          </div>

          <div class="preview-status">
            <div class="status-line">
              <span class="status-label">位置</span>
              <strong>{{ layoutStatus }}</strong>
            </div>
            <div class="status-chips">
              <span class="status-chip" :class="{ ok: baseSizeOk }">
                {{ baseSizeOk ? '底图尺寸正确' : '底图将自动裁切' }}
              </span>
              <span v-if="hasRainbowEnabled" class="status-chip rainbow">
                彩虹流转 · {{ loopDurationLabel }}s
              </span>
              <span v-else class="status-chip">静态颜色</span>
              <span v-if="backgroundMeta.sample" class="status-chip">示例底图</span>
            </div>
          </div>

          <div class="action-bar">
            <button type="button" class="btn btn-png" :disabled="!canExport" @click="handleExportPng">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 19h14" />
              </svg>
              导出 PNG
            </button>
            <button type="button" class="btn btn-gif" :disabled="!canExport" @click="handleExportGif">
              <span class="gif-spark" aria-hidden="true"></span>
              <span>导出 GIF</span>
              <span class="gif-chip">动态</span>
            </button>
          </div>

          <div v-if="exporting" class="progress-panel">
            <div class="progress-head">
              <span>{{ phaseLabel }}</span>
              <strong>{{ Math.round(progressPercent) }}%</strong>
            </div>
            <div class="progress-track">
              <span :style="{ width: `${progressPercent}%` }"></span>
            </div>
            <button type="button" class="text-button" @click="handleCancelExport">取消导出</button>
          </div>

          <p v-if="exportNotice" class="notice" :class="exportNotice.type">
            {{ exportNotice.text }}
          </p>

          <p class="privacy-note">
            <span class="privacy-dot"></span>
            所有图片只在你的浏览器本地处理，不会上传服务器。
          </p>
        </div>

        <div class="tip-card">
          <span class="tip-kicker">TIP</span>
          <p>
            <b>底图通常已经包含用户名</b>，所以 PNG / GIF 只导出新增的 Tag、钩子与气球。
            预览里的用户名仅用于定位。
          </p>
        </div>
      </section>
    </main>

    <footer class="footer">
      <span>灵感来自 <a href="https://luogubadge.pages.dev/" target="_blank" rel="noreferrer">luogubadge.pages.dev</a></span>
      <span class="footer-sep"></span>
      <span>Vue 3 · Canvas · gifenc</span>
      <span class="footer-sep"></span>
      <span>默认 1168 × 240 · 支持 2× 高清</span>
    </footer>
  </div>
</template>
