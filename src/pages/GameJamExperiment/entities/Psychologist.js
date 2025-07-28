import { BaseEntity } from './BaseEntity';
import { IInteractable } from '../core/interfaces';

export class Psychologist extends BaseEntity {
  constructor(scene, x, y) {
    super(scene, x, y, 'psychologist');
    this.speed = 0; // Le psychologue ne bouge pas
    this.entityType = 'psychologist';
    this.isStatic = true;
    
    // Propriétés spécifiques au psychologue
    this.canPlayerInteract = true;
    this.interactionRange = 50;
    this.isPlayerNearby = false;
    this.showingPopup = false;
    this.isInConversation = false;
    
    // État de la conversation
    this.currentDialogueIndex = 0;
    this.conversationData = this.initConversationData();
    
    // Système de timer pour les réponses - UNE SEULE BARRE DE PROGRESSION
    this.timeForImpulsive = 1500; // 3 secondes pour réponses impulsives
    this.totalTimeToRespond = 7000; // 7 secondes au total
    this.isImpulsiveTimerActive = false;
    this.isTotalTimerActive = false;
    this.hasImpulsiveTimedOut = false;
    this.hasTotalTimedOut = false;
    
    // Configurer l'apparence du psychologue
    this.sprite.setOrigin(0.5, 0.5);
    this.sprite.setDisplaySize(48, 48);
    this.sprite.setTint(0x4a90e2); // Couleur bleue pour le différencier
    
    // Créer le popup d'interaction
    this.createInteractionPopup();
    
    // Interface de conversation
    this.conversationUI = null;
    
    console.log(`👨‍⚕️ Psychologue créé à (${x}, ${y})`);
  }

  initConversationData() {
    return [
      {
        speaker: "Psychologist",
        text: "How are you feeling today?",
        responses: [
          { text: "I'm struggling with school", next: 1, isImpulsive: false },
          { text: "EVERYTHING IS FALLING APART!", next: 1, isImpulsive: true }
        ]
      },
      {
        speaker: "Psychologist", 
        text: "I see you're having difficulties. This is quite common.",
        responses: [
          { text: "What should I do?", next: 2, isImpulsive: false },
          { text: "I CAN'T HANDLE IT ANYMORE!", next: 2, isImpulsive: true }
        ]
      },
      {
        speaker: "Psychologist",
        text: "I recommend taking a break from school and starting antidepressants. This will help you cope.",
        responses: [
          { text: "Thank you for your help", next: -1, isImpulsive: false },
          { text: "YES, ANYTHING TO STOP THIS!", next: -1, isImpulsive: true }
        ]
      }
    ];
  }

