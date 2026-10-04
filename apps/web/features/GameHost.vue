<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { GameContext, GameModule } from '@gambette/game-sdk';
import { startGame, type RunningGame } from '~/lib/mountGame';

const props = defineProps<{ module: GameModule; ctx: GameContext }>();
const emit = defineEmits<{ back: [] }>();
const host = ref<HTMLElement>();
const status = ref<'loading' | 'ready' | 'error'>('loading');
let running: RunningGame | null = null;

onMounted(() => {
  if (!host.value) return;
  running = startGame(props.module, host.value, props.ctx, {
    onReady: () => {
      status.value = 'ready';
    },
    onError: (e) => {
      console.error('[GameHost] échec du montage du jeu', e);
      status.value = 'error';
    },
  });
});
onBeforeUnmount(() => {
  running?.stop();
  running = null;
});
</script>

<template>
  <div class="game-host">
    <div ref="host" class="game-host__stage" />
    <div v-if="status === 'loading'" class="game-host__overlay">
      <VProgressCircular indeterminate color="white" size="48" width="4" />
    </div>
    <div v-else-if="status === 'error'" class="game-host__overlay">
      <p class="game-host__error">Le jeu n'a pas pu se charger.</p>
      <VBtn color="secondary" rounded="pill" prepend-icon="mdi-arrow-left" @click="emit('back')">
        Retour
      </VBtn>
    </div>
  </div>
</template>

<style scoped>
.game-host {
  position: fixed;
  inset: 0;
  background: #111;
  z-index: 2000;
}
.game-host__stage {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.game-host__overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: #fff;
}
.game-host__error {
  font-size: 1.1rem;
}
</style>
