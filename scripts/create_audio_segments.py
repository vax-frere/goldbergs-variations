#!/usr/bin/env python3
"""
Script pour découper audio MP3 et sous-titres SRT en fragments
basé sur un array de timings définis.

Usage:
    python fragment_cutter.py audio.mp3 subtitles.srt

Dépendances:
    pip install pydub
"""

import os
import sys
import re
from pydub import AudioSegment
from typing import List, Tuple, Dict

# Configuration des fragments
FRAGMENTS = [
    {
        "id": "intro_enfance",
        "name": "Fragment Intro - Autistic Childhood",
        "start": "00:00:00",
        "end": "00:03:00",
        "description": "Autistic childhood, obsessions, first signs"
    },
    {
        "id": "internet_drogue",
        "name": "Internet as a Drug",
        "start": "00:03:00",
        "end": "00:04:25",
        "description": "Internet dream state, blurred line between real/virtual"
    },
    {
        "id": "premiers_trolls",
        "name": "First Trolls",
        "start": "00:05:09",
        "end": "00:06:42",
        "description": "Nintendo vs Sega, Colonel Sanders Wikipedia"
    },
    {
        "id": "exposition_precoce",
        "name": "Early Exposure",
        "start": "00:06:44",
        "end": "00:08:07",
        "description": "Pornography and gore at age 11"
    },
    {
        "id": "ambitions_creatives",
        "name": "Distorted Creative Ambitions",
        "start": "00:08:07",
        "end": "00:09:16",
        "description": "Films about Iraq and Hitler as a child"
    },
    {
        "id": "lama_viral",
        "name": "The Viral Llama",
        "start": "00:09:16",
        "end": "00:10:41",
        "description": "Viral photo, mockery, doxxing"
    },
    {
        "id": "shock_sites",
        "name": "Shock Sites",
        "start": "00:10:41",
        "end": "00:12:40",
        "description": "Snuff-X, dismemberments, cruelty realization"
    },
    {
        "id": "obsession_mal",
        "name": "Obsession with Evil",
        "start": "00:13:20",
        "end": "00:15:48",
        "description": "YSH227 serial killer IMDB, fixation"
    },
    {
        "id": "anonymat_cruaute",
        "name": "Anonymity and Cruelty",
        "start": "00:15:48",
        "end": "00:16:23",
        "description": "Anonymity reveals the worst of humanity"
    },
    {
        "id": "maitre_personas",
        "name": "Master of Personas",
        "start": "00:16:23",
        "end": "00:17:50",
        "description": "Ease at imitating all extremisms"
    },
    {
        "id": "fantasmes_destructeurs",
        "name": "Destructive Fantasies",
        "start": "00:18:38",
        "end": "00:19:56",
        "description": "Pyromania, virus to destroy humanity"
    },
    {
        "id": "intervention_ratee",
        "name": "Failed Intervention",
        "start": "00:19:56",
        "end": "00:21:19",
        "description": "Police called, self-harm, conflicts"
    },
    {
        "id": "art_illusion",
        "name": "The Art of Illusion",
        "start": "00:21:19",
        "end": "00:24:47",
        "description": "Mysterious aura, escape into characters"
    },
    {
        "id": "heros_vilain",
        "name": "Hero and Villain",
        "start": "00:24:47",
        "end": "00:26:49",
        "description": "Same person on both sides of conflict"
    },
    {
        "id": "gout_pouvoir",
        "name": "The Taste of Power",
        "start": "00:27:13",
        "end": "00:29:03",
        "description": "Times of Israel goes worldwide"
    },
    {
        "id": "ambitions_journalistiques",
        "name": "Journalistic Ambitions",
        "start": "00:29:03",
        "end": "00:29:58",
        "description": "Hope to become journalist through infiltration"
    }
]

