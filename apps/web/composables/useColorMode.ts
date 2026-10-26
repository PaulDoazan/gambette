import { computed, type ComputedRef } from 'vue';
import { useTheme } from 'vuetify';

export type ThemeName = 'light' | 'dark';

/** Choix clair / sombre fait avec le bouton, gardé d'une visite à l'autre. */
export const THEME_KEY = 'gambette.theme';

const isThemeName = (v: unknown): v is ThemeName => v === 'light' || v === 'dark';

export function loadThemeChoice(): ThemeName | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isThemeName(v) ? v : null;
  } catch {
    return null; // stockage indisponible (navigation privée…) : on suit le système
  }
}

export function saveThemeChoice(name: ThemeName): void {
  try {
    localStorage.setItem(THEME_KEY, name);
  } catch {
    // Stockage indisponible : le choix vaut pour cette visite seulement.
  }
}

export interface ColorModeApi {
  isDark: ComputedRef<boolean>;
  toggle: () => void;
}

/** Bascule clair / sombre (dans un composant) : le choix devient prioritaire sur le système. */
export function useColorMode(): ColorModeApi {
  const theme = useTheme();
  const isDark = computed(() => theme.global.current.value.dark);
  const toggle = (): void => {
    const next: ThemeName = isDark.value ? 'light' : 'dark';
    saveThemeChoice(next);
    void theme.change(next);
  };
  return { isDark, toggle };
}
