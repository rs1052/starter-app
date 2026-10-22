<script setup lang="ts">
import AppHeader from "../src/components/AppHeader.vue";
</script>

<template>
  <AppHeader />
  <main id="main" class="shell"><slot /></main>
</template>
