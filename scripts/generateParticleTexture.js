const fs = require("fs");
const { createCanvas } = require("canvas");
const path = require("path");

// Création du dossier de destination s'il n'existe pas
const texturePath = path.join(__dirname, "../public/textures");
if (!fs.existsSync(texturePath)) {
  fs.mkdirSync(texturePath, { recursive: true });
}

// Configuration
const size = 128;
const outputFile = path.join(texturePath, "particle.png");

// Création du canvas
const canvas = createCanvas(size, size);
const ctx = canvas.getContext("2d");

// Fond transparent
ctx.clearRect(0, 0, size, size);

// Créer un dégradé radial
const gradient = ctx.createRadialGradient(
  size / 2,
  size / 2,
  size / 20,
  size / 2,
  size / 2,
  size / 2
);
gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
gradient.addColorStop(0.3, "rgba(255, 255, 255, 0.8)");
gradient.addColorStop(0.7, "rgba(255, 255, 255, 0.3)");
gradient.addColorStop(1, "rgba(255, 255, 255, 0)");

// Dessiner le cercle
ctx.fillStyle = gradient;
ctx.beginPath();
ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
ctx.fill();

// Enregistrer l'image
const buffer = canvas.toBuffer("image/png");
fs.writeFileSync(outputFile, buffer);

console.log(`Texture de particule générée avec succès: ${outputFile}`);
