<script setup lang="ts">
import { computed } from 'vue';
import { shouldShowFullscreenToggle } from '~/composables/useFullscreen';

// Bouton plein écran applicatif (mobile), affiché sur toutes les interfaces HORS
// partie en cours (le jeu a son propre bouton). Cible la racine du document, donc
// l'état plein écran reste cohérent d'un écran à l'autre.
// `inline` : intégré dans le flux (header) au lieu d'être posé en fixe en haut à droite.
withDefaults(defineProps<{ inline?: boolean }>(), { inline: false });

const { isFullscreen, isSupported, isMobile, toggle } = useFullscreen();
const session = useGameSession();

const visible = computed(() =>
  shouldShowFullscreenToggle(isSupported.value, isMobile.value, session.state.phase),
);
</script>

<template>
  <VBtn
    v-if="visible"
    :class="['fullscreen-toggle', { 'fullscreen-toggle--inline': inline }]"
    :icon="isFullscreen ? 'mdi-fullscreen-exit' : 'mdi-fullscreen'"
    size="small"
    variant="tonal"
    color="primary"
    :aria-label="isFullscreen ? 'Quitter le plein écran' : 'Plein écran'"
    :title="isFullscreen ? 'Quitter le plein écran' : 'Plein écran'"
    @click="toggle"
  />
</template>

<style scoped>
.fullscreen-toggle:not(.fullscreen-toggle--inline) {
  position: fixed;
  top: 12px;
  right: 12px;
  z-index: 3000;
}
</style>
