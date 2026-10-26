<script setup lang="ts">
import { registry } from '~/games';
import jouerADeux from '~/assets/illustrations/jouer-a-deux.svg';

const games = registry.list();

function play(key: string): void {
  void navigateTo(`/play/${key}`);
}
</script>

<template>
  <VContainer class="home py-8">
    <section class="hero">
      <AtomFullscreenToggle inline color="white" class="hero__fullscreen" />
      <div class="hero__decor" aria-hidden="true">
        <AtomShapeArcs color="#FFCC5C" class="hero__shape hero__shape--arcs" />
      </div>
      <div class="hero__content">
        <h1 class="hero__title">Gambette</h1>
        <p class="hero__tagline">
          Des jeux pour s'entraîner au calcul, en solo, en équipe ou en s'affrontant, toujours en
          s'amusant&nbsp;!
        </p>
      </div>
      <img
        class="hero__art"
        :src="jouerADeux"
        alt="Un adulte et un enfant jouent face à face sur le même téléphone posé sur une table"
      />
    </section>

    <section class="games">
      <h2 class="games__heading">Choisis ton jeu</h2>
      <OrganismGameGrid :games="games" @play="play" />
    </section>
  </VContainer>
</template>

<style scoped>
.home {
  max-width: 1100px;
}

/* ---------- Hero ---------- */
.hero {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  padding: 40px 36px;
  margin-bottom: 40px;
  color: #fff;
  background: #00274b; /* Oxford Blue, couleur pleine */
  box-shadow: 0 24px 60px -28px rgba(0, 39, 75, 0.7);
}
/* Illustration sous le texte sur téléphone, à droite sur grand écran. */
@media (min-width: 760px) {
  .hero {
    display: grid;
    grid-template-columns: 1fr minmax(0, 360px);
    align-items: center;
    gap: 24px;
  }
}

/* Habillage de marque : petites formes géométriques (jaune / violet / blanc),
   dispersées derrière le contenu. La couleur est portée par chaque composant. */
.hero__decor {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.hero__shape {
  position: absolute;
}
/* Arcs jaunes : gros accent débordant du coin bas-droite. On le déborde
   (offsets négatifs) pour que le point d'origine (bas-gauche de la forme) et les
   pointes (haut-droite) soient rognés par l'overflow:hidden du hero ; seules les
   courbes traversent le coin visible. */
.hero__shape--arcs {
  right: -140px;
  bottom: -70px;
  width: 400px;
  height: 400px;
  transform: rotate(7deg); /* penche de 10° dans le sens horaire */
}

.hero__fullscreen {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: 2;
}
.hero__content {
  position: relative;
  z-index: 1;
}
.hero__art {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  max-width: 360px;
  margin: 0 auto;
}
.hero__title {
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: clamp(2rem, 4vw, 2.9rem);
  line-height: 1.05;
  letter-spacing: -0.01em;
}
.hero__tagline {
  max-width: 46ch;
  margin: 16px 0 22px;
  font-size: 1.05rem;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.88);
}
.games__heading {
  margin-bottom: 16px;
  font-family: 'Raleway', sans-serif;
  font-weight: 800;
  font-size: 1.6rem;
  color: rgb(var(--v-theme-primary));
}
</style>
