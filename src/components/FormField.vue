<script setup lang="ts">
withDefaults(
  defineProps<{
    autocomplete: string;
    label: string;
    maxLength: number;
    name: string;
    type?: "email" | "password" | "text";
    value?: string;
  }>(),
  { type: "text", value: "" },
);
</script>

<template>
  <div class="field">
    <label :for="name">{{ label }}</label>
    <input
      :id="name"
      :name="name"
      :type="type"
      :autocomplete="autocomplete"
      :maxlength="maxLength"
      :value="value"
      required
    />
  </div>
</template>
