<script setup lang="ts">
import { computed } from 'vue';
import type { GameMeta } from '@gambette/game-sdk';
import { gameCosmetic } from '~/lib/gameCosmetics';
import { playersBadge } from '~/lib/players';

const props = defineProps<{ meta: GameMeta; index?: number }>();
const emit = defineEmits<{ play: [key: string] }>();

const cosmetic = computed(() => gameCosmetic(props.meta.key, props.index ?? 0));
const players = computed(() => playersBadge(props.meta.players));
</script>

<template>
  <!-- Toute la carte lance le jeu : grande vignette, titre en bandeau, pastille des joueurs. -->
  <button
    type="button"
    class="game-card"
    :style="{ '--stagger': `${(props.index ?? 0) * 90}ms`, '--band': cosmetic.band }"
    :aria-label="`${props.meta.name}, ${players.label}`"
    @click="emit('play', props.meta.key)"
  >
    <span class="game-card__frame">
      <img v-if="cosmetic.thumbnail" class="game-card__thumb" :src="cosmetic.thumbnail" alt="" />
      <span
        v-else
        class="game-card__thumb game-card__thumb--emblem"
        :style="{ background: `rgb(var(--v-theme-${cosmetic.color}))` }"
      >
        <VIcon :icon="cosmetic.icon" size="72" />
      </span>

      <span class="game-card__players" aria-hidden="true">
        <VIcon icon="mdi-account" size="20" />
        <span v-if="players.mark" class="game-card__mark">{{ players.mark }}</span>
        <VIcon v-if="players.people === 2" icon="mdi-account" size="20" />
      </span>

      <span class="game-card__title">{{ props.meta.name }}</span>
    </span>
  </button>
</template>

<style scoped>
.game-card {
  display: block;
  width: 100%;
  padding: 7px;
  border: none;
  border-radius: 30px;
  background: #fff;
  cursor: pointer;
  box-shadow: 0 10px 24px -14px rgba(0, 39, 75, 0.45);
  transition:
    transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1),
    box-shadow 0.22s ease;
  /* Entrée en cascade au chargement (animation-delay par carte). */
  animation: card-rise 0.5s both;
  animation-delay: var(--stagger, 0ms);
}
.game-card:focus-visible {
  outline: 3px solid #ffcc5c;
  outline-offset: 3px;
}

@media (hover: hover) {
  .game-card:hover {
    transform: translateY(-6px);
    box-shadow: 0 18px 38px -16px rgba(0, 39, 75, 0.5);
  }
}

.game-card__frame {
  position: relative;
  display: block;
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 24px;
}
.game-card__thumb {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.game-card__thumb--emblem {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

/* Joueurs : une personne (seul), ou deux avec « 1v1 » (duel) ou « 1+1 » (équipe). */
.game-card__players {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: #00274b;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
}
.game-card__mark {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: 0.9rem;
  padding: 0 1px;
  text-transform: none;
}

/* Titre en bandeau, posé en bas de la vignette. */
.game-card__title {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24%;
  padding: 8px 10px;
  border-radius: 22px 22px 0 0;
  background: var(--band);
  color: #fff;
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: clamp(0.95rem, 4vw, 1.35rem);
  line-height: 1.1;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

@keyframes card-rise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .game-card {
    animation: none;
  }
  .game-card:hover {
    transform: none;
  }
}
</style>