def time_to_milliseconds(time_str: str) -> int:
    """Convertit un timestamp HH:MM:SS,mmm en millisecondes"""
    # Gérer les formats avec virgule ou point pour les millisecondes
    time_str = time_str.replace(',', '.')
    
    # Si pas de millisecondes, les ajouter
    if '.' not in time_str:
        time_str += '.000'
    
    parts = time_str.split(':')
    hours = int(parts[0])
    minutes = int(parts[1])
    seconds_parts = parts[2].split('.')
    seconds = int(seconds_parts[0])
    milliseconds = int(seconds_parts[1].ljust(3, '0')[:3])  # Assurer 3 chiffres
    
    total_ms = (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds
    return total_ms

def milliseconds_to_time(ms: int) -> str:
    """Convertit des millisecondes en timestamp SRT (HH:MM:SS,mmm)"""
    hours = ms // 3600000
    ms %= 3600000
    minutes = ms // 60000
    ms %= 60000
    seconds = ms // 1000
    milliseconds = ms % 1000
    
    return f"{hours:02d}:{minutes:02d}:{seconds:02d},{milliseconds:03d}"

def parse_srt(srt_content: str) -> List[Dict]:
    """Parse un fichier SRT et retourne une liste de sous-titres"""
    subtitles = []
    blocks = srt_content.strip().split('\n\n')
    
    for block in blocks:
        if not block.strip():
            continue
            
        lines = block.strip().split('\n')
        if len(lines) < 3:
            continue
            
        # Index du sous-titre
        index = int(lines[0])
        
        # Timing
        timing_line = lines[1]
        start_time, end_time = timing_line.split(' --> ')
        
        # Texte (peut être sur plusieurs lignes)
        text = '\n'.join(lines[2:])
        
        subtitles.append({
            'index': index,
            'start': start_time.strip(),
            'end': end_time.strip(),
            'text': text,
            'start_ms': time_to_milliseconds(start_time.strip()),
            'end_ms': time_to_milliseconds(end_time.strip())
        })
    
    return subtitles

def filter_subtitles_for_fragment(subtitles: List[Dict], fragment_start_ms: int, fragment_end_ms: int) -> List[Dict]:
    """Filtre et ajuste les sous-titres pour un fragment donné"""
    filtered_subs = []
    
    for sub in subtitles:
        # Vérifier si le sous-titre chevauche avec le fragment
        if sub['end_ms'] >= fragment_start_ms and sub['start_ms'] <= fragment_end_ms:
            # Ajuster les timings relatifs au début du fragment
            new_start_ms = max(0, sub['start_ms'] - fragment_start_ms)
            new_end_ms = min(fragment_end_ms - fragment_start_ms, sub['end_ms'] - fragment_start_ms)
            
            # Ne garder que si il reste du temps
            if new_end_ms > new_start_ms:
                filtered_subs.append({
                    'index': len(filtered_subs) + 1,
                    'start': milliseconds_to_time(new_start_ms),
                    'end': milliseconds_to_time(new_end_ms),
                    'text': sub['text'],
                    'start_ms': new_start_ms,
                    'end_ms': new_end_ms
                })
    
    return filtered_subs

def write_srt(subtitles: List[Dict], output_path: str):
    """Écrit les sous-titres dans un fichier SRT"""
    with open(output_path, 'w', encoding='utf-8') as f:
        for i, sub in enumerate(subtitles, 1):
            f.write(f"{i}\n")
            f.write(f"{sub['start']} --> {sub['end']}\n")
            f.write(f"{sub['text']}\n\n")

def main():
    if len(sys.argv) != 3:
        print("Usage: python fragment_cutter.py <audio.mp3> <subtitles.srt>")
        sys.exit(1)
    
    # Construire les chemins relatifs au dossier scripts
    script_dir = os.path.dirname(os.path.abspath(__file__))
    input_dir = os.path.join(script_dir, "input")
    output_dir = os.path.join(script_dir, "output")
    
    # Construire les chemins complets des fichiers d'entrée
    audio_path = os.path.join(input_dir, sys.argv[1])
    srt_path = os.path.join(input_dir, sys.argv[2])
    
    # Vérifier que les fichiers existent
    if not os.path.exists(audio_path):
        print(f"Erreur: Le fichier audio '{audio_path}' n'existe pas.")
        sys.exit(1)
    
    if not os.path.exists(srt_path):
        print(f"Erreur: Le fichier sous-titres '{srt_path}' n'existe pas.")
        sys.exit(1)
    
    # Créer le dossier output s'il n'existe pas
    os.makedirs(output_dir, exist_ok=True)
    
    # Vider le dossier output
    print("🧹 Nettoyage du dossier output...")
    for file in os.listdir(output_dir):
        file_path = os.path.join(output_dir, file)
        try:
            if os.path.isfile(file_path):
                os.unlink(file_path)
        except Exception as e:
            print(f"Erreur lors de la suppression de {file_path}: {e}")
    
    # Charger l'audio
    print("🎵 Chargement de l'audio...")
    audio = AudioSegment.from_mp3(audio_path)
    audio_duration_ms = len(audio)
    print(f"📊 Durée totale de l'audio: {milliseconds_to_time(audio_duration_ms)}")
    
    # Charger et vérifier les sous-titres
    print("📝 Chargement des sous-titres...")
    with open(srt_path, 'r', encoding='utf-8') as f:
        srt_content = f.read()
    subtitles = parse_srt(srt_content)
    
    # Vérifier la synchronisation des fragments avec l'audio
    print("🔍 Vérification de la synchronisation...")
    for fragment in FRAGMENTS:
        start_ms = time_to_milliseconds(fragment["start"])
        end_ms = time_to_milliseconds(fragment["end"])
        
        # Vérifier que le fragment ne dépasse pas la durée de l'audio
        if end_ms > audio_duration_ms:
            print(f"⚠️  Attention: Le fragment '{fragment['name']}' dépasse la durée de l'audio")
            print(f"   Durée audio: {milliseconds_to_time(audio_duration_ms)}")
            print(f"   Fin fragment: {fragment['end']}")
            # Ajuster la fin du fragment à la durée de l'audio
            fragment["end"] = milliseconds_to_time(audio_duration_ms)
            end_ms = audio_duration_ms
        
        # Vérifier qu'il y a des sous-titres dans ce fragment
        fragment_subs = filter_subtitles_for_fragment(subtitles, start_ms, end_ms)
        if not fragment_subs:
            print(f"⚠️  Attention: Aucun sous-titre trouvé pour le fragment '{fragment['name']}'")
    
    # Traiter chaque fragment
    for fragment in FRAGMENTS:
        print(f"\n🔄 Traitement du fragment: {fragment['name']}")
        
        # Extraire l'audio
        start_ms = time_to_milliseconds(fragment["start"])
        end_ms = time_to_milliseconds(fragment["end"])
        audio_segment = audio[start_ms:end_ms]
        
        # Filtrer les sous-titres
        fragment_subs = filter_subtitles_for_fragment(subtitles, start_ms, end_ms)
        
        # Générer les noms de fichiers
        audio_output = os.path.join(output_dir, f"{fragment['id']}.mp3")
        srt_output = os.path.join(output_dir, f"{fragment['id']}.srt")
        
        # Sauvegarder l'audio
        print(f"💾 Sauvegarde de l'audio: {audio_output}")
        audio_segment.export(audio_output, format="mp3")
        
        # Sauvegarder les sous-titres
        print(f"💾 Sauvegarde des sous-titres: {srt_output}")
        write_srt(fragment_subs, srt_output)
        
        print(f"✅ Fragment traité: {len(fragment_subs)} sous-titres")
    
    print("\n✨ Traitement terminé!")

if __name__ == "__main__":
    main()