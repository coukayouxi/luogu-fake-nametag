<script setup>
const props = defineProps({
  modelValue: { type: String, default: '#52c41a' },
  rainbow: { type: Boolean, default: false },
  presets: { type: Array, default: () => [] },
  disabled: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'update:rainbow'])

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function isActive(color) {
  return normalize(color) === normalize(props.modelValue)
}

function select(color) {
  emit('update:modelValue', color)
}

function toggleRainbow(event) {
  emit('update:rainbow', event.target.checked)
}
</script>

<template>
  <div class="color-editor" :class="{ 'is-disabled': disabled }">
    <div class="color-editor-top">
      <div class="preset-list" role="group" aria-label="预设颜色">
        <button
          v-for="preset in presets"
          :key="preset.color"
          type="button"
          class="preset-chip"
          :class="{ active: isActive(preset.color) }"
          :disabled="disabled"
          :title="`${preset.name} ${preset.color}`"
          @click="select(preset.color)"
        >
          <span class="chip-dot" :style="{ background: preset.color }"></span>
          <span>{{ preset.name }}</span>
        </button>
      </div>

      <label class="rainbow-switch" :class="{ active: rainbow }" title="让该认证的颜色在 GIF 中持续变幻">
        <input
          type="checkbox"
          :checked="rainbow"
          :disabled="disabled"
          @change="toggleRainbow"
        />
        <span class="rainbow-track"><span class="rainbow-thumb"></span></span>
        <span class="rainbow-label">彩虹</span>
      </label>
    </div>

    <div class="color-editor-bottom">
      <label class="color-picker">
        <input
          type="color"
          :value="modelValue"
          :disabled="disabled"
          aria-label="自定义颜色"
          @input="select($event.target.value)"
        />
        <span
          class="picker-swatch"
          :class="{ 'is-rainbow': rainbow }"
          :style="rainbow ? undefined : { background: modelValue }"
        ></span>
        <span class="picker-hex">{{ modelValue }}</span>
      </label>
      <span class="color-note">{{ rainbow ? '起始色 · GIF 中持续变幻' : '自定义颜色' }}</span>
    </div>
  </div>
</template>
