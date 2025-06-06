// Configuration des objets interactifs du niveau monde
export const WORLD_INTERACTIVE_OBJECTS = [
  {
    id: "joshua",
    svgName: "joshua-goldberg",
    position: [0, 0, 0],
    size: 300,
    useVibration: true,
    vibrationIntensity: 5,
    vibrationSpeed: 2,
    persona: {
      id: "joshua-persona",
      name: "Joshua Goldberg",
      type: "persona",
    },
    text: "Joshua Goldberg - Le créateur des variations",
    isInteractive: true,
    interactionType: "audio_fragment",
    audioFragment: "intro",
    boundingBox: {
      width: 200,
      height: 300,
      depth: 200,
    },
    contentData: {
      title: "Joshua Goldberg",
      text: "Le créateur des variations Goldberg. Un compositeur visionnaire qui a révolutionné la musique baroque avec ses innovations harmoniques et structurelles.",
      type: "character",
    },
  },
  {
    id: "heart1",
    svgName: "heart-1",
    position: [600, -150, 100],
    size: 25,
    useVibration: true,
    vibrationIntensity: 2,
    vibrationSpeed: 3,
    text: "Du love dans l'air",
    isInteractive: false,
    boundingBox: {
      width: 100,
      height: 100,
      depth: 100,
    },
    contentData: {
      title: "Cœur Flottant",
      text: "Un symbole d'amour qui flotte dans l'espace, représentant la passion et l'émotion qui imprègnent les compositions de Goldberg.",
      type: "decoration",
    },
  },
  {
    id: "trollface",
    svgName: "trollface",
    position: [-250, 400, -100],
    size: 100,
    useVibration: true,
    vibrationIntensity: 2.5,
    vibrationSpeed: 2.5,
    text: "Du love dans l'espace",
    isInteractive: false,
    boundingBox: {
      width: 100,
      height: 100,
      depth: 100,
    },
    contentData: {
      title: "Amour Cosmique",
      text: "L'amour transcende les dimensions, créant des connexions harmoniques entre les différents éléments de l'univers musical.",
      type: "decoration",
    },
  },
  {
    id: "ak47",
    svgName: "ak47",
    position: [200, -350, 200],
    size: 100,
    useVibration: true,
    vibrationIntensity: 3,
    vibrationSpeed: 2,
    text: "Du love dans les étoiles",
    isInteractive: false,
    boundingBox: {
      width: 100,
      height: 100,
      depth: 100,
    },
    contentData: {
      title: "Étoile d'Amour",
      text: "Parmi les étoiles, l'amour brille comme un phare guidant les mélodies vers leur destination harmonique finale.",
      type: "decoration",
    },
  },
  {
    id: "astroboy",
    svgName: "astroboy",
    position: [-300, -300, 200],
    size: 150,
    useVibration: true,
    vibrationIntensity: 4,
    vibrationSpeed: 1.5,
    persona: {
      id: "thug-persona",
      name: "You Suck My Life",
      type: "persona",
    },
    text: "You Suck My Life - Un autre personnage mystérieux",
    isInteractive: false,
    boundingBox: {
      width: 200,
      height: 300,
      depth: 200,
    },
    contentData: {
      title: "You Suck My Life",
      text: "Une figure énigmatique qui représente les aspects plus sombres et conflictuels de la création artistique. Son influence se ressent dans les passages les plus intenses des variations.",
      type: "character",
    },
    // Position spéciale pour ce personnage (différente de la position du SVG)
    interactivePosition: [-420, 0, 0],
  },
];

// Configuration des objets non interactifs (étoiles fixes)
export const WORLD_NON_INTERACTIVE_OBJECTS = [
  {
    id: "star-1",
    component: "star-1",
    position: [450, 200, -300],
    size: 35,
  },
  {
    id: "star-2",
    component: "star-2",
    position: [-450, 220, 150],
    size: 28,
  },
  {
    id: "star-3",
    component: "star-3",
    position: [-100, -700, -200],
    size: 42,
  },
  {
    id: "star-4",
    component: "star-4",
    position: [-500, -150, 350],
    size: 31,
  },
  {
    id: "star-5",
    component: "star-5",
    position: [150, 450, 250],
    size: 38,
  },
  {
    id: "star-6",
    component: "star-6",
    position: [-250, -350, -400],
    size: 33,
  },
];

// Configuration par défaut pour les objets
export const DEFAULT_OBJECT_CONFIG = {
  size: 100,
  useVibration: false,
  vibrationIntensity: 1,
  vibrationSpeed: 1,
  isInteractive: false,
  boundingBox: {
    width: 100,
    height: 100,
    depth: 100,
  },
};
