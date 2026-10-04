import { ref, readonly, onMounted, onUnmounted, type Ref, type DeepReadonly } from 'vue';

// Préfixes WebKit (Safari/iOS) absents des types DOM standard.
type FsDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & { webkitRequestFullscreen?: () => Promise<void> | void };

/**
 * Décision d'affichage du bouton plein écran applicatif. Pur (testable hors
 * runtime) : visible seulement sur mobile, si l'API est dispo, et hors partie
 * en cours (le jeu a déjà son propre bouton plein écran pendant qu'on joue).
 */
export function shouldShowFullscreenToggle(
  supported: boolean,
  mobile: boolean,
  phase: string,
): boolean {
  return supported && mobile && phase !== 'playing';
}

export interface FullscreenApi {
  isFullscreen: DeepReadonly<Ref<boolean>>;
  isSupported: DeepReadonly<Ref<boolean>>;
  isMobile: DeepReadonly<Ref<boolean>>;
  toggle: () => Promise<void>;
}

/**
 * Plein écran applicatif, ciblant `document.documentElement` : l'état persiste
 * d'une route à l'autre (jeu → classement → autres écrans), contrairement à un
 * plein écran posé sur un élément démonté. À utiliser dans un composant (pose/
 * retire ses écouteurs au montage).
 */
export function useFullscreen(): FullscreenApi {
  const isFullscreen = ref(false);
  const isSupported = ref(false);
  const isMobile = ref(false);

  const readState = (): void => {
    const doc = document as FsDocument;
    isFullscreen.value = (doc.fullscreenElement ?? doc.webkitFullscreenElement) != null;
  };

  const toggle = async (): Promise<void> => {
    const doc = document as FsDocument;
    const el = document.documentElement as FsElement;
    try {
      if ((doc.fullscreenElement ?? doc.webkitFullscreenElement) != null) {
        await (doc.exitFullscreen ?? doc.webkitExitFullscreen)?.call(doc);
      } else {
        await (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
      }
    } catch {
      // Geste utilisateur refusé / non supporté : on ignore silencieusement.
    }
  };

  onMounted(() => {
    const el = document.documentElement as FsElement;
    isSupported.value =
      typeof el.requestFullscreen === 'function' ||
      typeof el.webkitRequestFullscreen === 'function';
    isMobile.value = window.matchMedia?.('(pointer: coarse)')?.matches ?? 'ontouchstart' in window;
    readState();
    document.addEventListener('fullscreenchange', readState);
    document.addEventListener('webkitfullscreenchange', readState);
  });

  onUnmounted(() => {
    document.removeEventListener('fullscreenchange', readState);
    document.removeEventListener('webkitfullscreenchange', readState);
  });

  return {
    isFullscreen: readonly(isFullscreen),
    isSupported: readonly(isSupported),
    isMobile: readonly(isMobile),
    toggle,
  };
}
