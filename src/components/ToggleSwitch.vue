<script setup>
defineProps({
  modelValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  label: { type: String, default: '切换' },
})

defineEmits(['update:modelValue'])
</script>

<template>
  <span class="switch" :class="{ 'is-on': modelValue, 'is-disabled': disabled }">
    <input
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :aria-label="label"
      @change="$emit('update:modelValue', $event.target.checked)"
    />
    <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
  </span>
</template>
