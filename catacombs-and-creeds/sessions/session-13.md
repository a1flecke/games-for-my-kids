# Session 13: Audio System

**Recommended Model: Sonnet** - Web Audio API synthesis follows well-documented patterns. Sound effect generation is repetitive (similar oscillator patterns with variations). Music loops are simple chiptune sequences. Integration points are clearly defined.

## Goal
Chiptune-style synthesized music and sound effects using Web Audio API. No external audio files needed (all generated programmatically). Volume controls and mute.

## Tasks

1. **Create `js/audio.js`** - Audio manager:
   - **Web Audio API** context management
   - **User interaction gate**: Audio context starts on first user click/keypress (Safari requirement)
   - **Synthesized music** (simple chiptune loops):
     - Title theme: hopeful, 8-bit melody
     - Exploration theme: atmospheric, low-key
     - Combat theme: urgent, faster tempo
     - Victory jingle: triumphant, short
     - Game over: somber, short
   - **Sound effects** (synthesized):
     - Footstep (short noise burst)
     - Door open (rising tone)
     - Item pickup (bright arpeggio)
     - Menu navigate (soft click)
     - Menu select (confirmation tone)
     - Dialogue advance (soft pop)
     - Attack hit (impact noise)
     - Damage taken (low thud)
     - Heal (gentle chime)
     - Save chime (warm chord)
     - Level up (ascending arpeggio)
   - **Volume controls**: Master, Music, SFX (0-100 each)
   - **Mute toggle**: Accessible at all times
   - **No essential audio**: Game fully playable without sound
   - **Visual indicators**: Optional flash when sound plays (accessibility)
2. **Integrate audio triggers**:
   - Music changes based on game state (exploration, combat, title)
   - SFX on: footsteps, item pickup, menu navigation, combat hits, dialogue advance, save
   - Smooth music crossfade between tracks
3. **Add audio controls to settings screen**
4. **Save audio preferences** in localStorage

## Files Modified
- `js/game.js` (audio triggers throughout game loop)
- `js/combat.js` (combat music and SFX)
- `js/dialogue.js` (dialogue advance SFX)
- `js/inventory.js` (item pickup SFX)
- `js/save.js` (save chime)
- `js/screens.js` (audio settings UI)
- `js/hud.js` (mute button)
- `index.html` (add audio.js script)

## Files Created
- `js/audio.js`

## Validation
- Music plays on title screen after first interaction
- Music transitions between exploration/combat
- All SFX trigger at correct moments
- Volume sliders work
- Mute button silences everything
- Audio preferences persist
- No audio errors on iPad Safari
- Game works perfectly with audio disabled
