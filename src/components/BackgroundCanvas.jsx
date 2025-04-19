import { useEffect, useRef, useState } from "react";

const BackgroundCanvas = () => {
  const canvasRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [svgImages, setSvgImages] = useState([]);
  const [fadeOpacity, setFadeOpacity] = useState(0); // Opacité initiale à 0 pour le fadeIn

  useEffect(() => {
    // Liste des SVG à utiliser
    const svgPaths = [
      "/img/star-1.svg",
      "/img/star-2.svg",
      "/img/star-3.svg",
      "/img/star-4.svg",
      "/img/star-5.svg",
      "/img/star-6.svg",
    ];

    // Préchargement des images SVG
    const loadedImages = [];
    let loadedCount = 0;

    svgPaths.forEach((path, index) => {
      const img = new Image();
      img.onload = () => {
        loadedImages[index] = img;
        loadedCount++;
        if (loadedCount === svgPaths.length) {
          setSvgImages(loadedImages);
          setImagesLoaded(true);
        }
      };
      img.src = path;
    });
  }, []);

  // Effet de fadeIn une fois les images chargées
  useEffect(() => {
    if (imagesLoaded) {
      // Configurer le fadeIn pour qu'il dure ~1 seconde
      const targetOpacity = 0.4; // Opacité finale
      const duration = 1000; // Durée en ms (1 seconde)
      const steps = 20; // Nombre d'étapes
      const stepDuration = duration / steps; // Durée entre chaque étape
      const opacityIncrement = targetOpacity / steps; // Incrément d'opacité par étape

      let step = 0;
      const fadeInterval = setInterval(() => {
        step++;
        const newOpacity = Math.min(opacityIncrement * step, targetOpacity);
        setFadeOpacity(newOpacity);

        if (step >= steps) {
          clearInterval(fadeInterval);
        }
      }, stepDuration);

      return () => clearInterval(fadeInterval);
    }
  }, [imagesLoaded]);

  useEffect(() => {
    if (!imagesLoaded || svgImages.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;

    // Set canvas dimensions to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Listen for resize events
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Créer des étoiles (avec mouvement très lent)
    const stars = [];
    const starCount = 100;

    class Star {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = 0.3 + Math.random() * 1.0;
        this.opacity = 0.03 + Math.random() * 0.07;

        // Pulsation d'opacité
        this.pulseSpeed = 0.0002 + Math.random() * 0.0006;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseAmount = 0.01 + Math.random() * 0.02;

        // Mouvement orbital très lent
        this.centerX = this.x; // Point central de rotation
        this.centerY = this.y;
        this.orbitRadius = 0.5 + Math.random() * 2.5; // Rayon de rotation très petit (0.5 à 3 pixels)
        this.orbitSpeed =
          (Math.random() * 0.0005 + 0.0001) * (Math.random() > 0.5 ? 1 : -1); // Très lent, direction aléatoire
        this.orbitAngle = Math.random() * Math.PI * 2; // Angle initial aléatoire

        // Léger mouvement vertical (vers le bas)
        this.verticalSpeed = 0.01 + Math.random() * 0.03; // Vitesse très lente vers le bas

        // Phase de mouvement
        this.movementPhase = Math.random() * Math.PI * 2;
        this.movementSpeed = Math.random() * 0.0003 + 0.0001;
      }

      update() {
        // Pulsation de l'opacité
        this.pulsePhase += this.pulseSpeed;
        if (this.pulsePhase > Math.PI * 2) this.pulsePhase -= Math.PI * 2;
        const pulse = Math.sin(this.pulsePhase) * this.pulseAmount;
        this.currentOpacity = Math.max(0.01, this.opacity + pulse);

        // Mouvement orbital très lent
        this.orbitAngle += this.orbitSpeed;
        if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;

        // Calculer la nouvelle position avec un léger mouvement orbital
        this.x = this.centerX + Math.cos(this.orbitAngle) * this.orbitRadius;

        // Ajout du mouvement vertical
        this.centerY += this.verticalSpeed;
        this.y = this.centerY + Math.sin(this.orbitAngle) * this.orbitRadius;

        // Ajouter un léger mouvement de "respiration" au rayon orbital
        this.movementPhase += this.movementSpeed;
        if (this.movementPhase > Math.PI * 2) this.movementPhase -= Math.PI * 2;
        const breathingEffect = Math.sin(this.movementPhase) * 0.5; // Effet très subtil
        this.currentRadius = Math.max(0.1, this.orbitRadius + breathingEffect);

        // Réinitialiser si l'étoile sort de l'écran
        if (this.y > canvas.height + this.size) {
          this.x = Math.random() * canvas.width;
          this.y = -this.size;
          this.centerX = this.x;
          this.centerY = this.y;
        }
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.currentOpacity})`;
        ctx.fill();
      }
    }

    // Initialiser les étoiles
    for (let i = 0; i < starCount; i++) {
      stars.push(new Star());
    }

    // Create SVG objects
    const objects = [];
    const objectCount = 18;

    // Layers for parallax effect (0: furthest, 2: closest)
    const LAYERS = 3;

    class SvgObject {
      constructor() {
        // Sélectionner une image aléatoire
        this.imageIndex = Math.floor(Math.random() * svgImages.length);

        // Assign to a layer for parallax (0: distant, LAYERS-1: close)
        this.layer = Math.floor(Math.random() * LAYERS);

        // Size based on layer (smaller = more distant)
        const layerFactor = this.layer / (LAYERS - 1); // 0 to 1

        // Taille basée sur la couche (réduite)
        this.scale = 0.05 + layerFactor * 0.15; // 0.05 à 0.2 de scale (encore plus petit)

        // Dimensions de l'image avec échelle
        const imgWidth = svgImages[this.imageIndex].width;
        const imgHeight = svgImages[this.imageIndex].height;
        this.width = imgWidth * this.scale;
        this.height = imgHeight * this.scale;

        this.x = Math.random() * canvas.width; // Position horizontale aléatoire
        this.y = -this.height - Math.random() * canvas.height; // Débute au-dessus de l'écran

        // Facteur de base pour le parallax
        this.layerFactor = layerFactor;

        // Vitesse de base aléatoire (mais toujours positive pour aller vers le bas)
        this.baseSpeed = 0.08 + Math.random() * 0.15;

        // Vitesse finale influencée par le parallax
        // Objets distants (layer 0) : plus lents
        // Objets proches (layer max) : plus rapides
        this.speed = this.baseSpeed * (0.5 + layerFactor * 1.5);

        // Direction horizontale très légère (pour un mouvement non linéaire)
        // Réduite pour que le mouvement vertical soit plus prononcé
        this.horizontalSpeed = (Math.random() * 0.006 - 0.003) * layerFactor;

        // Rotation initiale aléatoire
        this.rotation = Math.random() * Math.PI * 2;

        // Vitesse de rotation constante (plus rapide pour les objets proches)
        this.rotationSpeed =
          (Math.random() * 0.0005 + 0.0001) *
          (Math.random() > 0.5 ? 1 : -1) *
          (1 + layerFactor * 2);

        // Opacité dépendante de la couche (réduite)
        this.baseOpacity = 0.02 + layerFactor * 0.1; // Plus opaque pour les objets proches
        this.opacityVariance = Math.random() * 0.02; // Petite variation d'opacité

        // Phase pour animation d'opacité
        this.opacityPhase = Math.random() * Math.PI * 2;
        this.opacitySpeed = 0.0002 + Math.random() * 0.0005;

        // Mouvement orbital optionnel pour certains objets (réduit à 20%)
        this.hasOrbitalMovement = Math.random() < 0.2; // Moins d'objets en orbite
        this.orbitRadius = 0.1 + Math.random() * 0.8 * layerFactor; // Rayon d'orbite réduit
        this.orbitSpeed =
          (Math.random() * 0.001 + 0.0005) * (Math.random() > 0.5 ? 1 : -1);
        this.orbitAngle = Math.random() * Math.PI * 2;
        this.orbitCenterX = this.x;
        // L'orbite se fait toujours autour d'un axe qui descend
        this.orbitCenterY = this.y;
      }

      update() {
        // Déplacement vertical basé sur le parallax (toujours vers le bas)
        this.y += this.speed;

        // Si l'objet a un mouvement orbital, le centre d'orbite doit descendre aussi
        if (this.hasOrbitalMovement) {
          this.orbitCenterY += this.speed * 0.9; // Le centre d'orbite descend aussi
          this.orbitAngle += this.orbitSpeed;
          if (this.orbitAngle > Math.PI * 2) this.orbitAngle -= Math.PI * 2;

          // Oscillation horizontale autour d'un point (avec amplitude réduite)
          this.x =
            this.orbitCenterX +
            Math.sin(this.orbitAngle) * this.orbitRadius * 6;

          // La position Y est toujours influencée par l'orbite, mais moins que le mouvement vers le bas
          const verticalOffset =
            Math.cos(this.orbitAngle) * this.orbitRadius * 2;
          this.y = this.orbitCenterY + verticalOffset;
        } else {
          // Simple dérive horizontale pour les autres (mais plus faible)
          this.x += this.horizontalSpeed;

          // Rebond sur les bords
          if (this.x < -this.width) this.x = canvas.width + this.width;
          if (this.x > canvas.width + this.width) this.x = -this.width;
        }

        // Rotation constante
        this.rotation += this.rotationSpeed;
        if (this.rotation > Math.PI * 2) this.rotation -= Math.PI * 2;

        // Animation légère de l'opacité
        this.opacityPhase += this.opacitySpeed;
        if (this.opacityPhase > Math.PI * 2) this.opacityPhase -= Math.PI * 2;

        // Calcul de l'opacité avec légère pulsation
        const pulsation =
          (Math.sin(this.opacityPhase) + 1) * 0.5 * this.opacityVariance;
        this.opacity = Math.max(0.015, this.baseOpacity + pulsation);

        // Réinitialisation si hors écran
        if (this.y > canvas.height + this.height) {
          // Changer l'image aléatoirement
          this.imageIndex = Math.floor(Math.random() * svgImages.length);

          // Vitesse de base aléatoire pour plus de variété (mais toujours positive)
          this.baseSpeed = 0.08 + Math.random() * 0.15;
          this.speed = this.baseSpeed * (0.5 + this.layerFactor * 1.5);

          // Nouvelle direction horizontale (réduite)
          this.horizontalSpeed =
            (Math.random() * 0.006 - 0.003) * this.layerFactor;

          // Recalculer les dimensions
          const imgWidth = svgImages[this.imageIndex].width;
          const imgHeight = svgImages[this.imageIndex].height;
          this.width = imgWidth * this.scale;
          this.height = imgHeight * this.scale;

          this.y = -this.height - Math.random() * 600; // Plus espacé

          // Garder la position X pour les objets en orbite, sinon nouvelle position
          if (!this.hasOrbitalMovement) {
            this.x = Math.random() * canvas.width;
          } else {
            this.orbitCenterX = Math.random() * canvas.width;
            this.x = this.orbitCenterX;
            this.orbitCenterY = this.y;
          }

          // Nouvelle rotation aléatoire
          this.rotationSpeed =
            (Math.random() * 0.0005 + 0.0001) *
            (Math.random() > 0.5 ? 1 : -1) *
            (1 + this.layerFactor * 2);

          this.baseOpacity = 0.02 + this.layerFactor * 0.1;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.globalAlpha = this.opacity;
        ctx.drawImage(
          svgImages[this.imageIndex],
          -this.width / 2,
          -this.height / 2,
          this.width,
          this.height
        );
        ctx.globalAlpha = 1.0;
        ctx.restore();
      }
    }

    // Initialiser les objets SVG
    for (let i = 0; i < objectCount; i++) {
      objects.push(new SvgObject());
      // Répartir les objets sur toute la hauteur au démarrage
      objects[i].y = Math.random() * (canvas.height + 500) - 300;
    }

    // Trier les objets par couche pour que les plus lointains soient dessinés en premier
    objects.sort((a, b) => a.layer - b.layer);

    // Animation loop
    const animate = () => {
      // Clear canvas with more fade for smoother transitions
      ctx.fillStyle = "rgba(0, 0, 0, 0.03)"; // Fondu plus lent
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw stars (fixed points)
      stars.forEach((star) => {
        star.update();
        star.draw();
      });

      // Update and draw objects
      objects.forEach((object) => {
        object.update();
        object.draw();
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    // Cleanup
    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [imagesLoaded, svgImages]);

  // Style CSS avec l'opacité animée
  const canvasStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
    background: "black",
    opacity: fadeOpacity,
    transition: "opacity 0.05s ease-in", // Transition plus fluide
  };

  return <canvas ref={canvasRef} style={canvasStyle} />;
};

export default BackgroundCanvas;
