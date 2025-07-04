# Export Notion - Script d'Export Complet

Ce script permet d'exporter récursivement tout le contenu d'une page ou base de données Notion, incluant tous les fichiers média (images, sons, vidéos, PDF, etc.).

## ✨ Fonctionnalités

- 📄 **Export complet** : Pages, bases de données, sous-pages
- 🎵 **Média inclus** : Images, sons, MP3, vidéos, PDF, fichiers
- 📝 **Formats multiples** : JSON structuré ou Markdown lisible
- 🔄 **Récursif** : Tous les contenus liés sont exportés
- 💾 **Téléchargement automatique** : Tous les fichiers média sont sauvegardés localement
- 🎨 **Formatage préservé** : Gras, italique, liens, couleurs, etc.

## 🚀 Installation

1. **Installer les dépendances** :
```bash
cd scripts
poetry install
```

2. **Configurer Notion** :
   - Créer une intégration sur https://www.notion.so/my-integrations
   - Copier le token secret
   - Partager votre page/base de données avec l'intégration

3. **Configurer le token** :
   - Créer un fichier `.env` dans le dossier `scripts/`
   - Ajouter votre token :
```env
NOTION_TOKEN=secret_your_notion_token_here
```

## 📋 Utilisation

### Export basique (JSON)
```bash
poetry run python export_notion.py YOUR_NOTION_ID
```

### Export Markdown avec tous les médias
```bash
poetry run python export_notion.py YOUR_NOTION_ID --format markdown
```

### Export dans un dossier spécifique
```bash
poetry run python export_notion.py YOUR_NOTION_ID --output mes_exports
```

### Export avec token spécifique
```bash
poetry run python export_notion.py YOUR_NOTION_ID --token your_token_here
```

## 📂 Structure de sortie

```
output/
├── notion_export_20250613_131952/
│   ├── media/                          # Tous les fichiers média
│   │   ├── image_001.jpg
│   │   ├── audio_track.mp3
│   │   ├── video_demo.mp4
│   │   └── document.pdf
│   ├── Page_Title_abc123.md            # Pages exportées
│   ├── Another_Page_def456.md
│   └── database_MyDB_xyz789.json       # Bases de données
```

## 🎯 Types de contenu supportés

### Blocs de base
- ✅ Paragraphes avec formatage (gras, italique, etc.)
- ✅ Titres (H1, H2, H3)
- ✅ Listes à puces et numérotées
- ✅ Citations
- ✅ Code avec coloration syntaxique
- ✅ Callouts avec icônes
- ✅ Toggles (sections pliables)
- ✅ Séparateurs

### Fichiers média
- ✅ **Images** : JPG, PNG, GIF, WebP, SVG
- ✅ **Audio** : MP3, WAV, OGG, M4A
- ✅ **Vidéos** : MP4, AVI, MOV, WebM
- ✅ **Documents** : PDF, DOC, DOCX, TXT
- ✅ **Fichiers** : Tous types de fichiers

### Contenu avancé
- ✅ Embeds (YouTube, Vimeo, etc.)
- ✅ Signets web
- ✅ Liens externes
- ✅ Tables des matières
- ✅ Bases de données complètes
- ✅ Pages enfants récursives

## 🎨 Formatage préservé

Le script préserve tout le formatage original :
- **Gras** et *italique*
- ~~Texte barré~~ et <u>souligné</u>
- `Code inline`
- [Liens](https://example.com)
- Couleurs (en commentaires HTML)
- Icônes et emojis

## 🔧 Exemples d'usage

### Export d'une page de documentation
```bash
poetry run python export_notion.py 16461228b6cb4b87bbad17aaff69c84a --format markdown
```

### Export d'une base de données de projets
```bash
poetry run python export_notion.py abc123-def456-ghi789 --format json
```

### Export avec dossier personnalisé
```bash
poetry run python export_notion.py my-page-id --output exports/projet_joshua --format markdown
```

## 🐛 Résolution de problèmes

### Erreur "Provided ID is a database, not a page"
✅ **Normal** : Le script détecte automatiquement le type et s'adapte

### Erreur "Unauthorized"
❌ **Solution** : Vérifiez que :
- Le token est correct dans le fichier `.env`
- La page est partagée avec votre intégration Notion
- L'intégration a les permissions de lecture

### Erreur "Not found"
❌ **Solution** : Vérifiez que :
- L'ID Notion est correct
- La page n'est pas dans la corbeille
- Vous avez accès à la page

### Fichiers non téléchargés
❌ **Solution** : Vérifiez que :
- Vous avez une connexion internet stable
- Les liens de fichiers ne sont pas expirés
- Vous avez l'espace disque suffisant

## 💡 Conseils

1. **IDs Notion** : Vous pouvez copier l'ID depuis l'URL de la page
2. **Gros exports** : Soyez patient, les gros contenus prennent du temps
3. **Médias** : Tous les fichiers sont téléchargés localement
4. **Liens** : Les liens externes sont préservés
5. **Récursivité** : Toutes les sous-pages sont exportées automatiquement

## 📊 Exemple de sortie

Le script génère des fichiers Markdown parfaitement formatés avec tous les médias inclus :

```markdown
# Ma Page de Projet

**Créé :** 2024-01-15
**Dernière modification :** 2024-01-20
**URL :** https://notion.so/ma-page

---

## Introduction

Voici un projet avec des **éléments multimédias** :

![Capture d'écran](media/screenshot_001.png)

🎵 **Audio**: [Démonstration audio](media/demo_audio.mp3)

📄 **PDF**: [Documentation complète](media/doc_complete.pdf)

> 💡 **Note importante** : Ce projet contient tous les médias nécessaires.
```

## 🔄 Mise à jour

Pour mettre à jour le script :
```bash
cd scripts
poetry update
```

---

**Créé avec ❤️ pour le projet Goldberg's Variations** 