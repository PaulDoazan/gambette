export interface GameContext {
  /** Mise à jour live du score (HUD futur côté shell). */
  onScore?(score: number): void;
  onGameOver?(result: { score: number }): void;
  /** Bouton « quitter » in-game : le host sort du jeu (retour briefing). */
  onExit(): void;
  locale: 'fr';
}

export interface GameMeta {
  key: string;
  name: string;
  description: string;
  instructions: string;
  /** Visuel de la carte du menu (URL). */
  thumbnail?: string;
}

export interface GameInstance {
  unmount(): void;
}

export interface GameModule {
  meta: GameMeta;
  /** Peut être asynchrone (chargement d'assets, init du moteur de rendu). */
  mount(el: HTMLElement, ctx: GameContext): GameInstance | Promise<GameInstance>;
}
