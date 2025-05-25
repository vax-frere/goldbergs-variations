import { useEffect, useRef, useState } from "react";
import { getImagePath } from "../utils/assetLoader";

const BackgroundCanvas = () => {
  const canvasRef = useRef(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [svgImages, setSvgImages] = useState([]);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const targetMousePosition = useRef({ x: 0, y: 0 });

  // Fonction de lerp
  const lerp = (start, end, factor) => {
    return start + (end - start) * factor;
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      // Convertir la position de la souris en coordonnées normalisées (-1 à 1)
      targetMousePosition.current = {
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1,
      };
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useEffect(() => {
    // Liste des SVG à utiliser
    const svgPaths = [
      "star-1.svg",
      "star-2.svg",
      "star-3.svg",
      "star-4.svg",
      "star-5.svg",
      "star-6.svg",
    ].map(getImagePath);

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
    const starCount = 200;

    class Star {
      constructor() {
        // Position de base fixe
        this.baseX = Math.random() * canvas.width;
        this.baseY = Math.random() * canvas.height;

        // Position actuelle (pour le lerp)
        this.x = this.baseX;
        this.y = this.baseY;

        this.zIndex = Math.random();

        // Facteur de parallaxe basé sur le z-index
        this.parallaxFactor = this.zIndex * 25; // Réduit de 50 à 25

        // Pulsation d'opacité
        this.pulseSpeed = 0.0001 + Math.random() * 0.0004;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.pulseAmount = 0.005 + Math.random() * 0.015;

        // Facteur de lissage du mouvement
        this.lerpFactor = 0.005 + this.zIndex * 0.03; // Réduit pour un mouvement encore plus doux

        // Taille et opacité basées sur le z-index
        this.size = 0.2 + this.zIndex * 1.2; // Plus grande variation de taille
        this.opacity = 0.02 + this.zIndex * 0.12; // Plus grande variation d'opacité
      }

      update() {
        // Pulsation de l'opacité
        this.pulsePhase += this.pulseSpeed;
        if (this.pulsePhase > Math.PI * 2) this.pulsePhase -= Math.PI * 2;
        const pulse = Math.sin(this.pulsePhase) * this.pulseAmount;
        this.currentOpacity = Math.max(0.01, this.opacity + pulse);

        // Calculer la position cible basée sur la position de la souris
        const targetX =
          this.baseX + targetMousePosition.current.x * this.parallaxFactor;
        const targetY =
          this.baseY + targetMousePosition.current.y * this.parallaxFactor;

        // Appliquer le lerp pour un mouvement fluide
        this.x = lerp(this.x, targetX, this.lerpFactor);
        this.y = lerp(this.y, targetY, this.lerpFactor);
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

        // Z-index pour le parallaxe (0: distant, 1: proche)
        this.zIndex = Math.random();

        // Taille basée sur le z-index
        const sizeBase = 0.03; // Réduit pour les éléments lointains
        const sizeVariation = 0.2; // Augmenté pour plus de variation
        this.scale = sizeBase + this.zIndex * sizeVariation;

        // Dimensions de l'image avec échelle
        const imgWidth = svgImages[this.imageIndex].width;
        const imgHeight = svgImages[this.imageIndex].height;
        this.width = imgWidth * this.scale;
        this.height = imgHeight * this.scale;

        // Position de base fixe
        this.baseX = Math.random() * canvas.width;
        this.baseY = Math.random() * canvas.height;
        this.x = this.baseX;
        this.y = this.baseY;

        // Facteur de parallaxe basé sur le z-index
        this.parallaxFactor = this.zIndex * 30; // Réduit de 60 à 30

        // Facteur de lissage du mouvement
        this.lerpFactor = 0.005 + this.zIndex * 0.03; // Réduit pour un mouvement encore plus doux

        // Rotation
        this.baseRotation = Math.random() * Math.PI * 2;
        this.rotation = this.baseRotation;
        this.rotationFactor = (Math.random() * 0.15 + 0.1) * this.zIndex; // Réduit encore la rotation

        // Opacité
        this.baseOpacity = 0.01 + this.zIndex * 0.15; // Augmenté la différence d'opacité
        this.opacityVariance = Math.random() * 0.03; // Augmenté pour plus de variation
        this.opacityPhase = Math.random() * Math.PI * 2;
        this.opacitySpeed = 0.0002 + Math.random() * 0.0005;
      }

      update() {
        // Animation de l'opacité
        this.opacityPhase += this.opacitySpeed;
        if (this.opacityPhase > Math.PI * 2) this.opacityPhase -= Math.PI * 2;
        const pulsation =
          (Math.sin(this.opacityPhase) + 1) * 0.5 * this.opacityVariance;
        this.opacity = Math.max(0.015, this.baseOpacity + pulsation);

        // Calculer la position cible basée sur la position de la souris
        const targetX =
          this.baseX + targetMousePosition.current.x * this.parallaxFactor;
        const targetY =
          this.baseY + targetMousePosition.current.y * this.parallaxFactor;

        // Appliquer le lerp pour un mouvement fluide
        this.x = lerp(this.x, targetX, this.lerpFactor);
        this.y = lerp(this.y, targetY, this.lerpFactor);

        // Rotation influencée par le mouvement de la souris
        const targetRotation =
          this.baseRotation +
          (targetMousePosition.current.x * 0.2 +
            targetMousePosition.current.y * 0.2) *
            this.rotationFactor;
        this.rotation = lerp(this.rotation, targetRotation, this.lerpFactor);
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
        ctx.restore();
      }
    }

    // Initialiser les objets SVG
    for (let i = 0; i < objectCount; i++) {
      objects.push(new SvgObject());
    }

    // Trier les objets par z-index pour que les plus lointains soient dessinés en premier
    objects.sort((a, b) => a.zIndex - b.zIndex);

    // Animation loop
    const animate = () => {
      // Clear canvas completely
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw stars
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

  // Style CSS sans animation d'opacité
  const canvasStyle = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    zIndex: -1,
    background: "black",
    opacity: 1,
  };

  return <canvas ref={canvasRef} style={canvasStyle} />;
};

export default BackgroundCanvas;
