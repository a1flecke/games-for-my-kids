/**
 * dialogue.js - Dialogue Manager
 * Handles dialogue state, progression, and integration with game loop
 */

class DialogueManager {
  constructor(textRenderer) {
    this.textRenderer = textRenderer;
    
    // State
    this.active = false;
    this.currentSequence = [];
    this.currentIndex = 0;
    this.currentDialogue = null;
    this.waiting = false;
    
    // Choices
    this.hasChoices = false;
    this.choices = null;
    this.selectedChoice = 0;
    
    // Callbacks
    this.onComplete = null;
    this.onChoice = null;
    
    // Auto-advance settings
    this.autoAdvanceEnabled = false;
    this.autoAdvanceDelay = 3000; // 3 seconds after text finishes
    this.autoAdvanceTimer = 0;
    
    // Input handling
    this.setupInputHandlers();
  }
  
  /**
   * Start a dialogue sequence
   * @param {Object|Array} dialogue - Single dialogue object or array of dialogues
   * @param {Function} onComplete - Optional callback when dialogue sequence finishes
   */
  start(dialogue, onComplete = null) {
    // Convert single dialogue to array
    this.currentSequence = Array.isArray(dialogue) ? dialogue : [dialogue];
    this.currentIndex = 0;
    this.active = true;
    this.onComplete = onComplete;
    
    // Show first dialogue
    this.showCurrent();
  }
  
  /**
   * Show the current dialogue in the sequence
   */
  showCurrent() {
    if (this.currentIndex >= this.currentSequence.length) {
      this.end();
      return;
    }
    
    this.currentDialogue = this.currentSequence[this.currentIndex];
    this.waiting = false;
    this.autoAdvanceTimer = 0;
    
    // Check for choices
    if (this.currentDialogue.choices && this.currentDialogue.choices.length > 0) {
      this.hasChoices = true;
      this.choices = this.currentDialogue.choices;
      this.selectedChoice = 0;
    } else {
      this.hasChoices = false;
      this.choices = null;
    }
    
    // Pass to text renderer
    this.textRenderer.setText(
      this.currentDialogue.text,
      this.currentDialogue.speaker,
      this.currentDialogue.portrait
    );
  }
  
  /**
   * Update dialogue state (call in game loop)
   * @param {number} deltaTime - Time since last frame in milliseconds
   */
  update(deltaTime) {
    if (!this.active) return;
    
    // Update text renderer
    this.textRenderer.update(deltaTime);
    
    // Check if text finished typing
    if (this.textRenderer.isComplete() && !this.waiting) {
      this.waiting = true;
      
      // Start auto-advance timer if enabled and no choices
      if (this.autoAdvanceEnabled && !this.hasChoices) {
        this.autoAdvanceTimer = 0;
      }
    }
    
    // Handle auto-advance
    if (this.autoAdvanceEnabled && this.waiting && !this.hasChoices) {
      this.autoAdvanceTimer += deltaTime;
      
      if (this.autoAdvanceTimer >= this.autoAdvanceDelay) {
        this.advance();
      }
    }
  }
  
  /**
   * Render the dialogue (call in game render loop)
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  render(ctx) {
    if (!this.active) return;
    
    // Render text and dialogue box
    this.textRenderer.render(ctx);
    
    // Render choices if present
    if (this.hasChoices && this.waiting) {
      this.renderChoices(ctx);
    }
    
    // Render continue indicator if waiting (and no choices)
    if (this.waiting && !this.hasChoices && !this.autoAdvanceEnabled) {
      this.renderContinueIndicator(ctx);
    }
  }
  
  /**
   * Render choice options
   */
  renderChoices(ctx) {
    const boxX = this.textRenderer.boxX;
    const boxY = this.textRenderer.boxY;
    const boxWidth = this.textRenderer.boxWidth;
    const boxHeight = this.textRenderer.boxHeight;
    
    const choiceStartY = boxY + boxHeight - (this.choices.length * 35) - 15;
    const choiceX = boxX + 100;
    
    ctx.font = '16px "Comic Sans MS", "OpenDyslexic", sans-serif';
    
    this.choices.forEach((choice, index) => {
      const y = choiceStartY + (index * 35);
      
      // Highlight selected choice
      if (index === this.selectedChoice) {
        ctx.fillStyle = '#FFF8DC';
        ctx.fillRect(choiceX - 8, y - 22, boxWidth - 120, 30);
      }
      
      // Draw choice number and text
      ctx.fillStyle = index === this.selectedChoice ? '#8B6914' : '#4A4A4A';
      ctx.textBaseline = 'top';
      ctx.fillText(`${index + 1}. ${choice.text}`, choiceX, y);
    });
  }
  
