export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/fonts', 'vuetify-nuxt-module'],
  components: [{ path: '~/components' }, { path: '~/features' }],
  css: ['~/assets/css/theme.css'],
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
        defaultTheme: 'light',
        themes: {
          light: {
            colors: {
              primary: '#00274B',
              secondary: '#FF7D6D',
              tertiary: '#9566FF',
              warning: '#FFCC5C',
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
