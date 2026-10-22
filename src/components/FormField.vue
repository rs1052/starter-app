<script setup lang="ts">
import { onBeforeMount, onMounted } from "vue";

const props = withDefaults(
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

let inputBeforeHydration = "";

onBeforeMount(() => {
  const input = document.getElementById(props.name) as HTMLInputElement | null;
  inputBeforeHydration = input?.value ?? "";
});

onMounted(() => {
  const input = document.getElementById(props.name) as HTMLInputElement | null;
  // Hydration can clear text entered before the client mounts.
  if (input && inputBeforeHydration && input.value !== inputBeforeHydration) {
    input.value = inputBeforeHydration;
  }
});
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
