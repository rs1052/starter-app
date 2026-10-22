<script setup lang="ts">
import FormField from "./FormField.vue";
import StatusMessage from "./StatusMessage.vue";
defineProps<{ email: string; error: string; sent: boolean }>();
</script>

<template>
  <section class="narrow">
    <h1>{{ sent ? "Check your email" : "Resend verification email" }}</h1>
    <StatusMessage v-if="sent"
      >If this address belongs to an account that needs verification, check your
      email for a verification link.</StatusMessage
    >
    <p v-else>
      Request a new link if your verification email is missing or expired.
    </p>
    <StatusMessage v-if="error" error>{{ error }}</StatusMessage>
    <form method="post" action="/verify-email" class="stack">
      <FormField
        name="email"
        label="Email"
        type="email"
        autocomplete="email"
        :max-length="254"
        :value="email"
      />
      <button type="submit" class="button">Send verification link</button>
    </form>
    <p><a href="/sign-in">Return to sign in</a></p>
  </section>
</template>
