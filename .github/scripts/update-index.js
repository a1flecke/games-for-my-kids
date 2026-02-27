#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Game metadata extractor
function extractGameMetadata(gamePath) {
  const indexPath = path.join(gamePath, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  
  const content = fs.readFileSync(indexPath, 'utf8');
  
  // Extract title from <title> tag
  const titleMatch = content.match(/<title>(.*?)<\/title>/i);
  const fullTitle = titleMatch ? titleMatch[1] : path.basename(gamePath);
  
  // Try to extract a shorter, display-friendly title
  let displayTitle = fullTitle;
  
  // Common patterns for game titles
  if (fullTitle.includes(':')) {
    // For titles like "Keyboard Quest Round 2: The Digital Dimension"
    displayTitle = fullTitle.split(':')[0].trim();
  }
  
  return {
    path: path.basename(gamePath),
    title: displayTitle,
    fullTitle: fullTitle
  };
}

// Define game order by category
const gameCategories = {
  history: ['ancient-greece-rpg', 'roman-quiz', 'roman-emperors-quiz'],
  language: ['grammar-quiz', 'phonics-game'],
  math: ['math-coloring'],
  skills: ['keyboard-quest', 'keyboard-quest-2', 'keyboard-command-4']
};

// Manual game configurations (used when auto-detection needs help)
const manualGameConfig = {
  'ancient-greece-rpg': {
    icon: '🏛️⚡🗡️',
    title: 'Odyssey of the Ages',
    description: 'Embark on an epic journey through Ancient Greece! Explore mythology, battle legendary creatures, and discover the wonders of classical civilization.'
  },
  'roman-quiz': {
    icon: '🏺⚔️',
    title: 'Roman Quiz',
    description: 'Explore the fascinating world of ancient Rome! Learn about Roman culture, history, mythology, and more.'
  },
  'roman-emperors-quiz': {
    icon: '🏛️👑',
    title: 'Roman Emperors Quiz',
    description: 'Journey back in time to ancient Rome! Test your knowledge about the mighty emperors who ruled the Roman Empire.'
  },
  'grammar-quiz': {
    icon: '📚✏️',
    title: 'Grammar Quiz',
    description: 'Test your grammar skills with fun interactive quizzes! Learn about parts of speech, sentence structure, and more.'
  },
  'math-coloring': {
    icon: '🔢🎨',
    title: 'Math Coloring',
    description: 'Combine math practice with creative fun! Solve math problems to reveal colorful pictures and patterns.'
  },
  'keyboard-quest': {
    icon: '⌨️🦄🤖',
    title: 'Keyboard Quest',
    description: 'Join Sparkle the unicorn and Bolt the robot on an epic adventure! Learn essential macOS keyboard shortcuts while saving the Digital Kingdom from the Chaos Bug.'
  },
  'keyboard-quest-2': {
    icon: '⌨️✨🚀',
    title: 'Keyboard Quest 2',
    description: 'The adventure continues! Master more advanced keyboard shortcuts as you explore the Digital Dimension. Dyslexia-friendly design included!'
  },
  'keyboard-command-4': {
    icon: '⌨️🔫💥',
    title: 'Keyboard Command 4',
    description: 'Battle the Corruption in this Doom-inspired shooting gallery! Master 60+ iPadOS keyboard shortcuts by firing the right commands at digital monsters.'
  },
  'phonics-game': {
    icon: '🔤🗺️',
    title: 'Word Explorer',
    description: 'Phonics matching game for grades 1–5. Match words by sound patterns to unlock Lena\'s magical library!'
  }
};

// Scan repository for game directories
function scanForGames() {
  const rootDir = process.cwd();
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  
  const games = [];
  
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('.')) continue;
    if (entry.name === 'node_modules') continue;
    
    const gamePath = path.join(rootDir, entry.name);
    const hasIndex = fs.existsSync(path.join(gamePath, 'index.html'));
    
    if (hasIndex) {
      const metadata = extractGameMetadata(gamePath);
      if (metadata) {
        games.push(metadata);
      }
    }
  }
  
  return games;
}

