<script setup lang="ts">
import type { GameModule } from '@gambette/game-sdk';
const props = defineProps<{ games: GameModule[] }>();
const emit = defineEmits<{ play: [key: string] }>();
</script>

<template>
  <!-- Deux colonnes, sur téléphone comme sur grand écran. -->
  <div class="game-grid">
    <MoleculeGameCard
      v-for="(g, i) in props.games"
      :key="g.meta.key"
      :meta="g.meta"
      :index="i"
      @play="emit('play', $event)"
    />
  </div>
</template>

<style scoped>
.game-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(12px, 3vw, 28px);
  max-width: 760px;
}
</style>
