<script setup lang="ts">
import { computed } from 'vue';
import type { GameMeta } from '@gambette/game-sdk';
import { gameCosmetic } from '~/lib/gameCosmetics';

const props = defineProps<{ meta: GameMeta; index?: number }>();
const emit = defineEmits<{ play: [key: string] }>();

const cosmetic = computed(() => gameCosmetic(props.meta.key, props.index ?? 0));
</script>

<template>
  <VCard
    class="game-card"
    :style="{ '--stagger': `${(props.index ?? 0) * 90}ms` }"
    rounded="xl"
    elevation="3"
    height="100%"
  >
    <!-- Bandeau de marque : couleur du jeu + emblème -->
    <div class="game-card__banner" :style="{ background: `rgb(var(--v-theme-${cosmetic.color}))` }">
      <VIcon :icon="cosmetic.icon" class="game-card__emblem" size="60" />
    </div>

    <VCardItem class="pb-1">
      <VCardTitle class="game-card__title">{{ props.meta.name }}</VCardTitle>
    </VCardItem>

    <VCardText class="game-card__body">
      <p class="game-card__desc">{{ props.meta.description }}</p>

      <div class="game-card__badges">
        <VChip
          v-for="trait in cosmetic.traits"
          :key="trait"
          class="game-card__trait"
          size="small"
          color="warning"
          variant="flat"
          prepend-icon="mdi-star-four-points"
        >
          {{ trait }}
        </VChip>
      </div>
    </VCardText>

    <VCardActions class="game-card__actions">
      <VBtn
        class="game-card__cta"
        :color="cosmetic.color"
        variant="flat"
        rounded="pill"
        size="large"
        block
        append-icon="mdi-arrow-right"
        @click="emit('play', props.meta.key)"
      >
        Jouer
      </VBtn>
    </VCardActions>
  </VCard>
</template>

<style scoped>
.game-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition:
    transform 0.22s cubic-bezier(0.2, 0.7, 0.3, 1),
    box-shadow 0.22s ease;
  /* Entrée en cascade au chargement (animation-delay par carte). */
  animation: card-rise 0.5s both;
  animation-delay: var(--stagger, 0ms);
}

@media (hover: hover) {
  .game-card:hover {
    transform: translateY(-8px);
    box-shadow: 0 18px 38px -16px rgba(0, 39, 75, 0.5);
  }
}

.game-card__banner {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 116px;
  color: #fff;
}
.game-card__emblem {
  position: relative;
  filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.22));
}
.game-card__title {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: 1.3rem;
}
.game-card__body {
  flex: 1 1 auto;
}
.game-card__desc {
  color: rgba(0, 39, 75, 0.82);
  line-height: 1.5;
}
.game-card__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}
/* Pastille caractéristique : fond jaune charte, texte Oxford Blue pour le contraste. */
.game-card__trait {
  color: #00274b;
  font-weight: 600;
}
.game-card__actions {
  padding: 12px 16px 18px;
}
.game-card__cta {
  font-family: 'Raleway', sans-serif;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: none;
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
