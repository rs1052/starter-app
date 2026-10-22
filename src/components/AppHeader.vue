<script setup lang="ts">
import { useShared } from "@void/vue";
const shared = useShared<{ signedIn: boolean }>();
// Void 1.2.0's Link adds inline styles. Ordinary links preserve the strict CSP.
</script>

<template>
  <header class="site-header">
    <a class="skip-link" href="#main">Skip to content</a>
    <div class="shell header-inner">
      <a class="brand" href="/">Hono starter</a>
      <nav aria-label="Primary">
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/examples">Examples</a></li>
          <li v-if="shared.signedIn"><a href="/account">Account</a></li>
          <template v-else>
            <li><a href="/sign-in">Sign in</a></li>
            <li><a href="/sign-up">Sign up</a></li>
          </template>
        </ul>
      </nav>
    </div>
  </header>
</template>
