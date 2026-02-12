# Session 6: Inventory & Items

**Recommended Model: Sonnet** - Well-defined system with clear specifications from the plan. Grid UI, item categories, and stat effects are straightforward to implement from the detailed requirements.

## Goal
Full inventory system with grid UI. Items can be picked up from the map, used in combat and overworld, equipped for stat boosts. Quest items tracked separately.

## Tasks

1. **Create `js/inventory.js`** - Inventory system:
   - 20-slot grid (4 columns x 5 rows)
   - Item categories: Consumable, QuestItem, Equipment, Collectible
   - Consumables stack to 99
   - Quest items don't count toward capacity
   - Auto-sort by category
   - **Actions**: Use (consumables), Equip/Unequip (equipment), Examine (shows description)
   - **Hotbar**: Keys 1-3 for quick-use slots
   - **UI rendering**:
     - Open with 'I' key or touch button
     - 60x60px minimum per slot
     - Item name + description on hover/select
     - Dyslexia-friendly colors and text
     - Navigate with arrow keys, select with SPACE
   - **Equipment effects**: Modify player stats (defense, wisdom)
2. **Create `data/items.json`** - Item definitions:
   - Consumables: Bread (heal 20 HP), Water (heal 10 HP), Scripture Scroll (full heal), Blessed Wine (HP + temp boost)
   - Quest Items: Apostle Coins (3 for Level 1), Martyr Tokens (4 for Level 2), Creed Fragments (5 for Level 3), Church Father Scrolls (3 for Level 4), Imperial Seal (Level 5)
   - Equipment: Faith Shield (+5 def), Prayer Beads (+3 wisdom)
   - Format: `{ id, name, description, category, stackable, maxStack, effect, sprite }`
3. **Add items to Level 1 map**:
   - Place items in chests and as floor pickups
   - 2 Bread, 1 Prayer Beads, 1 Scripture Scroll (hidden room)
   - 3 Apostle Coins from NPC interactions (quest flag triggers)
4. **Integrate with combat**:
   - "Use Item" action in combat opens consumable sub-menu
   - Using Bread in combat heals 20 HP
   - Equipment stat bonuses apply to combat formulas
5. **Item pickup interaction**:
   - Walk over floor items -> auto-pickup with notification
   - Open chests with SPACE -> receive contents with notification
   - "Obtained [item name]!" popup (2 seconds)

## Files Modified
- `js/game.js` (inventory state, item pickup logic)
- `js/combat.js` (use item action)
- `js/player.js` (equipment stat modifiers)
- `js/renderer.js` (item sprites on map)
- `data/levels/level1.json` (item placement)
- `index.html` (new script tags)

## Files Created
- `js/inventory.js`
- `data/items.json`

## Validation
- Press 'I' opens inventory grid
- Items display with names and descriptions
- Bread heals 20 HP when used
- Equipment changes player stats
- Items picked up from map with notification
- Quest items tracked separately
- Inventory full = warning message
- Combat "Use Item" works
