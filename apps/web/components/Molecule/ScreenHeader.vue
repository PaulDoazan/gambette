<script setup lang="ts">
// Header commun aux écrans hors-jeu (accueil, classement, fin de partie) :
// « Retour » à gauche, plein écran à droite, puis un séparateur avant le contenu.
// Deux modes de retour : navigation directe via `backTo`, ou émission de `back`
// laissée au parent (ex. GameOverPanel a une confirmation avant de quitter).
withDefaults(
  defineProps<{
    showBack?: boolean;
    backTo?: string;
  }>(),
  { showBack: false, backTo: undefined },
);
const emit = defineEmits<{ back: [] }>();
</script>

<template>
  <div class="screen-header">
    <div class="screen-header__bar">
      <VBtn
        v-if="showBack && backTo"
        variant="outlined"
        rounded="pill"
        prepend-icon="mdi-arrow-left"
        :to="backTo"
      >
        Retour
      </VBtn>
      <VBtn
        v-else-if="showBack"
        variant="outlined"
        rounded="pill"
        prepend-icon="mdi-arrow-left"
        @click="emit('back')"
      >
        Retour
      </VBtn>

      <VSpacer />

      <AtomFullscreenToggle inline />
    </div>
    <VDivider class="screen-header__divider" />
  </div>
</template>

<style scoped>
.screen-header__bar {
  display: flex;
  align-items: center;
}
.screen-header__divider {
  margin: 12px 0 24px;
}
</style>
