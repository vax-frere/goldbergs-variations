#!/usr/bin/env python3
"""
Script pour exporter récursivement le contenu d'une page ou base de données Notion.

Usage:
    python export_notion.py <notion_id> [--token NOTION_TOKEN] [--format json|markdown]

Dépendances:
    pip install notion-client requests

Configuration:
    - Créer une intégration Notion : https://www.notion.so/my-integrations
    - Copier le token d'intégration
    - Partager la page/base de données avec l'intégration
"""

import os
import sys
import json
import argparse
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional

try:
    from notion_client import Client
    import requests
    from dotenv import load_dotenv
    from urllib.parse import urlparse, unquote
    import mimetypes
    import hashlib
except ImportError:
    print("❌ Dépendances manquantes. Installez avec:")
    print("pip install notion-client requests python-dotenv")
    sys.exit(1)

class NotionExporter:
    def __init__(self, token: str, output_dir: str = "output"):
        """
        Initialise l'exporteur Notion
        
        Args:
            token: Token d'authentification Notion
            output_dir: Dossier de sortie pour les exports
        """
        self.client = Client(auth=token)
        self.output_dir = output_dir
        self.exported_pages = set()  # Pour éviter les boucles infinies
        self.media_dir = os.path.join(output_dir, "media")  # Dossier pour les fichiers média
        
        # Créer les dossiers de sortie
        os.makedirs(output_dir, exist_ok=True)
        os.makedirs(self.media_dir, exist_ok=True)
        
    def clean_filename(self, text: str) -> str:
        """Nettoie un texte pour en faire un nom de fichier valide"""
        # Remplacer les caractères non valides
        invalid_chars = '<>:"/\\|?*'
        for char in invalid_chars:
            text = text.replace(char, '_')
        
        # Limiter la longueur et supprimer les espaces en début/fin
        return text.strip()[:100]
    
    def download_file(self, url: str, filename: str = None) -> str:
        """Télécharge un fichier depuis une URL et retourne le chemin local"""
        try:
            response = requests.get(url, stream=True)
            response.raise_for_status()
            
            # Générer un nom de fichier si non fourni
            if not filename:
                parsed_url = urlparse(url)
                filename = os.path.basename(unquote(parsed_url.path))
                
                # Si pas d'extension, essayer de la deviner depuis le content-type
                if '.' not in filename:
                    content_type = response.headers.get('content-type', '')
                    extension = mimetypes.guess_extension(content_type.split(';')[0])
                    if extension:
                        filename += extension
                    else:
                        # Générer un nom unique basé sur l'URL
                        url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
                        filename = f"file_{url_hash}"
            
            # Nettoyer le nom de fichier
            filename = self.clean_filename(filename)
            if not filename:
                filename = f"file_{hashlib.md5(url.encode()).hexdigest()[:8]}"
            
            file_path = os.path.join(self.media_dir, filename)
            
            # Éviter de télécharger le même fichier plusieurs fois
            if os.path.exists(file_path):
                return os.path.relpath(file_path, self.output_dir)
            
            with open(file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            
            print(f"📎 Fichier téléchargé: {filename}")
            return os.path.relpath(file_path, self.output_dir)
            
        except Exception as e:
            print(f"❌ Erreur lors du téléchargement de {url}: {e}")
            return url  # Retourner l'URL originale en cas d'échec
    
    def extract_text_from_blocks(self, blocks: List[Dict]) -> str:
        """Extrait le texte des blocs Notion pour créer du contenu markdown"""
        content = []
        
        for block in blocks:
            block_type = block.get('type', '')
            
            if block_type == 'paragraph':
                text = self.extract_rich_text(block.get('paragraph', {}).get('rich_text', []))
                if text:
                    content.append(text)
                    
            elif block_type == 'heading_1':
                text = self.extract_rich_text(block.get('heading_1', {}).get('rich_text', []))
                if text:
                    content.append(f"# {text}")
                    
            elif block_type == 'heading_2':
                text = self.extract_rich_text(block.get('heading_2', {}).get('rich_text', []))
                if text:
                    content.append(f"## {text}")
                    
            elif block_type == 'heading_3':
                text = self.extract_rich_text(block.get('heading_3', {}).get('rich_text', []))
                if text:
                    content.append(f"### {text}")
                    
            elif block_type == 'bulleted_list_item':
                text = self.extract_rich_text(block.get('bulleted_list_item', {}).get('rich_text', []))
                if text:
                    content.append(f"- {text}")
                    
            elif block_type == 'numbered_list_item':
                text = self.extract_rich_text(block.get('numbered_list_item', {}).get('rich_text', []))
                if text:
                    content.append(f"1. {text}")
                    
            elif block_type == 'quote':
                text = self.extract_rich_text(block.get('quote', {}).get('rich_text', []))
                if text:
                    content.append(f"> {text}")
                    
            elif block_type == 'code':
                code_block = block.get('code', {})
                text = self.extract_rich_text(code_block.get('rich_text', []))
                language = code_block.get('language', '')
                if text:
                    content.append(f"```{language}\n{text}\n```")
                    
            elif block_type == 'image':
                image_block = block.get('image', {})
                image_url = None
                caption = ""
                
                # Récupérer l'URL de l'image
                if 'external' in image_block:
                    image_url = image_block['external'].get('url')
                elif 'file' in image_block:
                    image_url = image_block['file'].get('url')
                
                # Récupérer la légende
                if 'caption' in image_block:
                    caption = self.extract_rich_text(image_block['caption'])
                
                if image_url:
                    local_path = self.download_file(image_url)
                    if caption:
                        content.append(f"![{caption}]({local_path})")
                    else:
                        content.append(f"![]({local_path})")
                        
            elif block_type == 'video':
                video_block = block.get('video', {})
                video_url = None
                caption = ""
                
                if 'external' in video_block:
                    video_url = video_block['external'].get('url')
                elif 'file' in video_block:
                    video_url = video_block['file'].get('url')
                
                if 'caption' in video_block:
                    caption = self.extract_rich_text(video_block['caption'])
                
                if video_url:
                    if video_url.startswith('http') and ('youtube.com' in video_url or 'youtu.be' in video_url or 'vimeo.com' in video_url):
                        # Vidéo externe - garder le lien
                        content.append(f"🎥 **Vidéo**: [{caption or 'Vidéo'}]({video_url})")
                    else:
                        # Fichier vidéo - télécharger
                        local_path = self.download_file(video_url)
                        content.append(f"🎥 **Vidéo**: [{caption or 'Vidéo'}]({local_path})")
                        
            elif block_type == 'audio':
                audio_block = block.get('audio', {})
                audio_url = None
                caption = ""
                
                if 'external' in audio_block:
                    audio_url = audio_block['external'].get('url')
                elif 'file' in audio_block:
                    audio_url = audio_block['file'].get('url')
                
                if 'caption' in audio_block:
                    caption = self.extract_rich_text(audio_block['caption'])
                
                if audio_url:
                    local_path = self.download_file(audio_url)
                    content.append(f"🎵 **Audio**: [{caption or 'Audio'}]({local_path})")
                    
            elif block_type == 'file':
                file_block = block.get('file', {})
                file_url = None
                name = ""
                
                if 'external' in file_block:
                    file_url = file_block['external'].get('url')
                elif 'file' in file_block:
                    file_url = file_block['file'].get('url')
                
                if 'name' in file_block:
                    name = file_block['name']
                
                if file_url:
                    local_path = self.download_file(file_url, name)
                    content.append(f"📎 **Fichier**: [{name or 'Télécharger'}]({local_path})")
                    
            elif block_type == 'pdf':
                pdf_block = block.get('pdf', {})
                pdf_url = None
                caption = ""
                
                if 'external' in pdf_block:
                    pdf_url = pdf_block['external'].get('url')
                elif 'file' in pdf_block:
                    pdf_url = pdf_block['file'].get('url')
                
                if 'caption' in pdf_block:
                    caption = self.extract_rich_text(pdf_block['caption'])
                
                if pdf_url:
                    local_path = self.download_file(pdf_url)
                    content.append(f"📄 **PDF**: [{caption or 'Document PDF'}]({local_path})")
                    
            elif block_type == 'embed':
                embed_block = block.get('embed', {})
                embed_url = embed_block.get('url', '')
                caption = ""
                
                if 'caption' in embed_block:
                    caption = self.extract_rich_text(embed_block['caption'])
                
                if embed_url:
                    content.append(f"🔗 **Embed**: [{caption or 'Contenu intégré'}]({embed_url})")
                    
            elif block_type == 'bookmark':
                bookmark_block = block.get('bookmark', {})
                bookmark_url = bookmark_block.get('url', '')
                caption = ""
                
                if 'caption' in bookmark_block:
                    caption = self.extract_rich_text(bookmark_block['caption'])
                
                if bookmark_url:
                    content.append(f"🔖 **Signet**: [{caption or 'Lien'}]({bookmark_url})")
                    
            elif block_type == 'callout':
                callout_block = block.get('callout', {})
                text = self.extract_rich_text(callout_block.get('rich_text', []))
                icon = callout_block.get('icon', {})
                
                icon_text = ""
                if 'emoji' in icon:
                    icon_text = icon['emoji']
                elif 'external' in icon:
                    icon_text = "🔗"
                elif 'file' in icon:
                    icon_text = "📎"
                
                if text:
                    content.append(f"> {icon_text} {text}")
                    
            elif block_type == 'toggle':
                toggle_block = block.get('toggle', {})
                text = self.extract_rich_text(toggle_block.get('rich_text', []))
                if text:
                    content.append(f"▶️ **{text}**")
                    
            elif block_type == 'divider':
                content.append("---")
                
            elif block_type == 'table_of_contents':
                content.append("📋 **Table des matières**")
                
            # Gérer les blocs avec enfants (comme les toggle, colonnes, etc.)
            if block.get('has_children', False):
                children = self.get_page_blocks(block['id'])
                if children:
                    child_content = self.extract_text_from_blocks(children)
                    if child_content:
                        content.append(child_content)
        
        return '\n\n'.join(content)
    
    def extract_rich_text(self, rich_text: List[Dict]) -> str:
        """Extrait le texte d'un tableau rich_text Notion avec formatage markdown"""
        result = []
        
        for item in rich_text:
            text = item.get('plain_text', '')
            if not text:
                continue
                
            # Appliquer le formatage
            annotations = item.get('annotations', {})
            
            if annotations.get('bold', False):
                text = f"**{text}**"
            if annotations.get('italic', False):
                text = f"*{text}*"
            if annotations.get('strikethrough', False):
                text = f"~~{text}~~"
            if annotations.get('underline', False):
                text = f"<u>{text}</u>"
            if annotations.get('code', False):
                text = f"`{text}`"
                
            # Gérer les liens
            if item.get('href'):
                text = f"[{text}]({item['href']})"
                
            # Gérer les couleurs (comme commentaire)
            color = annotations.get('color', 'default')
            if color != 'default' and color != 'gray':
                text = f"{text} <!-- couleur: {color} -->"
            
            result.append(text)
        
        return ''.join(result)
    
    def get_page_info(self, page_id: str) -> Dict[str, Any]:
        """Récupère les informations d'une page"""
        try:
            page = self.client.pages.retrieve(page_id=page_id)
            return page
        except Exception as e:
            print(f"❌ Erreur lors de la récupération de la page {page_id}: {e}")
            return {}
    
    def get_database_info(self, database_id: str) -> Dict[str, Any]:
        """Récupère les informations d'une base de données"""
        try:
            database = self.client.databases.retrieve(database_id=database_id)
            return database
        except Exception as e:
            print(f"❌ Erreur lors de la récupération de la base de données {database_id}: {e}")
            return {}
    
    def get_page_blocks(self, page_id: str) -> List[Dict]:
        """Récupère tous les blocs d'une page de manière récursive"""
        all_blocks = []
        
        try:
            # Récupérer les blocs de la page
            blocks = self.client.blocks.children.list(block_id=page_id)
            
            for block in blocks['results']:
                all_blocks.append(block)
                
                # Si le bloc a des enfants, les récupérer récursivement
                if block.get('has_children', False):
                    children = self.get_page_blocks(block['id'])
                    all_blocks.extend(children)
                    
        except Exception as e:
            print(f"❌ Erreur lors de la récupération des blocs de {page_id}: {e}")
        
        return all_blocks
    
    def get_database_pages(self, database_id: str) -> List[Dict]:
        """Récupère toutes les pages d'une base de données"""
        pages = []
        
        try:
            # Récupérer toutes les pages de la base de données
            results = self.client.databases.query(database_id=database_id)
            pages.extend(results['results'])
            
            # Gérer la pagination
            while results.get('has_more', False):
                results = self.client.databases.query(
                    database_id=database_id,
                    start_cursor=results['next_cursor']
                )
                pages.extend(results['results'])
                
        except Exception as e:
            print(f"❌ Erreur lors de la récupération des pages de la base de données {database_id}: {e}")
        
        return pages
    
    def export_page(self, page_id: str, format_type: str = "json") -> Dict[str, Any]:
        """Exporte une page au format spécifié"""
        if page_id in self.exported_pages:
            print(f"⚠️  Page {page_id} déjà exportée, ignorée pour éviter la boucle")
            return {}
        
        self.exported_pages.add(page_id)
        
        print(f"📄 Export de la page: {page_id}")
        
        # Récupérer les informations de la page
        page_info = self.get_page_info(page_id)
        if not page_info:
            return {}
        
        # Récupérer les blocs de la page
        blocks = self.get_page_blocks(page_id)
        
        # Extraire le titre de la page
        title = "Untitled"
        properties = page_info.get('properties', {})
        for prop_name, prop_data in properties.items():
            if prop_data.get('type') == 'title':
                title_array = prop_data.get('title', [])
                if title_array:
                    title = self.extract_rich_text(title_array)
                    break
        
        # Créer les données d'export
        export_data = {
            'id': page_id,
            'title': title,
            'created_time': page_info.get('created_time'),
            'last_edited_time': page_info.get('last_edited_time'),
            'properties': properties,
            'blocks': blocks,
            'url': page_info.get('url', '')
        }
        
        # Sauvegarder selon le format demandé
        safe_title = self.clean_filename(title)
        
        if format_type.lower() == "json":
            output_file = os.path.join(self.output_dir, f"{safe_title}_{page_id}.json")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            print(f"💾 Sauvegardé: {output_file}")
            
        elif format_type.lower() == "markdown":
            content = self.extract_text_from_blocks(blocks)
            output_file = os.path.join(self.output_dir, f"{safe_title}_{page_id}.md")
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(f"# {title}\n\n")
                f.write(f"**Created:** {page_info.get('created_time', 'Unknown')}\n")
                f.write(f"**Last edited:** {page_info.get('last_edited_time', 'Unknown')}\n")
                f.write(f"**URL:** {page_info.get('url', '')}\n\n")
                f.write("---\n\n")
                f.write(content)
            print(f"💾 Sauvegardé: {output_file}")
        
        return export_data
    
    def export_database(self, database_id: str, format_type: str = "json") -> Dict[str, Any]:
        """Exporte une base de données et toutes ses pages"""
        print(f"🗂️  Export de la base de données: {database_id}")
        
        # Récupérer les informations de la base de données
        db_info = self.get_database_info(database_id)
        if not db_info:
            return {}
        
        # Récupérer toutes les pages de la base de données
        pages = self.get_database_pages(database_id)
        
        # Exporter chaque page
        exported_pages = []
        for page in pages:
            page_data = self.export_page(page['id'], format_type)
            if page_data:
                exported_pages.append(page_data)
        
        # Créer les données d'export de la base de données
        db_title = db_info.get('title', [{}])[0].get('plain_text', 'Untitled Database')
        safe_title = self.clean_filename(db_title)
        
        export_data = {
            'id': database_id,
            'title': db_title,
            'created_time': db_info.get('created_time'),
            'last_edited_time': db_info.get('last_edited_time'),
            'properties': db_info.get('properties', {}),
            'pages': exported_pages,
            'url': db_info.get('url', '')
        }
        
        # Sauvegarder la base de données
        if format_type.lower() == "json":
            output_file = os.path.join(self.output_dir, f"database_{safe_title}_{database_id}.json")
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, indent=2, ensure_ascii=False, default=str)
            print(f"💾 Base de données sauvegardée: {output_file}")
        
        return export_data
    
    def export_notion_id(self, notion_id: str, format_type: str = "json") -> Dict[str, Any]:
        """Détermine le type d'ID Notion et lance l'export approprié"""
        # Nettoyer l'ID (supprimer les tirets et espaces)
        clean_id = notion_id.replace('-', '').replace(' ', '')
        
        print(f"🔍 Analyse de l'ID: {clean_id}")
        
        # Tenter d'abord comme page
        try:
            page_info = self.get_page_info(clean_id)
            if page_info:
                print(f"✅ ID reconnu comme page")
                return self.export_page(clean_id, format_type)
        except Exception as e:
            print(f"ℹ️  Pas une page: {e}")
        
        # Tenter comme base de données
        try:
            db_info = self.get_database_info(clean_id)
            if db_info:
                print(f"✅ ID reconnu comme base de données")
                return self.export_database(clean_id, format_type)
        except Exception as e:
            print(f"ℹ️  Pas une base de données: {e}")
        
        print(f"❌ Impossible de déterminer le type d'ID: {notion_id}")
        print("💡 Vérifiez que:")
        print("   - L'ID est correct")
        print("   - La page/base de données est partagée avec votre intégration")
        print("   - Votre token a les bonnes permissions")
        return {}

