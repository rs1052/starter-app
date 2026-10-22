<script setup lang="ts">
import AccountPanel from "../../src/components/AccountPanel.vue";
defineProps<{
  user: { name: string; email: string };
  error: string;
  success: boolean;
}>();
</script>
<template>
  <AccountPanel :user="user" :error="error" :success="success" />
</template>
