#!/usr/bin/env node

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { program } from 'commander';
import chalk from 'chalk';
import dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

// Configuration ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: path.join(__dirname, '.env') });

// Configuration par défaut
const CONFIG = {
  outputDir: process.env.OUTPUT_DIR || './output',
  mediaDir: process.env.MEDIA_DIR || 'media',
  defaultNotionId: process.env.DEFAULT_NOTION_ID,
  notionToken: process.env.NOTION_TOKEN
};

class GoldbergsNotionExporter {
  constructor(token) {
    if (!token) {
      throw new Error('NOTION_TOKEN is required. Please check your .env file.');
    }
    
    this.notion = new Client({ auth: token });
    this.n2m = new NotionToMarkdown({ notionClient: this.notion });
    this.exportedPages = new Set(); // Pour éviter les boucles infinies
  }

  /**
   * Nettoie un nom de fichier pour le système de fichiers
   */
  cleanFilename(text) {
    const invalidChars = /[<>:"/\\|?*]/g;
    return text
      .replace(invalidChars, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100)
      .trim();
  }

  /**
   * Génère un nom de fichier unique basé sur le titre et l'ID
   */
  generateFilename(title, pageId) {
    const cleanTitle = this.cleanFilename(title || 'Untitled');
    const shortId = pageId.replace(/-/g, '').substring(0, 8);
    return `${cleanTitle}_${shortId}.md`;
  }

  /**
   * Télécharge les médias et met à jour les liens dans le markdown
   */
  async downloadMediaAndUpdateLinks(markdown, mediaDir) {
    // Regex pour trouver les liens d'images et fichiers Notion
    const mediaRegex = /!\[([^\]]*)\]\((https:\/\/[^)]+)\)/g;
    // Regex pour les liens de fichiers (pas seulement images)
    const fileRegex = /\[([^\]]+)\]\((https:\/\/[^)]+\.(mp3|wav|mp4|pdf|doc|docx|zip|rar|txt|json|csv|xlsx|ppt|pptx))\)/gi;
    
    let updatedMarkdown = markdown;
    const downloads = [];

    // Chercher les images
    let match;
    while ((match = mediaRegex.exec(markdown)) !== null) {
      const [fullMatch, altText, url] = match;
      
      // Vérifier si c'est une URL Notion
      if (url.includes('notion.so') || url.includes('s3-us-west-2.amazonaws.com') || url.includes('amazonaws.com')) {
        downloads.push({ fullMatch, altText, url, type: 'image' });
      }
    }

    // Chercher les fichiers
    while ((match = fileRegex.exec(markdown)) !== null) {
      const [fullMatch, linkText, url, extension] = match;
      
      // Vérifier si c'est une URL Notion
      if (url.includes('notion.so') || url.includes('amazonaws.com')) {
        downloads.push({ fullMatch, altText: linkText, url, type: 'file', extension });
      }
    }

    // Télécharger tous les médias
    for (const { fullMatch, altText, url, type, extension } of downloads) {
      try {
        console.log(chalk.gray(`🔄 Téléchargement ${type}: ${url.substring(0, 50)}...`));
        const filename = await this.downloadFile(url, mediaDir);
        const relativePath = `./${CONFIG.mediaDir}/${filename}`;
        
        // Créer le bon type de lien selon le type de média
        let newLink;
        if (type === 'image') {
          newLink = `![${altText}](${relativePath})`;
        } else {
          newLink = `[${altText}](${relativePath})`;
        }
        
        updatedMarkdown = updatedMarkdown.replace(fullMatch, newLink);
        
        console.log(chalk.green(`📎 ${type} téléchargé: ${filename}`));
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Échec téléchargement ${type}: ${url.substring(0, 50)}... - ${error.message}`));
      }
    }

    return updatedMarkdown;
  }

  /**
   * Télécharge un fichier depuis une URL
   */
  async downloadFile(url, outputDir) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Générer un nom de fichier
    const urlObj = new URL(url);
    let filename = path.basename(urlObj.pathname);
    
    // Si pas d'extension, deviner depuis le content-type
    if (!path.extname(filename)) {
      const contentType = response.headers.get('content-type');
      const extension = this.getExtensionFromContentType(contentType);
      filename = `file_${Date.now()}${extension}`;
    }

    // Nettoyer le nom de fichier
    filename = this.cleanFilename(filename);
    const filePath = path.join(outputDir, filename);

    // Télécharger le fichier
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(buffer));

    return filename;
  }

  /**
   * Devine l'extension depuis le content-type
   */
  getExtensionFromContentType(contentType) {
    const extensions = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'video/mp4': '.mp4',
      'application/pdf': '.pdf',
      'text/plain': '.txt'
    };
    
    return extensions[contentType] || '.bin';
  }

  /**
   * Exporte une page Notion individuelle
   */
  async exportPage(pageId, outputDir) {
    if (this.exportedPages.has(pageId)) {
      console.log(chalk.yellow(`⚠️  Page ${pageId} déjà exportée, ignorée`));
      return null;
    }

    this.exportedPages.add(pageId);

    try {
      console.log(chalk.blue(`📄 Export de la page: ${pageId}`));

      // Récupérer les informations de la page pour le titre
      const pageInfo = await this.notion.pages.retrieve({ page_id: pageId });
      
      // Extraire le titre
      let title = 'Untitled';
      if (pageInfo.properties) {
        for (const [propName, propData] of Object.entries(pageInfo.properties)) {
          if (propData.type === 'title' && propData.title && propData.title.length > 0) {
            title = propData.title.map(t => t.plain_text).join('');
            break;
          }
        }
      }

      // Créer les dossiers si nécessaire
      const mediaDir = path.join(outputDir, CONFIG.mediaDir);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.mkdirSync(mediaDir, { recursive: true });

      // Générer le nom de fichier
      const filename = this.generateFilename(title, pageId);
      const outputPath = path.join(outputDir, filename);

      // Récupérer les blocs de la page
      console.log(chalk.gray(`🔄 Récupération des blocs...`));
      const mdblocks = await this.n2m.pageToMarkdown(pageId);
      
      // Convertir en markdown - FIX: Utiliser la bonne méthode
      let mdString = '';
      if (mdblocks && mdblocks.length > 0) {
        console.log(chalk.gray(`🔍 Debug: ${mdblocks.length} blocs trouvés`));
        console.log(chalk.gray(`🔍 Debug: Premier bloc type: ${mdblocks[0]?.type || 'undefined'}`));
        
        const mdResult = this.n2m.toMarkdownString(mdblocks);
        console.log(chalk.gray(`🔍 Debug: Type de mdResult: ${typeof mdResult}`));
        console.log(chalk.gray(`🔍 Debug: mdResult keys: ${Object.keys(mdResult || {}).join(', ')}`));
        
        // FIX: toMarkdownString retourne un objet avec une propriété 'parent'
        if (typeof mdResult === 'object' && mdResult !== null) {
          mdString = mdResult.parent || mdResult.content || JSON.stringify(mdResult);
        } else {
          mdString = mdResult || '';
        }
        
        console.log(chalk.gray(`🔍 Debug: mdString final length: ${mdString.length}`));
        if (mdString.length > 0) {
          console.log(chalk.gray(`🔍 Debug: Début du contenu: ${mdString.substring(0, 100)}...`));
        }
      } else {
        console.log(chalk.yellow(`⚠️  Aucun contenu trouvé pour la page ${pageId}`));
        mdString = '*Page vide ou contenu non accessible*';
      }

      console.log(chalk.gray(`📝 Contenu markdown généré: ${mdString.length} caractères`));

      // Télécharger les images et ajuster les liens
      console.log(chalk.gray(`🖼️  Recherche de médias...`));
      const markdownWithMedia = await this.downloadMediaAndUpdateLinks(mdString, mediaDir);

      // Rechercher et exporter les sous-pages
      const childPages = await this.findChildPages(pageId);
      const childExports = [];
      
      if (childPages.length > 0) {
        console.log(chalk.cyan(`👶 ${childPages.length} sous-pages trouvées`));
        for (const childPageId of childPages) {
          const childResult = await this.exportPage(childPageId, outputDir);
          if (childResult) {
            childExports.push(childResult);
          }
          // Pause pour éviter les limites de débit
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      // Créer le contenu final avec métadonnées
      const finalContent = [
        `# ${title}`,
        '',
        `**Créé :** ${pageInfo.created_time || 'Inconnue'}`,
        `**Dernière modification :** ${pageInfo.last_edited_time || 'Inconnue'}`,
        `**URL :** ${pageInfo.url || ''}`,
        '',
        '---',
        '',
        markdownWithMedia
      ];

      // Ajouter les liens vers les sous-pages si elles existent
      if (childExports.length > 0) {
        finalContent.push('');
        finalContent.push('## Sous-pages');
        finalContent.push('');
        for (const child of childExports) {
          finalContent.push(`- [${child.title}](./${child.filename})`);
        }
      }

      // Sauvegarder le fichier
      fs.writeFileSync(outputPath, finalContent.join('\n'), 'utf8');

      console.log(chalk.green(`✅ Sauvegardé: ${filename}`));
      
      return {
        pageId,
        title,
        filename,
        outputPath,
        childPages: childExports
      };

    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de l'export de la page ${pageId}:`), error.message);
      return null;
    }
  }

  /**
   * Trouve les pages enfants d'une page donnée
   */
  async findChildPages(pageId) {
    try {
      const blocks = await this.notion.blocks.children.list({
        block_id: pageId,
      });

      const childPageIds = [];
      
      for (const block of blocks.results) {
        if (block.type === 'child_page') {
          childPageIds.push(block.id);
        }
        // Récursion pour les blocs qui peuvent contenir d'autres blocs
        if (block.has_children) {
          const nestedChildren = await this.findChildPages(block.id);
          childPageIds.push(...nestedChildren);
        }
      }

      return childPageIds;
    } catch (error) {
      console.log(chalk.gray(`ℹ️  Impossible de récupérer les sous-pages de ${pageId}: ${error.message}`));
      return [];
    }
  }

  /**
   * Exporte une base de données et toutes ses pages
   */
  async exportDatabase(databaseId, outputDir) {
    try {
      console.log(chalk.blue(`🗂️  Export de la base de données: ${databaseId}`));

      // Récupérer les informations de la base de données
      const dbInfo = await this.notion.databases.retrieve({ database_id: databaseId });
      const dbTitle = dbInfo.title?.[0]?.plain_text || 'Untitled Database';
      
      console.log(chalk.cyan(`📊 Base de données: "${dbTitle}"`));

      // Récupérer toutes les pages de la base de données
      const pages = [];
      let hasMore = true;
      let startCursor = undefined;

      while (hasMore) {
        const response = await this.notion.databases.query({
          database_id: databaseId,
          start_cursor: startCursor,
        });

        pages.push(...response.results);
        hasMore = response.has_more;
        startCursor = response.next_cursor;
      }

      console.log(chalk.cyan(`📋 ${pages.length} pages trouvées dans la base de données`));

      // Exporter chaque page
      const exportedPages = [];
      for (const page of pages) {
        const result = await this.exportPage(page.id, outputDir);
        if (result) {
          exportedPages.push(result);
        }
        
        // Petite pause pour éviter les limites de débit
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Créer un fichier index pour la base de données
      const indexPath = path.join(outputDir, `_DATABASE_${this.cleanFilename(dbTitle)}.md`);
      const indexContent = this.generateDatabaseIndex(dbTitle, dbInfo, exportedPages);
      fs.writeFileSync(indexPath, indexContent, 'utf8');

      console.log(chalk.green(`✅ Index de la base de données créé: _DATABASE_${this.cleanFilename(dbTitle)}.md`));

      return {
        databaseId,
        title: dbTitle,
        pagesExported: exportedPages.length,
        indexPath
      };

    } catch (error) {
      console.error(chalk.red(`❌ Erreur lors de l'export de la base de données ${databaseId}:`), error.message);
      return null;
    }
  }

  /**
   * Génère un fichier index pour une base de données
   */
  generateDatabaseIndex(title, dbInfo, exportedPages) {
    const content = [
      `# ${title}`,
      '',
      `**Type:** Base de données Notion`,
      `**ID:** ${dbInfo.id}`,
      `**Créée:** ${dbInfo.created_time || 'Inconnue'}`,
      `**Dernière modification:** ${dbInfo.last_edited_time || 'Inconnue'}`,
      `**URL:** ${dbInfo.url || ''}`,
      '',
      '---',
      '',
      `## Pages exportées (${exportedPages.length})`,
      '',
    ];

    // Ajouter la liste des pages exportées
    for (const page of exportedPages) {
      content.push(`- [${page.title}](./${page.filename})`);
    }

    content.push('');
    content.push('---');
    content.push('');
    content.push('*Exporté avec Goldberg\'s Variations Notion Exporter*');

    return content.join('\n');
  }

  /**
   * Détermine le type d'ID Notion et lance l'export approprié
   */
  async exportNotionId(notionId, outputDir) {
    // Nettoyer l'ID
    const cleanId = notionId.replace(/-/g, '').replace(/\s/g, '');
    
    console.log(chalk.blue(`🔍 Analyse de l'ID: ${cleanId}`));

    try {
      // Tenter d'abord comme page
      await this.notion.pages.retrieve({ page_id: cleanId });
      console.log(chalk.green(`✅ ID reconnu comme page`));
      return await this.exportPage(cleanId, outputDir);
    } catch (pageError) {
      console.log(chalk.gray(`ℹ️  Pas une page: ${pageError.message}`));
    }

    try {
      // Tenter comme base de données
      await this.notion.databases.retrieve({ database_id: cleanId });
      console.log(chalk.green(`✅ ID reconnu comme base de données`));
      return await this.exportDatabase(cleanId, outputDir);
    } catch (dbError) {
      console.log(chalk.gray(`ℹ️  Pas une base de données: ${dbError.message}`));
    }

    throw new Error(`Impossible de déterminer le type d'ID: ${notionId}`);
  }
}