def main():
    # Charger le fichier .env depuis le dossier scripts
    script_dir = os.path.dirname(os.path.abspath(__file__))
    env_path = os.path.join(script_dir, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"✅ Fichier .env chargé depuis: {env_path}")
    else:
        print(f"⚠️  Fichier .env non trouvé dans: {env_path}")
    
    parser = argparse.ArgumentParser(description="Exporter récursivement le contenu Notion")
    parser.add_argument("notion_id", help="ID de la page ou base de données Notion")
    parser.add_argument("--token", help="Token d'authentification Notion (ou variable d'environnement NOTION_TOKEN)")
    parser.add_argument("--format", choices=["json", "markdown"], default="markdown", 
                       help="Format d'export (markdown par défaut ou json)")
    parser.add_argument("--output", default="output", help="Dossier de sortie")
    
    args = parser.parse_args()
    
    # Récupérer le token
    token = args.token or os.getenv('NOTION_TOKEN')
    if not token:
        print("❌ Token Notion requis.")
        print("Utilisez --token TOKEN ou définissez la variable d'environnement NOTION_TOKEN")
        print("\nPour obtenir un token:")
        print("1. Allez sur https://www.notion.so/my-integrations")
        print("2. Créez une nouvelle intégration")
        print("3. Copiez le token généré")
        print("4. Partagez votre page/base de données avec l'intégration")
        sys.exit(1)
    
    # Créer le dossier de sortie avec timestamp dans scripts/output
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output_dir = os.path.join(script_dir, args.output, f"notion_export_{timestamp}")
    
    # Démarrer l'export
    print(f"🚀 Démarrage de l'export Notion")
    print(f"📂 Dossier de sortie: {output_dir}")
    print(f"🎯 ID Notion: {args.notion_id}")
    print(f"📄 Format: {args.format}")
    print("-" * 50)
    
    try:
        exporter = NotionExporter(token, output_dir)
        result = exporter.export_notion_id(args.notion_id, args.format)
        
        if result:
            print(f"\n✅ Export terminé avec succès!")
            print(f"📁 Fichiers sauvegardés dans: {output_dir}")
        else:
            print(f"\n❌ Échec de l'export")
            
    except Exception as e:
        print(f"\n❌ Erreur durant l'export: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 