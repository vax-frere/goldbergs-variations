# Trolling Game — Améliorations inspirées de dialed.gg

> Notes de brainstorm — Mars 2026
> Source d'inspiration : [dialed.gg](https://dialed.gg) (analyse complète dans `dialed-gg.md`)

---

## 1. Audio procédural via Web Audio API

Le Trolling Game charge ~20 fichiers MP3 (11 footsteps, 4 child-shouts, cry, touch, claps, splat, crowd). dialed.gg n'a **zéro fichier audio** — tout est synthétisé en temps réel avec des oscillateurs, des gain ramps et des filtres.

### Footsteps procéduraux
- Remplacer les 11 MP3 par un impulse + bandpass filter avec paramètres randomisés
- Variation **infinie** plutôt que 11 samples en rotation
- Timbre qui varie selon : vitesse, surface, sprint vs marche

### Son "touch" (NPC commence à suivre)
- Glissando ascendant : `sine` 400Hz→800Hz en 80ms
- Plus expressif et modulable que le sample actuel

### Son "shout" du joueur
- Burst de bruit filtré + sweep descendant
- Inspiré du `hardOn()` de dialed.gg (sawtooth sweep 1800Hz→60Hz + waveshaper distortion)
- Intensité qui varie selon le nombre de followers

---

## 2. Micro-interactions sonores contextuelles

dialed.gg a un son **unique** pour chaque interaction. Couches manquantes dans le Trolling Game :

| Événement | Son proposé |
|---|---|
| Gain de follower (1er) | Note simple |
| Gain de follower (5e) | Petit accord |
| Gain de follower (10e) | Chord complet (comme `multiHum` de dialed qui ajoute des voix) |
| Perte de follower | Note descendante, légèrement dissonante |
| Proximité d'un NPC recrutab. | Léger hum qui s'intensifie |
| Approche d'un objectif | Tension croissante dans le drone |

---

## 3. Drone ambient procédural

Remplacer `crowd.mp3` par un drone synthétisé qui réagit au gamestate :

- **Exploration** : drone calme, harmoniques douces
- **Proche d'un objectif** : tension montante (ajout d'harmoniques dissonantes)
- **Beaucoup de followers** : richesse sonore (plus de voix/layers)
- **Perte de followers** : appauvrissement du drone

---

## 4. Speech Synthesis

Utiliser `SpeechSynthesis` (comme dialed.gg avec Zarvox/Trinoids) pour :

- Commentaires robotiques sur les actions du joueur ("they follow", "run", "louder!")
- Encouragements/moqueries à des milestones
- Zéro fichier audio, décalé/drôle par nature

---

## 5. Animations CSS pour le layer UI

Pour les éléments d'UI overlay (React wrapper, `TrollingGame.jsx`) :

- Transitions de textes avec `@keyframes` (type `springRight`, `earthquake`)
- Ripple effects sur interactions tactiles (mobile)
- Pattern boutons : `scale(1.02)` hover → `scale(0.94)` active (simple et efficace)

---

## Ce qu'on ne fait PAS

- **Virer Phaser** — le Trolling Game a de la physique, des sprites, du pathfinding. Phaser a sa place.
- **Single-file architecture** — trop de complexité pour un jeu à niveaux multiples

---

## Priorités d'implémentation

1. **`ProceduralSFX` module** — Web Audio API, IIFE pattern. Migration footsteps en premier.
2. **Drone ambient procédural** — remplace `crowd.mp3`, réactif au gamestate.
3. **Sons feedback contextuel** — gain/perte/proximité followers.
4. **Speech Synthesis** — narration robotique.
5. **CSS micro-interactions** — polish UI.
