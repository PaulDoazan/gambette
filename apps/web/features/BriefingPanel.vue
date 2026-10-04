<script setup lang="ts">
import { computed } from 'vue';
import type { GameMeta } from '@gambette/game-sdk';

const props = withDefaults(defineProps<{ meta: GameMeta; colorToken?: string; icon?: string }>(), {
  colorToken: 'primary',
  icon: 'mdi-gamepad-variant',
});
const emit = defineEmits<{ play: [] }>();

const accent = computed(() => `rgb(var(--v-theme-${props.colorToken}))`);
</script>

<template>
  <VContainer class="briefing">
    <MoleculeScreenHeader show-back back-to="/" />

    <header class="briefing__header" :style="{ '--accent': accent }">
      <div class="briefing__emblem">
        <VIcon :icon="icon" size="34" color="white" />
      </div>
      <div class="briefing__heading">
        <h1 class="briefing__title">{{ meta.name }}</h1>
        <p class="briefing__instructions">{{ meta.instructions }}</p>
      </div>
    </header>

    <VBtn
      class="briefing__play"
      :color="colorToken"
      size="x-large"
      rounded="pill"
      prepend-icon="mdi-play"
      @click="emit('play')"
    >
      Jouer
    </VBtn>
  </VContainer>
</template>

<style scoped>
.briefing__header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-left: 14px;
  border-left: 6px solid var(--accent);
  margin-bottom: 28px;
}
.briefing__emblem {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--accent);
  box-shadow: 0 10px 24px -12px var(--accent);
}
.briefing__title {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: clamp(1.5rem, 3vw, 2rem);
  line-height: 1.1;
  color: rgb(var(--v-theme-primary));
}
.briefing__instructions {
  margin-top: 4px;
  color: rgba(0, 39, 75, 0.78);
  line-height: 1.5;
}
/* Jouer désormais seul à cet emplacement : on le met en avant (font + relief). */
.briefing__play {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  letter-spacing: 0.02em;
  padding-inline: 32px;
}
</style>
