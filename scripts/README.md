# Downloads Monitoring Script

This Python script monitors the user's `Downloads` folder and automatically moves files ending with `.data.json` to the application's `./client/public/data/` folder.

## Features

- Real-time monitoring of the Downloads folder
- Moving `.data.json` files to the target folder
- Replacing existing files with the same name
- Works on Windows, macOS, and Linux

## Prerequisites

To run this script, you must have Python 3 installed along with the required dependencies.

```bash
pip install -r requirements.txt
```

## Usage

To start the script manually:

```bash
python watch_downloads.py
```

To configure the script to start automatically with the application, you can:

### On Windows

- Create a shortcut to the script in the Windows startup folder
- Or set up a scheduled task

### On macOS

- Create a .plist file in ~/Library/LaunchAgents
- Or use the Automator app to create a login service

### On Linux

- Add the script to your .bashrc or .profile file
- Or create a systemd service

## Stopping the Script

To stop the script, press Ctrl+C in the terminal where it is running.

## Behavior

- The script first checks if any .data.json files are already present in the Downloads folder and moves them.
- Then, it continuously monitors for new files and modifications.
- Each processed file is first copied to the destination, then deleted from the source.
