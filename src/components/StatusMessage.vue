<script setup lang="ts">
withDefaults(defineProps<{ error?: boolean }>(), { error: false });
</script>

<template>
  <p
    :class="['message', error ? 'message-error' : 'message-status']"
    :role="error ? 'alert' : 'status'"
  >
    <slot />
  </p>
</template>
