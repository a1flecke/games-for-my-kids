/**
 * Catacombs & Creeds - Dialogue System
 * Dyslexia-friendly dialogue rendering for educational dungeon crawler
 */

class DialogueSystem {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    
    // Dialogue state
    this.active = false;
    this.currentDialogue = null;
    this.displayedText = '';
    this.fullText = '';
    this.textIndex = 0;
    this.typewriterSpeed = 30; // milliseconds per character
    this.lastCharTime = 0;
    this.isTyping = false;
    this.waitingForInput = false;
    
    // Portraits cache
    this.portraits = {};
    
    // Text-to-Speech
    this.ttsEnabled = false;
    this.speechSynthesis = window.speechSynthesis;
    this.currentUtterance = null;
    
    // Dialogue queue for conversations
    this.dialogueQueue = [];
    this.currentDialogueIndex = 0;
    
    // Choice system
    this.choices = null;
    this.selectedChoice = 0;
    
    // Dyslexia-friendly styling
    this.style = {
      // Background
      bgColor: '#F5F0E8', // Cream/beige background
      borderColor: '#8B6914',
      borderWidth: 4,
      
      // Text
      fontFamily: 'Comic Sans MS, OpenDyslexic, sans-serif',
      fontSize: 18, // 18pt for good readability
      lineHeight: 1.8, // 1.8x spacing for dyslexia-friendly reading
      textColor: '#2C2416', // Dark brown, high contrast with cream
      maxWordsPerBox: 15,
      
      // Layout
      boxHeight: 160,
      boxPadding: 20,
      portraitSize: 64,
      portraitPadding: 12,
      
      // Speaker name
      nameColor: '#8B4513',
      nameFontSize: 16,
      
      // Choices
      choiceColor: '#4A4A4A',
      choiceSelectedColor: '#8B6914',
      choiceSelectedBg: '#FFF8DC',
      
      // Continue indicator
      continueColor: '#8B6914',
      continueFlashSpeed: 500 // milliseconds
    };
    
    this.continueFlash = 0;
    
