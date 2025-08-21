# 👥 GroupFleeingSystem

## 🎯 Vue d'ensemble

Le **GroupFleeingSystem** est un système SOLID qui gère la **fuite constante et permanente** des NPCs quand il ne reste que 2-3 NPCs qui ne suivent pas le joueur. 

Quand les NPCs deviennent minoritaires, ils prennent peur et **fuient en permanence** le joueur en courant, tant que les conditions persistent.

## 🏗️ Architecture SOLID - Niveau Spécifique

**IMPORTANT** : Ce système est maintenant **exclusif au niveau Pied Piper** pour respecter les principes SOLID :
- ✅ **Single Responsibility** : Chaque niveau gère ses propres mécaniques
- ✅ **Open/Closed** : Le système peut être étendu à d'autres niveaux sans modification
- ✅ **Dependency Inversion** : Indépendant de GameScene global

## 🏗️ Architecture SOLID

### **Single Responsibility**
- Surveille uniquement les conditions de fuite de groupe
- Ne gère pas la logique de fuite individuelle (délégée au NpcStateController)

### **Open/Closed** 
- Extensible pour d'autres types de déclencheurs de fuite
- Configuration modifiable à chaud via `updateConfig()`

### **Dependency Inversion**
- Dépend d'abstractions (EntityManager, Player)
- Utilise le système de fuite existant des NPCs

## ⚙️ Configuration

```javascript
config = {
  triggerThreshold: 3,    // Seuil : 3 NPCs non-followers ou moins
  checkInterval: 500,     // Vérifier toutes les 500ms
  fleeRange: 200,         // Distance à partir de laquelle fuir le joueur
  minNpcsForFlee: 1       // Minimum de NPCs pour déclencher la fuite
}
```

## 🎮 Contrôles de Debug

| Touche | Action |
|--------|--------|
| **G** | Afficher les statistiques du système |
| **F** | Forcer la fuite de groupe (test) |
| **H** | Arrêter la fuite de groupe |

## 🔄 Cycle de vie - Comportement Continu

1. **Surveillance permanente** (toutes les 200ms)
   - Compte les NPCs non-followers
   - Évalue les conditions de fuite en continu

2. **Fuite constante** (si ≤ 3 NPCs non-followers)
   - **Force activement** tous les NPCs non-followers à fuir
   - **Prolonge automatiquement** leur fuite si elle est sur le point de se terminer
   - **Réinitialise les timers** pour maintenir l'état de fuite
   - **Respecte les états prioritaires** : trembling, cri en cours
   - Comportement **permanent** tant que les conditions persistent

3. **Arrêt automatique** (si > 3 NPCs non-followers)
   - Les NPCs peuvent reprendre leur comportement normal
   - Plus de forçage actif de la fuite
   - Le système repasse en mode surveillance

## 🆕 Fuite Constante vs Ponctuelle

| **Ancien comportement** | **Nouveau comportement** |
|--------------------------|---------------------------|
| ❌ Activation unique | ✅ **Maintien permanent** |
| ❌ Fuite temporaire | ✅ **Fuite constante** |
| ❌ NPCs peuvent s'arrêter | ✅ **Forçage actif continu** |
| ❌ Vérification 500ms | ✅ **Vérification 200ms** |

## 📊 Statistiques

```javascript
const stats = groupFleeingSystem.getSystemStats();
// Retourne :
{
  totalNpcs: 12,              // Nombre total de NPCs
  nonFollowerNpcs: 2,         // NPCs qui ne suivent pas le joueur  
  threshold: 3,               // Seuil configuré
  isActive: true,             // Système actif/inactif
  affectedNpcsCount: 2,       // NPCs actuellement en fuite
  shouldTrigger: true         // Conditions remplies pour déclencher
}
```

## 🔗 Intégration - Niveau Spécifique

Le système est maintenant intégré exclusivement dans **PiedPiperLevel** :
- Initialisé dans `createGroupFleeingSystem()` (Phase 3)
- Mis à jour dans `update(time, delta)` du niveau 
- Nettoyé dans `cleanup()` du niveau
- Accessible via `this.groupFleeingSystem` dans le niveau Piper seulement

### Configuration Spécifique Piper
```javascript
// Configuration optimisée pour le gameplay Pied Piper
this.groupFleeingSystem.updateConfig({
  triggerThreshold: 8,    // Seuil adapté au niveau (≤ 8 NPCs non-followers)
  fleeRange: 300,         // Distance étendue pour plus de portée
  checkInterval: 200      // Réactivité optimale
});
```

## 🎯 Comportement de Gameplay

- **Seuil configuré** : 8 NPCs non-followers ou moins (niveau Piper)
- **Fuite intelligente** : Direction opposée au joueur
- **Animation de course** : Utilise l'animation "running" automatiquement
- **Non-intrusif** : Compatible avec tous les autres systèmes existants

## 🎯 Hiérarchie des États (Priorité)

Le système respecte une hiérarchie claire d'états pour éviter les conflits :

| **Priorité** | **État** | **Description** | **Interruptible** |
|--------------|----------|----------------|-------------------|
| **1 (Max)** | `screaming` | NPC en train de crier | ❌ **Jamais** |
| **2** | `trembling` | NPC tremble après cri du joueur | ❌ **Jamais** |
| **3** | `fleeing` | Fuite constante de groupe | ✅ Par états prioritaires |
| **4** | `following` | NPC suit le joueur | ✅ Par fuite constante |
| **5 (Min)** | `normal` | Comportement par défaut | ✅ Par tous |

### Exemples de Transitions
- **Fuite → Cri** : ✅ Fuite interrompue, cri prioritaire
- **Fuite → Trembling** : ✅ Fuite interrompue, trembling prioritaire  
- **Trembling → Fuite** : ✅ Retour automatique à la fuite après trembling
- **Following → Fuite** : ❌ Si NPC devient follower, plus de fuite

---

*Système créé suivant les principes SOLID pour une architecture maintenable et extensible.*