  /**
   * Render continue indicator (flashing arrow)
   */
  renderContinueIndicator(ctx) {
    const boxX = this.textRenderer.boxX;
    const boxY = this.textRenderer.boxY;
    const boxHeight = this.textRenderer.boxHeight;
    
    const x = boxX + this.textRenderer.boxWidth - 40;
    const y = boxY + boxHeight - 30;
    
    const alpha = Math.abs(Math.sin(Date.now() / 500));
    
    ctx.fillStyle = '#8B6914';
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px Arial';
    ctx.fillText('▼', x, y);
    ctx.globalAlpha = 1.0;
  }
  
  /**
   * Advance to next dialogue or handle choice
   */
  advance() {
    // If still typing, skip to end
    if (!this.textRenderer.isComplete()) {
      this.textRenderer.skipToEnd();
      return;
    }
    
    // If choices present, execute selected choice
    if (this.hasChoices) {
      const selectedChoice = this.choices[this.selectedChoice];
      
      // Call choice callback if provided
      if (this.onChoice) {
        this.onChoice(selectedChoice);
      }
      
      // Execute choice action if provided
      if (selectedChoice.action) {
        selectedChoice.action();
      }
      
      // Clear choices
      this.hasChoices = false;
      this.choices = null;
    }
    
    // Move to next dialogue
    this.currentIndex++;
    this.showCurrent();
  }
  
  /**
   * End dialogue sequence
   */
  end() {
    this.active = false;
    this.currentSequence = [];
    this.currentIndex = 0;
    this.currentDialogue = null;
    this.waiting = false;
    this.hasChoices = false;
    this.choices = null;
    
    // Call completion callback
    if (this.onComplete) {
      this.onComplete();
    }
  }
  
  /**
   * Move choice selection up
   */
  moveChoiceUp() {
    if (this.hasChoices && this.waiting) {
      this.selectedChoice = Math.max(0, this.selectedChoice - 1);
    }
  }
  
  /**
   * Move choice selection down
   */
  moveChoiceDown() {
    if (this.hasChoices && this.waiting) {
      this.selectedChoice = Math.min(this.choices.length - 1, this.selectedChoice + 1);
    }
  }
  
  /**
   * Select choice by number (1-9)
   */
  selectChoiceByNumber(num) {
    if (this.hasChoices && this.waiting) {
      const index = num - 1;
      if (index >= 0 && index < this.choices.length) {
        this.selectedChoice = index;
        this.advance();
      }
    }
  }
  
  /**
   * Setup keyboard input handlers
   */
  setupInputHandlers() {
    document.addEventListener('keydown', (e) => {
      if (!this.active) return;
      
      // Space or Enter - advance dialogue
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advance();
      }
      
      // Escape - end dialogue
      if (e.key === 'Escape') {
        e.preventDefault();
        this.end();
      }
      
      // Arrow keys for choice selection
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.moveChoiceUp();
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.moveChoiceDown();
      }
      
      // Number keys for quick choice selection
      if (e.key >= '1' && e.key <= '9') {
        const num = parseInt(e.key);
        this.selectChoiceByNumber(num);
      }
      
      // 'T' key to toggle TTS
      if (e.key === 't' || e.key === 'T') {
        this.textRenderer.toggleTTS();
      }
      
      // 'A' key to toggle auto-advance
      if (e.key === 'a' || e.key === 'A') {
        this.autoAdvanceEnabled = !this.autoAdvanceEnabled;
        console.log(`Auto-advance ${this.autoAdvanceEnabled ? 'enabled' : 'disabled'}`);
      }
    });
  }
  
  /**
   * Check if dialogue is active
   */
  isActive() {
    return this.active;
  }
  
  /**
   * Set auto-advance enabled state
   */
  setAutoAdvance(enabled) {
    this.autoAdvanceEnabled = enabled;
  }
  
  /**
   * Set auto-advance delay in milliseconds
   */
  setAutoAdvanceDelay(delayMs) {
    this.autoAdvanceDelay = delayMs;
  }
}