  createInteractionPopup() {
    // Créer un conteneur pour le popup
    this.popupContainer = this.scene.add.container(this.sprite.x, this.sprite.y - 60);
    this.popupContainer.setDepth(1010);
    this.popupContainer.setVisible(false);
    
    // Fond du popup
    this.popupBackground = this.scene.add.rectangle(0, 0, 220, 40, 0x000000, 0.8);
    this.popupBackground.setStrokeStyle(2, 0x4a90e2);
    
    // Texte du popup
    this.popupText = this.scene.add.text(0, 0, "Appuyez sur [ESPACE] pour parler", {
      fontSize: '12px',
      fill: '#ffffff',
      align: 'center'
    });
    this.popupText.setOrigin(0.5, 0.5);
    
    // Ajouter au conteneur
    this.popupContainer.add([this.popupBackground, this.popupText]);
    
    // Animation de pulsation continue pour le popup (comme les portes)
    this.continuousAnimation = this.scene.tweens.add({
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
    if (this.isPlayerNearby && !wasNearby && !this.isInConversation) {
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
    
    console.log('👨‍⚕️ Popup d\'interaction affiché');
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
           this.isPlayerNearby &&
           !this.isInConversation;
  }

  onInteraction(interactor) {
    if (!this.canInteract(interactor)) return;
    
    console.log('👨‍⚕️ Début de conversation avec le psychologue');
    
    // Cacher le popup
    this.hidePopup();
    
    // Démarrer la conversation
    this.startConversation();
  }

  startConversation() {
    this.isInConversation = true;
    this.currentDialogueIndex = 0;
    
    // Créer l'interface de conversation
    this.createConversationUI();
    
    // Afficher le premier dialogue
    this.showDialogue(this.currentDialogueIndex);
  }

  createConversationUI() {
    // Fond de la conversation qui couvre tout l'écran
    this.conversationBg = this.scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.8);
    this.conversationBg.setDepth(2000);
    
    // Boîte de dialogue
    this.dialogueBox = this.scene.add.rectangle(400, 450, 700, 200, 0x1a1a1a, 0.95);
    this.dialogueBox.setStrokeStyle(3, 0x4a90e2);
    this.dialogueBox.setDepth(2001);
    
    // Nom du personnage
    this.speakerName = this.scene.add.text(120, 370, '', {
      fontSize: '18px',
      fill: '#4a90e2',
      fontStyle: 'bold'
    });
    this.speakerName.setDepth(2002);
    
    // Texte du dialogue
    this.dialogueText = this.scene.add.text(120, 400, '', {
      fontSize: '16px',
      fill: '#ffffff',
      wordWrap: { width: 560 }
    });
    this.dialogueText.setDepth(2002);
    
    // Barre globale style Katana Zero - collée au top de la boîte de dialogue
    const dialogueBoxTop = 450 - 100; // Top de la boîte de dialogue
    const barWidth = 700;
    const barHeight = 6;
    const barX = 400 - barWidth/2; // Position X du début de la barre
    const barY = dialogueBoxTop - 10; // Position Y de la barre
    
    // Fond de la barre globale (gris foncé)
    this.globalTimerBarBg = this.scene.add.rectangle(400, barY, barWidth, barHeight, 0x333333, 0.8);
    this.globalTimerBarBg.setDepth(2009);
    this.globalTimerBarBg.setVisible(false);
    
    // Zone rouge pour les réponses impulsives (fixe, à gauche)
    const redPortionWidth = (barWidth * this.timeForImpulsive) / this.totalTimeToRespond; // 3/7 de la barre totale
    this.impulsiveZoneRed = this.scene.add.rectangle(barX + redPortionWidth/2, barY, redPortionWidth, barHeight, 0xFF4444, 0.6);
    this.impulsiveZoneRed.setDepth(2010);
    this.impulsiveZoneRed.setVisible(false);
    
    // Barre de progression qui grandit de gauche à droite (Graphics object)
    this.progressBar = this.scene.add.graphics();
    this.progressBar.setDepth(2011);
    this.progressBar.setVisible(false);
    
    // Stocker les positions pour l'animation
    this.barStartX = barX;
    this.barStartY = barY;
    this.barMaxWidth = barWidth;
    this.barHeight = barHeight;
    
    // Conteneur pour les réponses
    this.responseContainer = this.scene.add.container(400, 520);
    this.responseContainer.setDepth(2002);
    
    this.responseButtons = [];
  }

  showDialogue(index) {
    const dialogue = this.conversationData[index];
    if (!dialogue) return;
    
    // Afficher le texte du dialogue
    this.speakerName.setText(dialogue.speaker);
    this.dialogueText.setText(dialogue.text);
    
    // Nettoyer les anciennes réponses
    this.clearResponses();
    
    // Réinitialiser le timer
    this.hasImpulsiveTimedOut = false;
    this.hasTotalTimedOut = false;
    this.isImpulsiveTimerActive = false;
    this.isTotalTimerActive = false;
    
    // Créer les boutons de réponse
    dialogue.responses.forEach((response, i) => {
      this.createResponseButton(response, i);
    });
    
    // Démarrer le timer pour les réponses
    this.startResponseTimer();
  }

  startResponseTimer() {
    // Nettoyer les timers précédents s'ils existent
    if (this.progressTween) {
      this.progressTween.stop();
    }
    
    // Activer les timers
    this.isImpulsiveTimerActive = true;
    this.isTotalTimerActive = true;
    
    // Afficher les barres de timer
    this.globalTimerBarBg.setVisible(true);
    this.impulsiveZoneRed.setVisible(true);
    this.progressBar.setVisible(true);
    
    // Réinitialiser la barre de progression
    this.progressBar.clear();
    this.progressBar.fillStyle(0xFFFFFF);
    this.progressBar.fillRect(this.barStartX, this.barStartY, 1, this.barHeight);
    
    // Réinitialiser la zone rouge
    this.impulsiveZoneRed.setAlpha(0.6);
    
    console.log('🎯 Barre de timer visible');
    
    // Animation de la barre de progression qui grandit de gauche à droite
    this.progressTween = this.scene.tweens.add({
      targets: { progress: 0 }, // Utiliser un objet vide comme target
      progress: 1,
      duration: this.totalTimeToRespond,
      ease: 'Linear',
      onUpdate: (tween) => {
        const progress = tween.getValue();
        const currentWidth = this.barMaxWidth * progress;
        const impulsiveWidth = (this.barMaxWidth * this.timeForImpulsive) / this.totalTimeToRespond;
        
        // Redessiner la barre de progression
        this.progressBar.clear();
        
        // Changer la couleur de la barre selon le progrès
        if (progress < 0.5) {
          this.progressBar.fillStyle(0xFFFFFF); // Blanc
        } else if (progress < 0.8) {
          this.progressBar.fillStyle(0xFFFF00); // Jaune
        } else {
          this.progressBar.fillStyle(0xFF0000); // Rouge
        }
        
        // Dessiner la barre avec la largeur actuelle
        this.progressBar.fillRect(this.barStartX, this.barStartY, currentWidth, this.barHeight);
        
        // Vérifier si on a dépassé la zone impulsive
        if (currentWidth > impulsiveWidth && this.isImpulsiveTimerActive) {
          this.onImpulsiveResponseTimeout();
        }
      },
      onComplete: () => {
        this.onTotalResponseTimeout();
      }
    });
    
    console.log('🎯 Animation de progression démarrée');
  }

  onImpulsiveResponseTimeout() {
    if (!this.isImpulsiveTimerActive || this.hasImpulsiveTimedOut) return;
    
    console.log('⏰ Dépassement de la zone impulsive - désactivation des réponses impulsives');
    this.hasImpulsiveTimedOut = true;
    this.isImpulsiveTimerActive = false;
    
    // Désactiver les boutons de réponse impulsives
    this.disableImpulsiveResponses();
    
    // La zone rouge devient transparente pour montrer qu'elle n'est plus active
    this.impulsiveZoneRed.setAlpha(0.3);
    
    console.log('💭 Les réponses impulsives sont maintenant désactivées, mais l\'interaction continue');
  }

  onTotalResponseTimeout() {
    if (!this.isTotalTimerActive || this.hasTotalTimedOut) return;
    
    console.log('⏰ Timeout total - réponse automatique');
    this.hasTotalTimedOut = true;
    this.isTotalTimerActive = false;
    
    // Continuer automatiquement avec une réponse par défaut
    this.continueAfterTimeout();
  }

  continueAfterTimeout() {
    // Trouver la prochaine interaction ou terminer si c'est la dernière
    const dialogue = this.conversationData[this.currentDialogueIndex];
    if (dialogue && dialogue.responses.length > 0) {
      // Prendre la première réponse non-impulsive, ou -1 si aucune
      const nonImpulsiveResponse = dialogue.responses.find(r => !r.isImpulsive);
      const nextIndex = nonImpulsiveResponse ? nonImpulsiveResponse.next : -1;
      
      if (nextIndex === -1) {
        // Fin de conversation
        this.endConversation();
      } else {
        // Continuer vers le prochain dialogue
        this.currentDialogueIndex = nextIndex;
        this.showDialogue(nextIndex);
      }
    } else {
      // Pas de réponse disponible, terminer
      this.endConversation();
    }
  }

  disableImpulsiveResponses() {
    this.responseButtons.forEach((button, index) => {
      const dialogue = this.conversationData[this.currentDialogueIndex];
      const response = dialogue.responses[index];
      
      if (response.isImpulsive) {
        // Griser complètement l'option impulsive
        button.bg.setFillStyle(0x333333, 0.5);
        button.bg.setStrokeStyle(2, 0x666666);
        button.text.setTint(0x666666);
        button.bg.removeInteractive();
        
        // Ajouter un effet de "fade" pour montrer que c'est désactivé
        this.scene.tweens.add({
          targets: [button.bg, button.text],
          alpha: 0.3,
          duration: 300,
          ease: 'Power2.easeOut'
        });
      }
    });
  }

  createResponseButton(response, index) {
    const y = index * 40 - 20;
    
    // Couleur différente pour les réponses impulsives
    const isImpulsive = response.isImpulsive;
    const buttonColor = isImpulsive ? 0x8B0000 : 0x2a2a2a; // Rouge sombre pour impulsif
    const borderColor = isImpulsive ? 0xFF4444 : 0x4a90e2; // Rouge pour impulsif
    
    // Fond du bouton
    const buttonBg = this.scene.add.rectangle(0, y, 600, 35, buttonColor, 0.8);
    buttonBg.setStrokeStyle(2, borderColor);
    buttonBg.setInteractive();
    buttonBg.setDepth(2002);
    
    // Texte du bouton
    const buttonText = this.scene.add.text(0, y, response.text, {
      fontSize: '14px',
      fill: isImpulsive ? '#FF6666' : '#ffffff'
    });
    buttonText.setOrigin(0.5, 0.5);
    buttonText.setDepth(2003);
    
    // Ajouter au conteneur
    this.responseContainer.add([buttonBg, buttonText]);
    
    // Effet hover
    buttonBg.on('pointerover', () => {
      const hoverColor = isImpulsive ? 0xFF4444 : 0x4a90e2;
      buttonBg.setFillStyle(hoverColor, 0.3);
    });
    
    buttonBg.on('pointerout', () => {
      buttonBg.setFillStyle(buttonColor, 0.8);
    });
    
    // Clic sur la réponse
    buttonBg.on('pointerdown', () => {
      // Vérifier si la réponse impulsive est encore disponible
      if (isImpulsive && this.hasImpulsiveTimedOut) {
        return; // Impossible de cliquer sur une réponse impulsive après timeout
      }
      this.selectResponse(response.next);
    });
    
    this.responseButtons.push({ bg: buttonBg, text: buttonText });
  }

  selectResponse(nextIndex) {
    // Arrêter l'animation
    this.isImpulsiveTimerActive = false;
    this.isTotalTimerActive = false;
    if (this.progressTween) {
      this.progressTween.stop();
      this.progressTween = null;
    }
    
    // Cacher les barres de timer
    if (this.globalTimerBarBg) {
      this.globalTimerBarBg.setVisible(false);
    }
    if (this.impulsiveZoneRed) {
      this.impulsiveZoneRed.setVisible(false);
    }
    if (this.progressBar) {
      this.progressBar.setVisible(false);
      this.progressBar.clear();
    }
    
    if (nextIndex === -1) {
      // Fin de conversation
      this.endConversation();
    } else {
      // Continuer la conversation
      this.currentDialogueIndex = nextIndex;
      this.showDialogue(nextIndex);
    }
  }

  clearResponses() {
    this.responseButtons.forEach(button => {
      button.bg.destroy();
      button.text.destroy();
    });
    this.responseButtons = [];
    this.responseContainer.removeAll();
  }

  endConversation() {
    console.log('👨‍⚕️ Fin de conversation avec le psychologue');
    
    // Nettoyer l'animation
    if (this.progressTween) {
      this.progressTween.stop();
      this.progressTween = null;
    }
    if (this.globalTimerBarBg) {
      this.globalTimerBarBg.destroy();
      this.globalTimerBarBg = null;
    }
    if (this.impulsiveZoneRed) {
      this.impulsiveZoneRed.destroy();
      this.impulsiveZoneRed = null;
    }
    if (this.progressBar) {
      this.progressBar.destroy();
      this.progressBar = null;
    }
    
    // Nettoyer l'interface
    if (this.conversationBg) this.conversationBg.destroy();
    if (this.dialogueBox) this.dialogueBox.destroy();
    if (this.speakerName) this.speakerName.destroy();
    if (this.dialogueText) this.dialogueText.destroy();
    if (this.responseContainer) this.responseContainer.destroy();
    
    this.clearResponses();
    
    // Réinitialiser l'état
    this.isInConversation = false;
    this.currentDialogueIndex = 0;
    this.hasImpulsiveTimedOut = false;
    this.hasTotalTimedOut = false;
    
    // Permettre à nouveau les interactions
    this.canPlayerInteract = true;
  }

  // Nettoyer lors de la destruction
  destroy() {
    if (this.popupContainer) {
      this.popupContainer.destroy();
      this.popupContainer = null;
    }
    
    // Nettoyer l'animation continue du popup
    if (this.continuousAnimation) {
      this.continuousAnimation.stop();
      this.continuousAnimation = null;
    }
    
    // Nettoyer les animations
    if (this.progressTween) {
      this.progressTween.stop();
      this.progressTween = null;
    }
    if (this.globalTimerBarBg) {
      this.globalTimerBarBg.destroy();
      this.globalTimerBarBg = null;
    }
    if (this.impulsiveZoneRed) {
      this.impulsiveZoneRed.destroy();
      this.impulsiveZoneRed = null;
    }
    if (this.progressBar) {
      this.progressBar.destroy();
      this.progressBar = null;
    }
    
    // Nettoyer l'interface de conversation si elle existe
    if (this.isInConversation) {
      this.endConversation();
    }
    
    console.log('👨‍⚕️ Psychologue détruit');
    
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