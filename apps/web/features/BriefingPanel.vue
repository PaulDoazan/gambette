<script setup lang="ts">
import type { GameMeta } from '@gambette/game-sdk';
import type { TutorialStep } from '~/lib/gameTutorials';

// `accent` : couleur du bandeau du titre sur la vignette du menu, reprise ici pour la continuité.
withDefaults(
  defineProps<{
    meta: GameMeta;
    accent?: string;
    icon?: string;
    tutorial?: readonly TutorialStep[];
  }>(),
  {
    accent: '#00274b',
    icon: 'mdi-gamepad-variant',
    tutorial: () => [],
  },
);
const emit = defineEmits<{ play: [] }>();
</script>

<template>
  <VContainer class="briefing" :style="{ '--accent': accent }">
    <MoleculeScreenHeader show-back back-to="/" />

    <header class="briefing__header">
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
      :color="accent"
      size="x-large"
      rounded="pill"
      prepend-icon="mdi-play"
      @click="emit('play')"
    >
      Jouer
    </VBtn>

    <section v-if="tutorial.length" class="tuto" aria-labelledby="tuto-title">
      <h2 id="tuto-title" class="tuto__title">Comment jouer</h2>
      <ol class="tuto__steps">
        <li v-for="(step, i) in tutorial" :key="i" class="tuto__step">
          <img class="tuto__shot" :src="step.image" alt="" loading="lazy" />
          <p class="tuto__text">
            <span class="tuto__num" aria-hidden="true">{{ i + 1 }}</span>
            {{ step.text }}
          </p>
        </li>
      </ol>
    </section>
  </VContainer>
</template>

<style scoped>
/* Mode sombre : couleur du jeu éclaircie pour les titres, lisible sur le fond. */
.briefing {
  --accent-text: var(--accent);
}
.v-theme--dark .briefing {
  --accent-text: color-mix(in srgb, var(--accent) 55%, white);
}
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
  color: var(--accent-text);
}
.briefing__instructions {
  margin-top: 4px;
  color: rgba(var(--v-theme-ink), 0.78);
  line-height: 1.5;
}
/* Jouer désormais seul à cet emplacement : on le met en avant (font + relief). */
.briefing__play {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  letter-spacing: 0.02em;
  padding-inline: 32px;
}

/* ---------- Tutoriel : captures du jeu et texte court ---------- */
.tuto {
  margin-top: 40px;
}
.tuto__title {
  margin-bottom: 16px;
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: 1.4rem;
  color: var(--accent-text);
}
.tuto__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 0;
  list-style: none;
}
.tuto__step {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.tuto__shot {
  /* Captures en portrait ou en paysage : le cadre épouse l'image, centrée. */
  display: block;
  align-self: center;
  width: auto;
  max-width: 100%;
  height: auto;
  max-height: 420px;
  border-radius: 18px;
  border: 4px solid var(--accent);
}
.tuto__text {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  line-height: 1.45;
  color: rgba(var(--v-theme-ink), 0.85);
}
.tuto__num {
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: 0.95rem;
}
</style>
