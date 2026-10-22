<script setup lang="ts">
import { computed } from "vue";
import FormField from "./FormField.vue";
import StatusMessage from "./StatusMessage.vue";
import VerificationForm from "./VerificationForm.vue";

const props = defineProps<{
  mode: "sign-in" | "sign-up";
  email: string;
  error: string;
  success: string;
  sent: boolean;
}>();

const isSignup = computed(() => props.mode === "sign-up");
const copy = computed(() =>
  isSignup.value
    ? {
        eyebrow: "Get started",
        heading: "Create your account",
        passwordAutocomplete: "new-password",
        submit: "Create account",
        switchPrompt: "Already have an account?",
        switchLabel: "Sign in",
        switchHref: "/sign-in",
      }
    : {
        eyebrow: "Welcome back",
        heading: "Sign in",
        passwordAutocomplete: "current-password",
        submit: "Sign in",
        switchPrompt: "Need an account?",
        switchLabel: "Sign up",
        switchHref: "/sign-up",
      },
);
</script>

<template>
  <VerificationForm v-if="sent" :email="email" :error="error" :sent="sent" />
  <section v-else class="narrow">
    <p class="eyebrow">{{ copy.eyebrow }}</p>
    <h1>{{ copy.heading }}</h1>
    <StatusMessage v-if="error" error>{{ error }}</StatusMessage>
    <StatusMessage v-if="success">{{ success }}</StatusMessage>
    <form method="post" :action="`/${mode}`" class="stack">
      <FormField
        v-if="isSignup"
        name="name"
        label="Name"
        autocomplete="name"
        :max-length="100"
      />
      <FormField
        name="email"
        label="Email"
        type="email"
        autocomplete="email"
        :max-length="254"
        :value="email"
      />
      <FormField
        name="password"
        label="Password"
        type="password"
        :autocomplete="copy.passwordAutocomplete"
        :max-length="128"
      />
      <button type="submit" class="button">{{ copy.submit }}</button>
    </form>
    <p>
      {{ copy.switchPrompt }}
      <a :href="copy.switchHref">{{ copy.switchLabel }}</a>
    </p>
    <template v-if="!isSignup">
      <p><a href="/forgot-password">Forgot your password?</a></p>
      <p><a href="/verify-email">Resend verification email</a></p>
    </template>
  </section>
</template>