    // Keyboard handling
    this.setupKeyboardListeners();
  }
  
  /**
   * Load a portrait image
   */
  loadPortrait(name, imagePath) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.portraits[name] = img;
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load portrait: ${imagePath}`);
        // Create a placeholder
        this.portraits[name] = this.createPlaceholderPortrait(name);
        resolve(this.portraits[name]);
      };
      img.src = imagePath;
    });
  }
  
  /**
   * Create a placeholder portrait if image fails to load
   */
  createPlaceholderPortrait(name) {
    const canvas = document.createElement('canvas');
    canvas.width = this.style.portraitSize;
    canvas.height = this.style.portraitSize;
    const ctx = canvas.getContext('2d');
    
    // Draw simple placeholder
    ctx.fillStyle = '#D4C4A8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
    
    // Draw initials
    ctx.fillStyle = '#5C4A2E';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initials = name.split(' ').map(w => w[0]).join('').substring(0, 2);
    ctx.fillText(initials, canvas.width / 2, canvas.height / 2);
    
    return canvas;
  }
  
  /**
   * Start a dialogue sequence
   */
  startDialogue(dialogueData) {
    if (Array.isArray(dialogueData)) {
      this.dialogueQueue = dialogueData;
      this.currentDialogueIndex = 0;
    } else {
      this.dialogueQueue = [dialogueData];
      this.currentDialogueIndex = 0;
    }
    
    this.showNextDialogue();
  }
  
  /**
   * Show the next dialogue in the queue
   */
  showNextDialogue() {
    if (this.currentDialogueIndex >= this.dialogueQueue.length) {
      this.endDialogue();
      return;
    }
    
    const dialogue = this.dialogueQueue[this.currentDialogueIndex];
    this.currentDialogue = dialogue;
    this.fullText = this.truncateText(dialogue.text);
    this.displayedText = '';
    this.textIndex = 0;
    this.isTyping = true;
    this.waitingForInput = false;
    this.active = true;
    
    // Handle choices
    if (dialogue.choices && dialogue.choices.length > 0) {
      this.choices = dialogue.choices;
      this.selectedChoice = 0;
    } else {
      this.choices = null;
    }
    
    // Text-to-Speech
    if (this.ttsEnabled) {
      this.speak(dialogue.text);
    }
  }
  
  /**
   * Truncate text to max words per dialogue box
   */
  truncateText(text) {
    const words = text.split(' ');
    if (words.length <= this.style.maxWordsPerBox) {
      return text;
    }
    
    // Truncate and add ellipsis
    return words.slice(0, this.style.maxWordsPerBox).join(' ') + '...';
  }
  
  /**
   * Update typewriter effect
   */
  update(deltaTime) {
    if (!this.active || !this.isTyping) return;
    
    this.lastCharTime += deltaTime;
    
    if (this.lastCharTime >= this.typewriterSpeed) {
      this.lastCharTime = 0;
      
      if (this.textIndex < this.fullText.length) {
        this.displayedText += this.fullText[this.textIndex];
        this.textIndex++;
      } else {
        // Typing complete
        this.isTyping = false;
        this.waitingForInput = true;
      }
    }
    
    // Update continue indicator flash
    if (this.waitingForInput) {
      this.continueFlash += deltaTime;
    }
  }
  
  /**
   * Skip typewriter effect and show full text
   */
  skipTypewriter() {
    if (this.isTyping) {
      this.displayedText = this.fullText;
      this.textIndex = this.fullText.length;
      this.isTyping = false;
      this.waitingForInput = true;
    }
  }
  
  /**
   * Advance to next dialogue or handle choice
   */
  advance() {
    if (this.isTyping) {
      this.skipTypewriter();
      return;
    }
    
    if (this.choices && this.choices.length > 0) {
      // Handle choice selection
      const selectedChoice = this.choices[this.selectedChoice];
      if (selectedChoice.action) {
        selectedChoice.action();
      }
      this.choices = null;
    }
    
    // Stop any current speech
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    
    this.currentDialogueIndex++;
    this.showNextDialogue();
  }
  
  /**
   * End dialogue system
   */
  endDialogue() {
    this.active = false;
    this.currentDialogue = null;
    this.dialogueQueue = [];
    this.currentDialogueIndex = 0;
    this.choices = null;
    
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
  }
  
  /**
   * Render the dialogue box
   */
  render() {
    if (!this.active || !this.currentDialogue) return;
    
    const boxY = this.canvas.height - this.style.boxHeight - 10;
    const boxX = 10;
    const boxWidth = this.canvas.width - 20;
    
    // Draw background box
    this.ctx.fillStyle = this.style.bgColor;
    this.ctx.fillRect(boxX, boxY, boxWidth, this.style.boxHeight);
    
    // Draw border
    this.ctx.strokeStyle = this.style.borderColor;
    this.ctx.lineWidth = this.style.borderWidth;
    this.ctx.strokeRect(boxX, boxY, boxWidth, this.style.boxHeight);
    
    // Draw portrait
    const portrait = this.portraits[this.currentDialogue.speaker] || 
                     this.portraits[this.currentDialogue.portrait];
    
    const portraitX = boxX + this.style.boxPadding;
    const portraitY = boxY + this.style.boxPadding;
    
    if (portrait) {
      this.ctx.drawImage(
        portrait,
        portraitX,
        portraitY,
        this.style.portraitSize,
        this.style.portraitSize
      );
      
      // Portrait border
      this.ctx.strokeStyle = this.style.borderColor;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(
        portraitX,
        portraitY,
        this.style.portraitSize,
        this.style.portraitSize
      );
    }
    
    // Draw speaker name
    const textStartX = portraitX + this.style.portraitSize + this.style.portraitPadding;
    const nameY = boxY + this.style.boxPadding;
    
    this.ctx.font = `bold ${this.style.nameFontSize}px ${this.style.fontFamily}`;
    this.ctx.fillStyle = this.style.nameColor;
    this.ctx.textBaseline = 'top';
    this.ctx.fillText(this.currentDialogue.speaker, textStartX, nameY);
    
    // Draw dialogue text
    const textY = nameY + this.style.nameFontSize + 8;
    const textMaxWidth = boxWidth - (textStartX - boxX) - this.style.boxPadding;
    
    this.ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    this.ctx.fillStyle = this.style.textColor;
    
    this.wrapText(
      this.displayedText,
      textStartX,
      textY,
      textMaxWidth,
      this.style.fontSize * this.style.lineHeight
    );
    
    // Draw choices if present
    if (this.choices && !this.isTyping) {
      this.renderChoices(boxX, boxY, boxWidth);
    }
    
    // Draw continue indicator if waiting for input
    if (this.waitingForInput && !this.choices) {
      this.renderContinueIndicator(boxX + boxWidth - 40, boxY + this.style.boxHeight - 30);
    }
  }
  
  /**
   * Render text with word wrapping
   */
  wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = this.ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        this.ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    this.ctx.fillText(line, x, currentY);
  }
  
  /**
   * Render choice options
   */
  renderChoices(boxX, boxY, boxWidth) {
    const choiceStartY = boxY + this.style.boxHeight - (this.choices.length * 30) - 10;
    const choiceX = boxX + this.style.boxPadding + this.style.portraitSize + this.style.portraitPadding;
    
    this.ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    
    this.choices.forEach((choice, index) => {
      const y = choiceStartY + (index * 30);
      
      // Highlight selected choice
      if (index === this.selectedChoice) {
        this.ctx.fillStyle = this.style.choiceSelectedBg;
        this.ctx.fillRect(choiceX - 5, y - 18, boxWidth - choiceX - this.style.boxPadding + 5, 26);
      }
      
      // Draw choice text
      this.ctx.fillStyle = index === this.selectedChoice ? 
        this.style.choiceSelectedColor : this.style.choiceColor;
      this.ctx.fillText(`${index + 1}. ${choice.text}`, choiceX, y);
    });
  }
  
  /**
   * Render continue indicator (flashing arrow)
   */
  renderContinueIndicator(x, y) {
    const alpha = Math.abs(Math.sin(this.continueFlash / this.style.continueFlashSpeed));
    
    this.ctx.fillStyle = this.style.continueColor;
    this.ctx.globalAlpha = alpha;
    
    this.ctx.font = 'bold 20px Arial';
    this.ctx.fillText('▼', x, y);
    
    this.ctx.globalAlpha = 1.0;
  }
  
  /**
   * Text-to-Speech
   */
  speak(text) {
    if (!this.speechSynthesis) return;
    
    // Cancel any ongoing speech
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    this.currentUtterance = utterance;
    this.speechSynthesis.speak(utterance);
  }
  
  /**
   * Toggle TTS
   */
  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    
    if (!this.ttsEnabled && this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    
    return this.ttsEnabled;
  }
  
  /**
   * Keyboard event handling
   */
  setupKeyboardListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.active) return;
      
      // Space or Enter to advance
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        this.advance();
      }
      
      // Escape to close dialogue
      if (e.key === 'Escape') {
        e.preventDefault();
        this.endDialogue();
      }
      
      // Arrow keys or number keys for choices
      if (this.choices && !this.isTyping) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.selectedChoice = Math.max(0, this.selectedChoice - 1);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.selectedChoice = Math.min(this.choices.length - 1, this.selectedChoice + 1);
        } else if (e.key >= '1' && e.key <= '9') {
          const choiceIndex = parseInt(e.key) - 1;
          if (choiceIndex < this.choices.length) {
            this.selectedChoice = choiceIndex;
            this.advance();
          }
        }
      }
      
      // 'T' key to toggle TTS
      if (e.key === 't' || e.key === 'T') {
        const enabled = this.toggleTTS();
        console.log(`Text-to-Speech ${enabled ? 'enabled' : 'disabled'}`);
      }
    });
  }
  
  /**
   * Check if dialogue is active
   */
  isActive() {
    return this.active;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DialogueSystem;
}