// Sort games according to predefined order
function sortGames(games) {
  const allGames = Object.values(gameCategories).flat();
  
  return games.sort((a, b) => {
    const indexA = allGames.indexOf(a.path);
    const indexB = allGames.indexOf(b.path);
    
    // If both are in the predefined list, sort by that order
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // If only one is in the list, it comes first
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // Otherwise sort alphabetically
    return a.path.localeCompare(b.path);
  });
}

// Generate game card HTML
function generateGameCard(game) {
  const config = manualGameConfig[game.path] || {
    icon: '🎮',
    title: game.title,
    description: `Play ${game.title}!`
  };
  
  return `            <!-- ${config.title} -->
            <a href="${game.path}/" class="game-card active">
                <span class="game-icon">${config.icon}</span>
                <div class="game-title">${config.title}</div>
                <div class="game-description">
                    ${config.description}
                </div>
                <span class="game-tag">✨ Play Now!</span>
            </a>`;
}

// Generate the complete index.html
function generateIndexHTML(games) {
  const gameCards = games.map(generateGameCard).join('\n\n');
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Games for My Kids</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Comic Sans MS', 'Chalkboard SE', 'Bradley Hand', cursive, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            max-width: 1000px;
            width: 100%;
        }

        .header {
            text-align: center;
            margin-bottom: 40px;
            animation: fadeInDown 0.8s ease;
        }

        .header h1 {
            color: white;
            font-size: 3em;
            text-shadow: 3px 3px 6px rgba(0, 0, 0, 0.3);
            margin-bottom: 10px;
        }

        .header p {
            color: rgba(255, 255, 255, 0.9);
            font-size: 1.3em;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
        }

        .games-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 25px;
            animation: fadeInUp 0.8s ease 0.2s backwards;
        }

        .game-card {
            background: white;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            cursor: pointer;
            text-decoration: none;
            color: inherit;
            display: block;
            position: relative;
            overflow: hidden;
        }

        .game-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 8px;
            background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
        }

        .game-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.4);
        }

        .game-card.active:hover {
            transform: translateY(-10px) scale(1.02);
        }

        .game-card.coming-soon {
            opacity: 0.7;
            cursor: default;
        }

        .game-card.coming-soon::before {
            background: linear-gradient(90deg, #a8a8a8 0%, #6b6b6b 100%);
        }

        .game-card.coming-soon:hover {
            transform: none;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .game-icon {
            font-size: 4em;
            margin-bottom: 15px;
            display: block;
            text-align: center;
        }

        .game-title {
            font-size: 1.8em;
            color: #2c3e50;
            margin-bottom: 10px;
            font-weight: bold;
        }

        .game-description {
            color: #555;
            line-height: 1.6;
            margin-bottom: 15px;
        }

        .game-tag {
            display: inline-block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            margin-top: 10px;
            font-weight: bold;
        }

        .game-tag.coming {
            background: linear-gradient(135deg, #bbb 0%, #888 100%);
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            color: white;
            font-size: 1.1em;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
            animation: fadeIn 0.8s ease 0.4s backwards;
        }

        @keyframes fadeInDown {
            from {
                opacity: 0;
                transform: translateY(-30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }
            to {
                opacity: 1;
            }
        }

        @media (max-width: 768px) {
            .header h1 {
                font-size: 2.2em;
            }

            .header p {
                font-size: 1.1em;
            }

            .games-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎮 Games for My Kids 🎮</h1>
            <p>Fun learning adventures!</p>
        </div>

        <div class="games-grid">
${gameCards}
        </div>

        <div class="footer">
            <p>Made with ❤️ for learning and fun!</p>
            <p style="font-size: 0.9em; margin-top: 10px; opacity: 0.8;">More games coming soon! 🌟</p>
        </div>
    </div>
</body>
</html>
`;
}

// Main execution
function main() {
  console.log('Scanning for games...');
  const games = scanForGames();
  console.log(`Found ${games.length} games:`, games.map(g => g.path));
  
  console.log('Sorting games...');
  const sortedGames = sortGames(games);
  
  console.log('Generating index.html...');
  const html = generateIndexHTML(sortedGames);
  
  const indexPath = path.join(process.cwd(), 'index.html');
  fs.writeFileSync(indexPath, html, 'utf8');
  
  console.log('✅ index.html updated successfully!');
  console.log(`   ${sortedGames.length} games included`);
}

main();
