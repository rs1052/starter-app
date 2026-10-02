import { html } from "hono/html";

export interface FormFieldOptions {
  autocomplete: string;
  label: string;
  maxLength: number;
  name: string;
  type?: "email" | "password" | "text";
  value?: string;
}

export function FormField(options: FormFieldOptions) {
  return html`<div class="field">
    <label for="${options.name}">${options.label}</label>
    <input
      id="${options.name}"
      name="${options.name}"
      type="${options.type ?? "text"}"
      autocomplete="${options.autocomplete}"
      maxlength="${options.maxLength}"
      value="${options.value ?? ""}"
      required
    />
  </div>`;
}
