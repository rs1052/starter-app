<script setup lang="ts">
import FormField from "../src/components/FormField.vue";
import StatusMessage from "../src/components/StatusMessage.vue";
defineProps<{ token: string; error: string; success: boolean }>();
</script>

<template>
  <section class="narrow">
    <template v-if="success">
      <p class="eyebrow">Password updated</p>
      <h1>Your password has been reset</h1>
      <StatusMessage>You can now sign in with your new password.</StatusMessage>
      <p><a href="/sign-in">Sign in</a></p>
    </template>
    <template v-else>
      <p class="eyebrow">Account recovery</p>
      <h1>Choose a new password</h1>
      <StatusMessage v-if="error" error>{{ error }}</StatusMessage>
      <form v-if="token" method="post" action="/reset-password" class="stack">
        <input type="hidden" name="token" :value="token" />
        <FormField
          name="password"
          label="New password"
          type="password"
          autocomplete="new-password"
          :max-length="128"
        />
        <FormField
          name="passwordConfirmation"
          label="Confirm new password"
          type="password"
          autocomplete="new-password"
          :max-length="128"
        />
        <button type="submit" class="button">Reset password</button>
      </form>
      <p v-else><a href="/forgot-password">Request a new reset link</a></p>
    </template>
  </section>
</template>
