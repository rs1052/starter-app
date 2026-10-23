<script setup lang="ts">
import { ref, watch } from "vue";
import StatusMessage from "../src/components/StatusMessage.vue";
const props = defineProps<{ updated: boolean }>();
const refreshed = ref(props.updated);
const pending = ref(false);
const error = ref("");
watch(
  () => props.updated,
  (value) => {
    refreshed.value = value;
  },
);

async function refresh(event: Event) {
  const form = event.target as HTMLFormElement;
  pending.value = true;
  error.value = "";
  try {
    const response = await fetch(form.action, {
      method: "POST",
      body: new FormData(form),
    });
    if (!response.ok) throw new Error("Refresh failed");
    refreshed.value = true;
  } catch {
    error.value = "The server could not be refreshed. Try again.";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <section>
    <p class="eyebrow">Progressive enhancement</p>
    <h1>Small browser interactions</h1>
    <div class="example-grid">
      <article>
        <h2>Vue server refresh</h2>
        <p>
          The form works as an ordinary request when JavaScript is unavailable.
        </p>
        <div id="server-status" class="example-result" aria-live="polite">
          {{
            refreshed
              ? "The server refresh completed."
              : "Ready for a server refresh."
          }}
        </div>
        <StatusMessage v-if="error" error>{{ error }}</StatusMessage>
        <form
          method="post"
          action="/examples/refresh"
          @submit.prevent="refresh"
        >
          <button type="submit" class="button" :disabled="pending">
            Refresh from server
          </button>
        </form>
      </article>
      <article>
        <h2>Native disclosure</h2>
        <details>
          <summary>Toggle details</summary>
          <p>This state stays entirely in the browser.</p>
        </details>
      </article>
    </div>
  </section>
</template>
