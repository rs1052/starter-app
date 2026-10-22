<script setup lang="ts">
import VerificationForm from "../src/components/VerificationForm.vue";
defineProps<{ email: string; error: string; sent: boolean }>();
</script>
<template>
  <VerificationForm :email="email" :error="error" :sent="sent" />
</template>
