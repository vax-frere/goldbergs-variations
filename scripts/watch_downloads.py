#!/usr/bin/env python3
"""
Script pour surveiller le répertoire Téléchargements et déplacer les fichiers '.data.json'
vers le dossier ./client/public/data/
"""

import os
import sys
import time
import shutil
import platform
import re
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class DownloadsHandler(FileSystemEventHandler):
    def __init__(self, target_dir):
        self.target_dir = target_dir
        # S'assurer que le dossier cible existe
        os.makedirs(target_dir, exist_ok=True)
        
    def on_created(self, event):
        # On ne traite que les créations de fichiers (pas les dossiers)
        if not event.is_directory and event.src_path.endswith('.data.json'):
            self._process_file(event.src_path)
            
    def on_modified(self, event):
        # On vérifie aussi les modifications pour être sûr de ne pas manquer des fichiers
        if not event.is_directory and event.src_path.endswith('.data.json'):
            self._process_file(event.src_path)
    
    def _process_file(self, file_path):
        # Obtenir juste le nom du fichier (sans le chemin)
        file_name = os.path.basename(file_path)
        
        # Nettoyer le nom du fichier en supprimant les numéros de version (ex: " (2)", " (3)", etc.)
        clean_file_name = re.sub(r' \(\d+\)', '', file_name)
        target_path = os.path.join(self.target_dir, clean_file_name)
        
        try:
            # Vérifier que le fichier existe toujours
            if not os.path.exists(file_path):
                print(f"Fichier {file_path} détecté mais n'existe plus")
                return
                
            # Attendre que le fichier soit complètement écrit
            # (parfois les fichiers sont encore en cours d'écriture quand l'événement est déclenché)
            time.sleep(0.5)
            
            # Copier le fichier à destination et remplacer s'il existe déjà
            shutil.copy2(file_path, target_path)
            print(f"Fichier copié : {file_path} -> {target_path}")
            if clean_file_name != file_name:
                print(f"Nom nettoyé : {file_name} -> {clean_file_name}")
            
            # Supprimer le fichier original
            os.unlink(file_path)
            print(f"Fichier original supprimé : {file_path}")
            
        except Exception as e:
            print(f"Erreur lors du traitement du fichier {file_path}: {str(e)}")

def get_downloads_dir():
    """Détermine le chemin du dossier Téléchargements en fonction du système d'exploitation"""
    if platform.system() == "Windows":
        return os.path.join(os.path.expanduser("~"), "Downloads")
    elif platform.system() == "Darwin":  # macOS
        return os.path.join(os.path.expanduser("~"), "Downloads")
    else:  # Linux et autres
        # La plupart des distributions Linux utilisent ~/Downloads
        return os.path.join(os.path.expanduser("~"), "Downloads")

def main():
    # Chemin du dossier à surveiller (Téléchargements)
    downloads_dir = get_downloads_dir()
    
    # Chemin du dossier cible
    script_dir = os.path.dirname(os.path.abspath(__file__))
    workspace_dir = os.path.abspath(os.path.join(script_dir, ".."))
    target_dir = os.path.join(workspace_dir, "public", "data")
    
    print(f"Surveillance du dossier : {downloads_dir}")
    print(f"Déplacement des fichiers '.data.json' vers : {target_dir}")
    
    # Vérifier si des fichiers .data.json sont déjà présents dans le dossier Downloads
    for file in os.listdir(downloads_dir):
        if file.endswith(".data.json"):
            full_path = os.path.join(downloads_dir, file)
            
            # Nettoyer le nom du fichier en supprimant les numéros de version
            clean_file_name = re.sub(r' \(\d+\)', '', file)
            target_path = os.path.join(target_dir, clean_file_name)
            
            try:
                # Vérifier que le fichier existe toujours
                if not os.path.exists(full_path):
                    print(f"Fichier {full_path} détecté mais n'existe plus")
                    continue
                    
                shutil.copy2(full_path, target_path)
                print(f"Fichier existant copié : {full_path} -> {target_path}")
                if clean_file_name != file:
                    print(f"Nom nettoyé : {file} -> {clean_file_name}")
                os.unlink(full_path)
                print(f"Fichier original supprimé : {full_path}")
            except Exception as e:
                print(f"Erreur lors du traitement du fichier existant {full_path}: {str(e)}")
    
    # Créer et démarrer l'observateur
    event_handler = DownloadsHandler(target_dir)
    observer = Observer()
    observer.schedule(event_handler, downloads_dir, recursive=False)
    observer.start()
    
    try:
        print("Monitoring started. Press Ctrl+C to stop.")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == "__main__":
    main() 