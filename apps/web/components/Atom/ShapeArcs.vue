<script setup lang="ts">
// Forme de marque LeHibou : trois arcs liés (arcs concentriques ouverts vers le
// bas). Couleur paramétrable.
withDefaults(defineProps<{ color?: string; strokeWidth?: number }>(), {
  color: 'currentColor',
  strokeWidth: 7,
});
</script>

<template>
  <svg
    class="brand-shape"
    viewBox="0 0 100 100"
    fill="none"
    :stroke="color"
    :stroke-width="strokeWidth"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Un arc de base (origine en bas à gauche, ventre vers le bas à droite),
         répété par rotation de pas constant (14°) autour de l'origine 12 92 :
         l'angle entre chaque arc est donc strictement identique. -->
    <path d="M12 92 A64 64 0 0 0 92 56" />
    <path d="M12 92 A64 64 0 0 0 92 56" transform="rotate(-14 12 92)" />
    <path d="M12 92 A64 64 0 0 0 92 56" transform="rotate(-28 12 92)" />
  </svg>
</template>

<style scoped>
.brand-shape {
  display: block;
  overflow: visible;
}
</style>
