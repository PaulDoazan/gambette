export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/fonts', 'vuetify-nuxt-module'],
  components: [{ path: '~/components' }, { path: '~/features' }],
  css: ['~/assets/css/theme.css'],
  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Gambette',
    },
  },
  // Polices auto-hébergées au build (pas de requête CDN au runtime).
  fonts: {
    families: [
      { name: 'Raleway', provider: 'google', weights: [500, 600, 700, 800] },
      { name: 'Montserrat', provider: 'google', weights: [400, 500, 600, 700] },
    ],
  },
  vuetify: {
    moduleOptions: {},
    vuetifyOptions: {
      theme: {
        // Suit le réglage clair / sombre du système ; le bouton soleil/lune peut
        // forcer l'un ou l'autre (plugins/colorMode.client.ts).
        defaultTheme: 'system',
        themes: {
          light: {
            colors: {
              primary: '#00274B',
              secondary: '#FF7D6D',
              tertiary: '#9566FF',
              warning: '#FFCC5C',
              // Couleur des textes courants (rgba(var(--v-theme-ink), opacité)).
              ink: '#00274B',
            },
          },
          dark: {
            dark: true,
            colors: {
              background: '#07111F',
              surface: '#0F1E33',
              primary: '#A9C8F5',
              secondary: '#FF7D6D',
              tertiary: '#9566FF',
              warning: '#FFCC5C',
              ink: '#E6EEF8',
            },
          },
        },
      },
    },
  },
  typescript: {
    typeCheck: false,
  },
  compatibilityDate: '2026-06-11',
});
