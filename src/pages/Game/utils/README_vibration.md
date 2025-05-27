# Vibration Effects Helpers

Ce module fournit un ensemble d'outils bas niveau pour créer des effets de vibration sur des géométries Three.js, tout en restant flexible pour différents cas d'usage.

## Concepts clés

### Patterns de vibration

- **PLANAR** : Vibration 2D (x, y + diagonales) - pour SVG, éléments plats
- **SPATIAL** : Vibration 3D (x, y, z + combinaisons) - pour liens 3D, objets volumiques
- **SUBTLE** : Vibration légère - pour éléments délicats
- **Custom** : Tu peux définir tes propres patterns

### Approches d'utilisation

#### 1. **High-level** : `useVibrationSystem`

```javascript
const { animateVibration, registerGeometry } = useVibrationSystem({
  vibrationSpeed: 1,
  preserveZ: false,
});

// Dans useEffect
registerGeometry(geometry, points, intensity, VIBRATION_PATTERNS.SPATIAL);

// Dans useFrame
useFrame(animateVibration);
```

#### 2. **Mid-level** : Fonctions individuelles

```javascript
// Pré-calculer les états
const states = precomputeVibrationStates(points, intensity, 8, pattern);

// Dans useFrame
updateGeometryPositions(geometry, states[currentState]);
```

#### 3. **Low-level** : Génération point par point

```javascript
const vibratedPoint = generateVibratedPoint(originalPoint, intensity, pattern);
```

## Exemples d'usage

### Pour remplacer AdvancedVibLink

```javascript
import {
  useVibrationSystem,
  VIBRATION_PATTERNS,
} from "./utils/vibrationHelpers";

const MyVibLink = ({ points, intensity, speed }) => {
  const lineRef = useRef();
  const { animateVibration, registerGeometry } = useVibrationSystem({
    vibrationSpeed: speed,
    preserveZ: false, // 3D vibration
  });

  useEffect(() => {
    if (lineRef.current) {
      registerGeometry(
        lineRef.current.geometry,
        points,
        intensity,
        VIBRATION_PATTERNS.SPATIAL
      );
    }
  }, [points, intensity]);

  useFrame(animateVibration);

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flatMap((p) => [p.x, p.y, p.z]))}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color="white" />
    </line>
  );
};
```

### Pour remplacer VibSvgPath

```javascript
import {
  useVibrationAnimation,
  precomputeVibrationStates,
  updateGeometryPositions,
  VIBRATION_PATTERNS,
} from "./utils/vibrationHelpers";

const MyVibSvg = ({ svgPaths, intensity, speed }) => {
  const geometriesRef = useRef([]);
  const vibrationStatesRef = useRef([]);
  const { updateVibration } = useVibrationAnimation({ vibrationSpeed: speed });

  useEffect(() => {
    // Pré-calculer pour chaque path
    vibrationStatesRef.current = svgPaths.map((points) =>
      precomputeVibrationStates(points, intensity, 8, VIBRATION_PATTERNS.PLANAR)
    );
  }, [svgPaths, intensity]);

  useFrame((state) => {
    updateVibration(state.clock.getElapsedTime(), (currentState) => {
      geometriesRef.current.forEach((geometry, index) => {
        const vibrationState =
          vibrationStatesRef.current[index]?.[currentState];
        if (vibrationState) {
          updateGeometryPositions(geometry, vibrationState, true); // preserveZ pour 2D
        }
      });
    });
  });

  // ... render logic
};
```

### Pattern personnalisé

```javascript
const SHAKE_HORIZONTAL = {
  dimensions: 2,
  directions: [{ axis: "x", weight: 1 }],
};

const NERVOUS_TWITCH = {
  dimensions: 3,
  directions: [
    { axis: "x", weight: 0.3 },
    { axis: "y", weight: 0.8 },
    { axis: "xy", weight: 0.5 },
  ],
};
```

## Avantages de cette approche

1. **Réutilisabilité** : Code commun extrait, patterns réutilisables
2. **Performance** : Pré-calcul optimisé, gestion des buffers
3. **Flexibilité** : Différents niveaux d'abstraction selon tes besoins
4. **Extensibilité** : Facile d'ajouter de nouveaux patterns
5. **Maintenabilité** : Logique centralisée, plus facile à débugger

## Migration de tes composants existants

1. **Identifier** les points à vibrer
2. **Choisir** le pattern approprié (PLANAR/SPATIAL/custom)
3. **Remplacer** la logique de génération par les helpers
4. **Utiliser** `useVibrationSystem` pour la plupart des cas
5. **Garder** le contrôle manuel si tu as des besoins spécifiques

Le système reste volontairement bas niveau pour que tu puisses l'adapter à tes cas spécifiques tout en évitant de réinventer la roue à chaque fois.
