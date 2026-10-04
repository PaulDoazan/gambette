<script setup lang="ts">
import type { GameModule } from '@gambette/game-sdk';
const props = defineProps<{ games: GameModule[] }>();
const emit = defineEmits<{ play: [key: string] }>();
</script>

<template>
  <VRow>
    <VCol v-for="(g, i) in props.games" :key="g.meta.key" cols="12" sm="6" md="4">
      <MoleculeGameCard :meta="g.meta" :index="i" @play="emit('play', $event)" />
    </VCol>
  </VRow>
</template>
