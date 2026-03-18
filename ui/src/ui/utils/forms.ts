/**
 * B4: Shared form field handler utility for all TAURA views.
 * Type-safe event handlers for form inputs.
 */

type InputElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/**
 * Create a type-safe field change handler for form objects.
 * Usage: onField(formFields)("name")(event)
 */
export function onField<T extends Record<string, unknown>>(fields: T) {
  return (field: keyof T) => (e: Event) => {
    const target = e.target as InputElement;
    if (target.type === "checkbox") {
      (fields as Record<string, unknown>)[field as string] = (target as HTMLInputElement).checked;
    } else {
      (fields as Record<string, unknown>)[field as string] = target.value;
    }
  };
}

/**
 * Reset a form fields object to its default values.
 */
export function resetFields<T extends Record<string, unknown>>(fields: T, defaults: T): void {
  for (const key of Object.keys(defaults)) {
    (fields as Record<string, unknown>)[key] = defaults[key];
  }
}