// Configuration de la CLI
program
  .name('goldbergs-notion-export')
  .description('Export Notion databases and pages to markdown with media files')
  .version('1.0.0')
  .option('-i, --id <notion-id>', 'Notion page or database ID to export')
  .option('-o, --output <directory>', 'Output directory', CONFIG.outputDir)
  .option('-t, --token <token>', 'Notion integration token')
  .option('--media-dir <directory>', 'Media subdirectory name', CONFIG.mediaDir)
  .helpOption('-h, --help', 'Afficher l\'aide');

program.parse();

// Fonction principale
async function main() {
  const options = program.opts();
  
  try {
    // Bannière
    console.log(chalk.cyan.bold('\n🎼 Goldberg\'s Variations - Notion Exporter'));
    console.log(chalk.gray('Export Notion content to markdown with media files\n'));

    // Validation du token
    const token = options.token || CONFIG.notionToken;
    if (!token) {
      console.error(chalk.red('❌ Token Notion requis.'));
      console.log(chalk.yellow('💡 Créez un fichier .env avec NOTION_TOKEN=your_token'));
      console.log(chalk.yellow('   Ou utilisez --token YOUR_TOKEN'));
      console.log(chalk.blue('\n📖 Pour obtenir un token:'));
      console.log(chalk.gray('   1. https://www.notion.so/my-integrations'));
      console.log(chalk.gray('   2. Créez une nouvelle intégration'));
      console.log(chalk.gray('   3. Copiez le token secret'));
      console.log(chalk.gray('   4. Partagez votre page/DB avec l\'intégration'));
      process.exit(1);
    }

    // Validation de l'ID
    const notionId = options.id || CONFIG.defaultNotionId;
    if (!notionId) {
      console.error(chalk.red('❌ ID Notion requis.'));
      console.log(chalk.yellow('💡 Utilisez --id YOUR_NOTION_ID'));
      console.log(chalk.yellow('   Ou définissez DEFAULT_NOTION_ID dans .env'));
      process.exit(1);
    }

    // Configuration des chemins
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const outputDir = path.resolve(options.output, `notion_export_${timestamp}`);

    // Démarrage de l'export
    console.log(chalk.blue('🚀 Démarrage de l\'export Notion'));
    console.log(chalk.gray(`📂 Dossier de sortie: ${outputDir}`));
    console.log(chalk.gray(`🎯 ID Notion: ${notionId}`));
    console.log(chalk.gray(`📁 Dossier média: ${options.mediaDir || CONFIG.mediaDir}`));
    console.log(chalk.gray('─'.repeat(50)));

    // Créer l'exporteur et lancer l'export
    const exporter = new GoldbergsNotionExporter(token);
    const result = await exporter.exportNotionId(notionId, outputDir);

    if (result) {
      console.log(chalk.green('\n✅ Export terminé avec succès!'));
      console.log(chalk.cyan(`📁 Fichiers sauvegardés dans: ${outputDir}`));
      
      // Statistiques
      if (result.pagesExported) {
        console.log(chalk.cyan(`📊 ${result.pagesExported} pages exportées`));
      }
    } else {
      console.log(chalk.red('\n❌ Échec de l\'export'));
      process.exit(1);
    }

  } catch (error) {
    console.error(chalk.red('\n❌ Erreur durant l\'export:'), error.message);
    if (process.env.NODE_ENV === 'development') {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(console.error);
} 