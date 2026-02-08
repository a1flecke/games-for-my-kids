# Games for My Kids 🎮

A collection of educational games for children, featuring interactive experiences for learning about history, language, math, and computer skills.

## Available Games

The main [index.html](index.html) automatically lists all available games, which currently include:

### History & Classical Civilization
- **Odyssey of the Ages** - Ancient Greece RPG adventure
- **Roman Quiz** - Learn about Roman culture and history  
- **Roman Emperors Quiz** - Test knowledge of Roman emperors

### Language Arts
- **Grammar Quiz** - Interactive grammar practice

### Mathematics
- **Math Coloring** - Combine math with creative coloring

### Computer Skills
- **Keyboard Quest** - Learn macOS keyboard shortcuts
- **Keyboard Quest 2** - Advanced keyboard shortcut training

## Automatic Index Updates

This repository uses GitHub Actions to automatically keep the main index page updated when games are added or removed.

### How It Works

1. **Workflow Trigger**: The workflow runs on any push to the `main` branch (excluding changes to `index.html` itself)
2. **Game Detection**: A Node.js script scans all directories for games (identified by having an `index.html` file)
3. **Index Generation**: The script generates an updated `index.html` with all discovered games, sorted by category
4. **Smart Commits**: Changes are committed with `[skip ci]` to prevent infinite loops

### Workflow Files

- [`.github/workflows/update-index.yml`](.github/workflows/update-index.yml) - GitHub Actions workflow
- [`.github/scripts/update-index.js`](.github/scripts/update-index.js) - Index generation script

### Adding a New Game

To add a new game:

1. Create a new directory with your game name (e.g., `my-new-game/`)
2. Add an `index.html` file inside that directory
3. Commit and push your changes
4. The GitHub Actions workflow will automatically update the main index page

The script extracts the game title from the `<title>` tag in each game's `index.html` file.

### Manual Index Update

You can also manually regenerate the index locally:

```bash
node .github/scripts/update-index.js
```

## Development

Each game is self-contained in its own directory with its own `index.html` and assets. Games are designed to be simple HTML/CSS/JavaScript applications that can run entirely in the browser.

## License

These games are created for educational purposes.
