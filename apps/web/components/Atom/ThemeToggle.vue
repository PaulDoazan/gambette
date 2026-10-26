<script setup lang="ts">
// Bouton clair / sombre, à côté du plein écran. `color` : token ou couleur
// Vuetify (ex. `white` sur un fond sombre).
withDefaults(defineProps<{ color?: string }>(), { color: 'primary' });

const { isDark, toggle } = useColorMode();
</script>

<template>
  <VBtn
    :icon="isDark ? 'mdi-white-balance-sunny' : 'mdi-weather-night'"
    size="small"
    variant="tonal"
    :color="color"
    :aria-label="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
    :title="isDark ? 'Passer en mode clair' : 'Passer en mode sombre'"
    @click="toggle"
  />
</template>
