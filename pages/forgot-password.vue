<script setup lang="ts">
import FormField from "../src/components/FormField.vue";
import StatusMessage from "../src/components/StatusMessage.vue";
defineProps<{ email: string; error: string; sent: boolean }>();
</script>

<template>
  <section class="narrow">
    <template v-if="sent">
      <p class="eyebrow">Check your email</p>
      <h1>Reset link requested</h1>
      <StatusMessage
        >If an account exists for that email, a password reset link is on its
        way.</StatusMessage
      >
    </template>
    <template v-else>
      <p class="eyebrow">Account recovery</p>
      <h1>Forgot your password?</h1>
      <p>Enter your email and we will send you a reset link.</p>
      <StatusMessage v-if="error" error>{{ error }}</StatusMessage>
      <form method="post" action="/forgot-password" class="stack">
        <FormField
          name="email"
          label="Email"
          type="email"
          autocomplete="email"
          :max-length="254"
          :value="email"
        />
        <button type="submit" class="button">Send reset link</button>
      </form>
    </template>
    <p><a href="/sign-in">Return to sign in</a></p>
  </section>
</template>
