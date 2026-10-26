import { loadThemeChoice } from '~/composables/useColorMode';

// Par défaut, Vuetify suit le système (defaultTheme 'system') ; un choix fait avec
// le bouton soleil/lune, mémorisé, est réappliqué dès le démarrage.
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('vuetify:ready', (vuetify) => {
    const stored = loadThemeChoice();
    if (stored) void vuetify.theme.change(stored);
  });
});
