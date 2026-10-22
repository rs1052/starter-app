<script setup lang="ts">
import CredentialsForm from "../src/components/CredentialsForm.vue";
defineProps<{
  mode: "sign-in" | "sign-up";
  email: string;
  error: string;
  success: string;
  sent: boolean;
}>();
</script>
<template>
  <CredentialsForm
    :mode="mode"
    :email="email"
    :error="error"
    :success="success"
    :sent="sent"
  />
</template>
