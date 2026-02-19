# Games for My Kids 🎮

A collection of educational browser games for grades 2–6, featuring interactive experiences for learning history, language arts, math, and computer skills. Some games include dyslexia and ADHD accommodations.

## Available Games

The main [index.html](index.html) automatically lists all available games. Current games:

### History & Classical Civilization
- **[Odyssey of the Ages](ancient-greece-rpg/)** — Ancient Greece RPG adventure
- **[Time Travel Rome](roman-quiz/)** — The Rise and Fall of Rome interactive adventure
- **[Meet the Roman Emperors](roman-emperors-quiz/)** — Quiz game on Roman emperors
- **[Catacombs & Creeds](catacombs-and-creeds/)** — Educational dungeon crawler (Latin vocabulary, Roman history); dyslexia/ADHD accommodations

### Language Arts
- **[Punctuation Defender](grammar-quiz/)** — Save the grammar! Interactive punctuation practice

### Mathematics
- **[Magical Math Coloring](math-coloring/)** — Solve math problems to color pictures
- **[Magical Math Coloring 2](math-coloring-2/)** — 25-lesson 2nd grade math curriculum; 7 animal themes; color-by-number with math problems

### Computer Skills
- **[Keyboard Quest](keyboard-quest/)** — Learn macOS keyboard shortcuts
- **[Keyboard Quest 2](keyboard-quest-2/)** — Advanced keyboard shortcut training
- **[Keyboard Quest 3](keyboard-quest-3/)** — Pro-level keyboard commands

## Automatic Index Updates

This repository uses GitHub Actions to automatically keep the main index page updated when games are added or removed.

### How It Works

1. **Workflow Trigger**: The workflow runs on any push to the `main` branch (excluding changes to `index.html` itself)
2. **Game Detection**: A Node.js script scans all directories for games (identified by having an `index.html` file)
3. **Index Generation**: The script generates an updated `index.html` with all discovered games, sorted by category
4. **Smart Commits**: Changes are committed with `[skip ci]` to prevent infinite loops

### Workflow Files

- [`.github/workflows/update-index.yml`](.github/workflows/update-index.yml) — GitHub Actions workflow
- [`.github/scripts/update-index.js`](.github/scripts/update-index.js) — Index generation script

### Adding a New Game

1. Create a new directory with your game name (e.g., `my-new-game/`)
2. Add an `index.html` file inside that directory — the `<title>` tag is used as the game title
3. To customize the index card (icon, title, description, category), add an entry to `manualGameConfig` in `.github/scripts/update-index.js`
4. Commit and push — GitHub Actions automatically updates the main index page

### Manual Index Update

```bash
node .github/scripts/update-index.js
```

## Development

Each game is self-contained in its own directory with no shared libraries between games. All games are plain HTML/CSS/JavaScript with no build step — edit files directly and open in a browser. See [CLAUDE.md](CLAUDE.md) for architecture details and per-game development notes.

## License

These games are created for educational purposes.
