<script setup lang="ts">
import AccountPanel from "../../src/components/AccountPanel.vue";
defineProps<{
  user: { name: string; email: string } | null;
  error: string;
  success: boolean;
}>();
</script>
<template>
  <AccountPanel v-if="user" :user="user" :error="error" :success="success" />
  <section v-else>
    <h1>Page not found</h1>
    <p>The requested page does not exist.</p>
    <a href="/">Return home</a>
  </section>
</template>
