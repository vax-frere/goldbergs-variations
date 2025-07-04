# 🎼 Goldberg's Variations - Notion Exporter

Un exporteur Notion professionnel qui convertit vos pages et bases de données en markdown avec **tous les médias téléchargés** automatiquement.

## ✨ Fonctionnalités

- 📄 **Export complet** : Pages, bases de données, sous-pages
- 🎵 **Médias inclus** : Images, sons, MP3, vidéos, PDF, fichiers
- 📝 **Markdown propre** : Format lisible avec liens relatifs
- 🔄 **Récursif** : Toutes les pages liées exportées
- 💾 **Téléchargement automatique** : Médias sauvegardés localement
- 🎨 **Formatage préservé** : Gras, italique, liens, etc.
- 🚀 **Performance** : Gestion des limites de débit API
- 📊 **Index automatique** : Fichier de navigation pour les databases

## 🚀 Installation

### 1. Prérequis
- Node.js >= 18.0.0
- npm >= 9.0.0

### 2. Installation des dépendances
```bash
cd scripts/notion-export
npm install
```

### 3. Configuration
```bash
# Copier le fichier de configuration
cp env.example .env

# Éditer avec vos valeurs
nano .env
```

Votre fichier `.env` doit contenir :
```env
NOTION_TOKEN=secret_your_notion_integration_token_here
DEFAULT_NOTION_ID=16461228b6cb4b87bbad17aaff69c84a
OUTPUT_DIR=./output
MEDIA_DIR=media
```

### 4. Configuration Notion
1. **Créer une intégration** : https://www.notion.so/my-integrations
2. **Copier le token secret**
3. **Partager votre page/base de données** avec l'intégration

## 📋 Utilisation

### Export basique
```bash
# Exporter l'ID par défaut du .env
npm run export

# Ou directement
node index.js
```

### Export avec ID spécifique
```bash
# Exporter une page spécifique
node index.js --id 16461228b6cb4b87bbad17aaff69c84a

# Exporter vers un dossier personnalisé
node index.js --id YOUR_ID --output ../exports/ma_base
```

### Options disponibles
```bash
node index.js --help

Options:
  -i, --id <notion-id>        Notion page or database ID to export
  -o, --output <directory>    Output directory (default: "./output")
  -t, --token <token>         Notion integration token
  --media-dir <directory>     Media subdirectory name (default: "media")
  -h, --help                  Afficher l'aide
```

## 📂 Structure de sortie

```
output/notion_export_2024-06-13T13-30-45/
├── media/                          # Tous les fichiers média
│   ├── image_001.jpg               # Images téléchargées
│   ├── audio_track.mp3             # Sons téléchargés
│   ├── video_demo.mp4              # Vidéos téléchargées
│   └── document.pdf                # Documents téléchargés
├── _DATABASE_Ma_Base_de_donnees.md # Index de la base de données
├── Page_Titre_1_abc12345.md        # Pages exportées en markdown
├── Autre_Page_def67890.md
└── Projet_XYZ_ghi11223.md
```

## 🎯 Types de contenu supportés

### Blocs de base
- ✅ Paragraphes avec formatage complet
- ✅ Titres (H1, H2, H3, etc.)
- ✅ Listes à puces et numérotées
- ✅ Citations et callouts
- ✅ Code avec coloration syntaxique
- ✅ Tableaux
- ✅ Dividers et séparateurs

### Fichiers média
- ✅ **Images** : JPG, PNG, GIF, WebP, SVG
- ✅ **Audio** : MP3, WAV, OGG, M4A
- ✅ **Vidéos** : MP4, AVI, MOV, WebM
- ✅ **Documents** : PDF, DOC, DOCX, TXT
- ✅ **Fichiers** : Tous types

### Contenu avancé
- ✅ Embeds (YouTube, Vimeo, etc.)
- ✅ Signets web
- ✅ Liens externes et internes
- ✅ Bases de données complètes
- ✅ Pages enfants récursives
- ✅ Propriétés de page

## 🎨 Avantages par rapport au Python

### 🚀 **Performance**
- **Parallélisation native** des téléchargements
- **Gestion avancée** des limites de débit API
- **Streaming** des gros fichiers

### 📝 **Qualité Markdown**
- **Formatage parfait** préservé
- **Liens relatifs** fonctionnels
- **Structure propre** et lisible

### 🔧 **Maintenance**
- **Bibliothèque spécialisée** `notion-to-md`
- **API officielle** `@notionhq/client`
- **Mises à jour régulières**

## 🔧 Exemples d'usage

### Export de votre base de données Joshua
```bash
node index.js --id 16461228b6cb4b87bbad17aaff69c84a
```

### Export vers le dossier principal du projet
```bash
node index.js --id YOUR_ID --output ../../output/goldbergs-export
```

### Export avec token temporaire
```bash
node index.js --id YOUR_ID --token secret_temp_token_here
```

## 🐛 Résolution de problèmes

### Erreur "NOTION_TOKEN is required"
❌ **Solution** : Vérifiez votre fichier `.env`
```bash
echo $NOTION_TOKEN  # Doit afficher votre token
```

### Erreur "Page not found"
❌ **Solution** : Vérifiez que :
- L'ID est correct
- La page est partagée avec votre intégration
- Vous avez les permissions de lecture

### Médias non téléchargés
❌ **Solution** : Les URLs Notion expirent rapidement
- Exportez rapidement après création
- Vérifiez votre connexion internet

### Erreur "rate limited"
✅ **Normal** : Le script gère automatiquement les pauses

## 💡 Conseils Pro

1. **IDs multiples** : Exportez plusieurs IDs en succession
2. **Gros exports** : Laissez tourner, c'est normal que ça prenne du temps
3. **Médias lourds** : Vérifiez l'espace disque disponible
4. **Organisation** : Utilisez des dossiers de sortie spécifiques

## 🆚 Comparaison Python vs JavaScript

| Aspect | Python | JavaScript |
|--------|--------|------------|
| **Médias** | Manuel | ✅ Automatique |
| **Performance** | Lent | ✅ Rapide |
| **Maintenance** | Custom | ✅ Bibliothèque |
| **Formatage** | Basique | ✅ Parfait |
| **Erreurs** | Fragile | ✅ Robuste |

## 📊 Exemple de sortie

Le script génère des fichiers markdown parfaitement formatés :

```markdown
# Mon Projet Goldberg

**Créé :** 2024-01-15T10:30:00.000Z
**Dernière modification :** 2024-01-20T15:45:00.000Z

---

## Introduction

Voici un projet avec des **éléments multimédias** :

![Capture d'écran](./media/screenshot_001.jpg)

[Démonstration audio](./media/demo_audio.mp3)

[Documentation complète](./media/doc_complete.pdf)

> 💡 **Note importante** : Tous les médias sont inclus !
```

---

**Créé avec ❤️ pour le projet Goldberg's Variations** 