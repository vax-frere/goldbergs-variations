# Advanced Camera Controller - Configuration par Périphérique

## Vue d'ensemble

Le système de contrôle de caméra supporte maintenant des configurations différentes selon le périphérique d'entrée utilisé (clavier, manette, tactile). Cette approche suit les meilleures pratiques de l'industrie du jeu vidéo.

## Patterns Professionnels Implémentés

### 1. Configuration Hiérarchique

```
Configuration de Base → Configuration Périphérique → Configuration Utilisateur
```

### 2. Input Profiles

Chaque périphérique a son propre profil optimisé :

- **Clavier** : Accélération plus élevée pour compenser les entrées binaires
- **Manette** : Courbes de réponse exponentielles pour les sticks analogiques
- **Tactile** : Zone morte plus large et sensibilité adaptée

### 3. Runtime Switching

Détection automatique et basculement en temps réel entre les périphériques.

## Utilisation

### Configuration des Périphériques

```javascript
// Dans navigationConstants.js
export const DEVICE_SPECIFIC_CONFIGS = {
  [INPUT_DEVICE_TYPES.KEYBOARD]: {
    acceleration: 500,
    maxSpeed: 350,
    rotationSpeed: 1.5,
    keyboardSensitivity: 1.5,
    keyboardMovementMultiplier: 1.0,
    keyboardLookMultiplier: 1.8,
    orientationSmoothFactor: 0.08,
    responseCurve: "linear",
  },
  [INPUT_DEVICE_TYPES.GAMEPAD]: {
    acceleration: 350,
    maxSpeed: 280,
    rotationSpeed: 1.0,
    lookSensitivity: 1.2,
    lookCurveIntensity: 0.5,
    orientationSmoothFactor: 0.12,
    vibrationEnabled: true,
    responseCurve: "exponential",
  },
};
```

### Hooks React

```javascript
import { useActiveDevice, useDeviceConfig } from "./inputManager";

function MyComponent() {
  const activeDevice = useActiveDevice();
  const deviceConfig = useDeviceConfig();

  return (
    <div>
      <p>Périphérique actif: {activeDevice}</p>
      <p>Accélération: {deviceConfig?.acceleration}</p>
    </div>
  );
}
```

### Utilisation dans le FlightController

```javascript
// Le FlightController s'adapte automatiquement
flightController.setActiveDevice(INPUT_DEVICE_TYPES.GAMEPAD);

// Configuration effective = base + périphérique
const config = flightController.getEffectiveConfig();
```

## Fonctions Utilitaires

### `getFlightConfigForDevice(deviceType)`

Retourne la configuration pour un périphérique spécifique.

### `getAccelerationFactorsForDevice(deviceType)`

Retourne les facteurs d'accélération pour un périphérique.

### `blendConfigs(primaryDevice, secondaryDevice, blendFactor)`

Mélange les configurations de deux périphériques (utile pour les transitions).

## Avantages

1. **Expérience Optimisée** : Chaque périphérique a des paramètres adaptés
2. **Flexibilité** : Facile d'ajouter de nouveaux périphériques
3. **Maintenabilité** : Configuration centralisée et typée
4. **Performance** : Basculement en temps réel sans interruption
5. **Extensibilité** : Support futur pour mobile/VR

## Exemple de Personnalisation

```javascript
// Ajouter un nouveau périphérique
export const INPUT_DEVICE_TYPES = {
  // ... existants
  VR_CONTROLLER: "vr_controller",
};

export const DEVICE_SPECIFIC_CONFIGS = {
  // ... existants
  [INPUT_DEVICE_TYPES.VR_CONTROLLER]: {
    acceleration: 200,
    maxSpeed: 150,
    rotationSpeed: 0.8,
    hapticFeedback: true,
    responseCurve: "smooth",
  },
};
```

## Debug et Monitoring

Le `DebugNavigationUI` affiche maintenant :

- Périphérique actif
- Configuration en cours
- Facteurs d'accélération
- Transitions entre périphériques

## Migration

Le code existant continue de fonctionner. La configuration par défaut utilise les paramètres du clavier pour la rétrocompatibilité.

## Paramètres de douceur d'orientation

Le système d'orientation utilise maintenant deux paramètres pour un contrôle complet de l'inertie :

### `orientationSmoothFactor` - Lissage au relâchement

Contrôle la décélération quand on relâche les contrôles :

- **Valeurs plus basses (0.05 - 0.08)** : Décélération très douce, la caméra continue de tourner longtemps
- **Valeurs moyennes (0.10 - 0.15)** : Décélération équilibrée
- **Valeurs plus hautes (0.20 - 0.30)** : Arrêt plus rapide

### `orientationInertiaFactor` - Inertie au démarrage

Contrôle l'accélération progressive quand on commence à tourner :

- **Valeurs plus basses (0.08 - 0.12)** : Démarrage très doux et progressif
- **Valeurs moyennes (0.15 - 0.20)** : Accélération équilibrée
- **Valeurs plus hautes (0.25 - 0.35)** : Réponse plus directe

### Valeurs par défaut :

- **Clavier** :
  - `orientationSmoothFactor: 0.05` (décélération très douce)
  - `orientationInertiaFactor: 0.12` (démarrage progressif pour compenser les entrées binaires)
- **Manette** :
  - `orientationSmoothFactor: 0.12` (décélération modérée)
  - `orientationInertiaFactor: 0.18` (plus réactif grâce aux sticks analogiques)
- **Touch** :
  - `orientationSmoothFactor: 0.10` (valeurs intermédiaires)
  - `orientationInertiaFactor: 0.15`

### Système d'inertie complet

Le nouveau système fonctionne en deux phases :

1. **Phase d'accélération** : Quand tu commences à tourner, la vitesse augmente progressivement selon `orientationInertiaFactor`
2. **Phase de décélération** : Quand tu relâches, la vitesse diminue progressivement selon `orientationSmoothFactor`

Cela donne un mouvement très naturel et cinématique, similaire aux caméras professionnelles.

### Personnalisation

Pour ajuster l'inertie, modifiez les valeurs dans `navigationConstants.js` :

```javascript
[INPUT_DEVICE_TYPES.KEYBOARD]: {
  // ... autres paramètres
  orientationSmoothFactor: 0.03, // Très doux au relâchement
  orientationInertiaFactor: 0.08, // Très progressif au démarrage
  // ou
  orientationSmoothFactor: 0.15, // Plus réactif au relâchement
  orientationInertiaFactor: 0.25, // Plus direct au démarrage
}
```
