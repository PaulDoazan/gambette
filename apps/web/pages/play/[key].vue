<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue';
import type { GameContext } from '@gambette/game-sdk';
import { registry } from '~/games';
import { gameCosmetic } from '~/lib/gameCosmetics';

const route = useRoute();
const key = route.params.key as string;
const gameModule = registry.get(key);
const cosmetic = computed(() => gameCosmetic(key));
const session = useGameSession();

const ctx: GameContext = {
  locale: 'fr',
  // Bouton « quitter » in-game : retour au briefing (démonte le jeu).
  onExit: () => session.backToBriefing(),
};

// Phase globale : toujours repartir du briefing avant le premier rendu (sinon une
// phase 'playing' résiduelle monte puis démonte GameHost), et la réinitialiser en
// quittant la page (retour navigateur pendant la partie).
session.backToBriefing();

onMounted(() => {
  if (!gameModule) void navigateTo('/', { replace: true });
});
onBeforeUnmount(() => session.backToBriefing());
</script>

<template>
  <template v-if="gameModule">
    <GameHost
      v-if="session.state.phase === 'playing'"
      :module="gameModule"
      :ctx="ctx"
      @back="session.backToBriefing()"
    />
    <BriefingPanel
      v-else
      :meta="gameModule.meta"
      :color-token="cosmetic.color"
      :icon="cosmetic.icon"
      @play="session.startPlaying()"
    />
  </template>
</template>
