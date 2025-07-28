import { BaseEntity } from './BaseEntity';
import { IInteractable } from '../core/interfaces';

export class Door extends BaseEntity {
  constructor(scene, x, y, orientation = 'vertical') {
    super(scene, x, y, 'door');
    this.entityType = 'door';
    this.isStatic = true;
    this.orientation = orientation; // 'vertical' ou 'horizontal'
    
    // Propriétés spécifiques à la porte
    this.canPlayerInteract = true;
    this.targetLevel = 'level2';
    this.interactionRange = 60;
    this.isPlayerNearby = false;
    this.showingPopup = false;
    
    // Configurer l'apparence de la porte selon l'orientation
    this.sprite.setOrigin(0.5, 0.5);
    this.configureDoorSize();
    this.sprite.setTint(0x654321); // Couleur marron pour une porte en bois
    
    // Créer le popup d'interaction
    this.createInteractionPopup();
    
    console.log(`🚪 Porte ${orientation} créée à (${x}, ${y})`);
  }

  configureDoorSize() {
    // Portes doubles avec orientation correcte
    if (this.orientation === 'vertical') {
      // Porte verticale (sur murs horizontaux haut/bas) : plus haute que large
      this.sprite.setDisplaySize(64, 32); // Double largeur du mur
    } else {
      // Porte horizontale (sur murs verticaux droite/gauche) : plus large que haute
      this.sprite.setDisplaySize(32, 64); // Double hauteur du mur
    }
  }

  createInteractionPopup() {
    // Créer un conteneur pour le popup
    this.popupContainer = this.scene.add.container(this.sprite.x, this.sprite.y - 60);
    this.popupContainer.setDepth(1010);
    this.popupContainer.setVisible(false);
    
    // Fond du popup
    this.popupBackground = this.scene.add.rectangle(0, 0, 200, 40, 0x000000, 0.8);
    this.popupBackground.setStrokeStyle(2, 0xffffff);
    
    // Texte du popup
    this.popupText = this.scene.add.text(0, 0, "Appuyez sur [ESPACE] pour entrer", {
      fontSize: '12px',
      fill: '#ffffff',
      align: 'center'
    });
    this.popupText.setOrigin(0.5, 0.5);
    
    // Ajouter au conteneur
    this.popupContainer.add([this.popupBackground, this.popupText]);
    
    // Animation de pulsation pour le popup
    this.scene.tweens.add({
      targets: this.popupContainer,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  update(delta) {
    super.update(delta);
    
    // Vérifier si le joueur est à proximité
    this.checkPlayerProximity();
  }

  checkPlayerProximity() {
    const player = this.scene.entityManager.getPlayer();
    if (!player) return;
    
    const distance = this.getDistanceTo(player);
    const wasNearby = this.isPlayerNearby;
    this.isPlayerNearby = distance <= this.interactionRange;
    
    // Afficher/cacher le popup selon la proximité
    if (this.isPlayerNearby && !wasNearby) {
      this.showPopup();
    } else if (!this.isPlayerNearby && wasNearby) {
      this.hidePopup();
    }
  }

  showPopup() {
    if (this.showingPopup) return;
    
    this.showingPopup = true;
    this.popupContainer.setVisible(true);
    
    // Animation d'apparition
    this.popupContainer.setScale(0);
    this.scene.tweens.add({
      targets: this.popupContainer,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut'
    });
    
    console.log('🚪 Popup d\'interaction affiché');
  }

  hidePopup() {
    if (!this.showingPopup) return;
    
    this.showingPopup = false;
    
    // Animation de disparition
    this.scene.tweens.add({
      targets: this.popupContainer,
      scaleX: 0,
      scaleY: 0,
      duration: 150,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.popupContainer.setVisible(false);
      }
    });
  }

  // Implémenter IInteractable
  canInteract(interactor) {
    return this.canPlayerInteract && 
           interactor.entityType === 'player' && 
           this.isPlayerNearby;
  }

  onInteraction(interactor) {
    if (!this.canInteract(interactor)) return;
    
    console.log('🚪 Interaction avec la porte - Passage au niveau 2');
    
    // Cacher le popup
    this.hidePopup();
    
    // Effet visuel d'interaction
    this.sprite.setTint(0xffffff);
    this.scene.time.delayedCall(200, () => {
      this.sprite.setTint(0x654321);
    });
    
    // Changer de niveau
    this.changeLevel();
  }

  changeLevel() {
    // Appeler la méthode de changement de niveau de GameScene avec transition
    if (this.scene.changeLevel) {
      this.scene.changeLevel('level2', 'Psychologue');
    }
  }

  // Méthodes utilitaires
  setInteractionRange(range) {
    this.interactionRange = range;
  }

  setTargetLevel(level) {
    this.targetLevel = level;
  }

  // Nettoyer lors de la destruction
  destroy() {
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
    
    console.log('🚪 Porte détruite');
    
    // Appeler la méthode destroy() parente
    super.destroy();
  }

  // Méthodes pour le debug
  getBounds() {
    return {
      x: this.sprite.x - this.sprite.width / 2,
      y: this.sprite.y - this.sprite.height / 2,
      width: this.sprite.width,
      height: this.sprite.height
    };
  }

  getInteractionBounds() {
    return {
      x: this.sprite.x - this.interactionRange,
      y: this.sprite.y - this.interactionRange,
      width: this.interactionRange * 2,
      height: this.interactionRange * 2
    };
  }
} 