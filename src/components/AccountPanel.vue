<script setup lang="ts">
import FormField from "./FormField.vue";
import StatusMessage from "./StatusMessage.vue";
defineProps<{
  user: { name: string; email: string };
  error: string;
  success: boolean;
}>();
</script>

<template>
  <section class="narrow">
    <p class="eyebrow">Protected page</p>
    <h1>Your account</h1>
    <dl class="account-details">
      <div>
        <dt>Name</dt>
        <dd>{{ user.name }}</dd>
      </div>
      <div>
        <dt>Email</dt>
        <dd>{{ user.email }}</dd>
      </div>
    </dl>
    <form method="post" action="/account/password" class="stack">
      <h2>Change password</h2>
      <StatusMessage v-if="error" error>{{ error }}</StatusMessage>
      <StatusMessage v-if="success"
        >Your password has been changed. Other sessions have been signed
        out.</StatusMessage
      >
      <FormField
        name="currentPassword"
        label="Current password"
        type="password"
        autocomplete="current-password"
        :max-length="128"
      />
      <FormField
        name="newPassword"
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
      <button type="submit" class="button">Change password</button>
    </form>
    <form method="post" action="/sign-out">
      <button type="submit" class="button">Sign out</button>
    </form>
  </section>
</template>
