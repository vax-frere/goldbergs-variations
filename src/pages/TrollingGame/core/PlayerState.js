// Pattern State pour gérer les différents états du joueur
export const PlayerStates = {
  INTRO: 'intro',           // Séquence d'introduction du niveau
  PLAYING: 'playing',       // Jeu normal avec contrôles actifs
  PAUSED: 'paused',         // Jeu en pause
  CUTSCENE: 'cutscene'      // Séquence cinématique
};

export class PlayerState {
  constructor(player) {
    this.player = player;
    this.currentState = PlayerStates.INTRO;
    this.stateStartTime = Date.now();
  }

  // Changer d'état avec notifications
  setState(newState) {
    const oldState = this.currentState;
    this.currentState = newState;
    this.stateStartTime = Date.now();
    
    // Notifier le changement d'état
    this.onStateChange(oldState, newState);
    
    // Émettre un événement Phaser
    if (this.player.scene) {
      this.player.scene.events.emit('playerStateChanged', {
        oldState,
        newState,
        player: this.player
      });
    }
  }

  // Hook pour les actions à effectuer lors du changement d'état
  onStateChange(oldState, newState) {
    console.log(`🎭 Player state: ${oldState} → ${newState}`);
    
    switch (newState) {
      case PlayerStates.INTRO:
        this.player.setInputEnabled(false);
        break;
      case PlayerStates.PLAYING:
        this.player.setInputEnabled(true);
        break;
      case PlayerStates.PAUSED:
      case PlayerStates.CUTSCENE:
        this.player.setInputEnabled(false);
        break;
    }
  }

  // Vérifier si le joueur peut recevoir des inputs
  canReceiveInput() {
    return this.currentState === PlayerStates.PLAYING;
  }

  // Vérifier si le joueur peut se déplacer
  canMove() {
    return this.currentState === PlayerStates.PLAYING || this.currentState === PlayerStates.INTRO;
  }

  // Obtenir l'état actuel
  getState() {
    return this.currentState;
  }

  // Obtenir le temps dans l'état actuel
  getTimeInState() {
    return Date.now() - this.stateStartTime;
  }
} 