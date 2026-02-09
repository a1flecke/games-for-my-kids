/**
 * textRenderer.js - Dyslexia-Optimized Text Display
 * Renders dialogue boxes with accessibility features
 */

class TextRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Portrait cache
    this.portraits = new Map();
    
    // Current state
    this.currentText = '';
    this.currentSpeaker = '';
    this.currentPortrait = null;
    this.displayedText = '';
    this.charIndex = 0;
    this.complete = false;
    
    // Typewriter effect
    this.typewriterSpeed = 30; // ms per character
    this.lastCharTime = 0;
    
    // Text-to-Speech
    this.ttsEnabled = false;
    this.speechSynthesis = window.speechSynthesis;
    
    // Dyslexia-friendly styling
    this.style = {
      // Font settings
      fontFamily: '"Comic Sans MS", "OpenDyslexic", sans-serif',
      fontSize: 18,
      lineHeight: 1.8,
      
      // Colors (dyslexia-friendly palette)
      bgColor: '#F5F0E8',        // Cream/beige background
      textColor: '#2C2416',       // Dark brown text
      speakerColor: '#8B4513',    // Medium brown for speaker name
      borderColor: '#8B6914',     // Golden brown border
      
      // Layout
      boxPadding: 20,
      portraitSize: 64,
      portraitPadding: 12,
      borderWidth: 4,
      
      // Max words per dialogue box
      maxWords: 15
    };
    
    // Calculate box dimensions
    this.updateBoxDimensions();
  }
  
  /**
   * Update box dimensions based on canvas size
   */
  updateBoxDimensions() {
    this.boxHeight = 160;
    this.boxY = this.canvas.height - this.boxHeight - 10;
    this.boxX = 10;
    this.boxWidth = this.canvas.width - 20;
  }
  
  /**
   * Load a portrait image
   * @param {string} name - Portrait identifier
   * @param {string} imagePath - Path to image file
   * @returns {Promise}
   */
  loadPortrait(name, imagePath) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.portraits.set(name, img);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load portrait: ${imagePath}`);
        // Create placeholder
        const placeholder = this.createPlaceholder(name);
        this.portraits.set(name, placeholder);
        resolve(placeholder);
      };
      img.src = imagePath;
    });
  }
  
  /**
   * Create a placeholder portrait
   * @param {string} name - Character name for initials
   * @returns {HTMLCanvasElement}
   */
  createPlaceholder(name) {
    const size = this.style.portraitSize;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#D4C4A8';
    ctx.fillRect(0, 0, size, size);
    
    // Border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    
    // Initials
    const initials = name
      .split(' ')
      .map(word => word[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
    
    ctx.fillStyle = '#5C4A2E';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials, size / 2, size / 2);
    
    return canvas;
  }
  
  /**
   * Truncate text to maximum word count
   * @param {string} text - Input text
   * @returns {string} - Truncated text
   */
  truncateText(text) {
    const words = text.split(' ');
    if (words.length <= this.style.maxWords) {
      return text;
    }
    return words.slice(0, this.style.maxWords).join(' ') + '...';
  }
  
  /**
   * Set new dialogue text
   * @param {string} text - Dialogue text
   * @param {string} speaker - Speaker name
   * @param {string} portraitName - Portrait identifier
   */
  setText(text, speaker, portraitName) {
    this.currentText = this.truncateText(text);
    this.currentSpeaker = speaker;
    this.displayedText = '';
    this.charIndex = 0;
    this.complete = false;
    this.lastCharTime = 0;
    
    // Get portrait
    this.currentPortrait = this.portraits.get(portraitName) || 
                          this.portraits.get(speaker) ||
                          this.createPlaceholder(speaker);
    
    // Text-to-Speech
    if (this.ttsEnabled) {
      this.speak(this.currentText);
    }
  }
  
  /**
   * Update typewriter effect
   * @param {number} deltaTime - Time since last frame in ms
   */
  update(deltaTime) {
    if (this.complete) return;
    
    this.lastCharTime += deltaTime;
    
    if (this.lastCharTime >= this.typewriterSpeed) {
      this.lastCharTime = 0;
      
      if (this.charIndex < this.currentText.length) {
        this.displayedText += this.currentText[this.charIndex];
        this.charIndex++;
      } else {
        this.complete = true;
      }
    }
  }
  
  /**
   * Skip to end of text immediately
   */
  skipToEnd() {
    this.displayedText = this.currentText;
    this.charIndex = this.currentText.length;
    this.complete = true;
  }
  
  /**
   * Check if text is fully displayed
   * @returns {boolean}
   */
  isComplete() {
    return this.complete;
  }
  
  /**
   * Render the dialogue box
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   */
  render(ctx) {
    // Draw background box
    ctx.fillStyle = this.style.bgColor;
    ctx.fillRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
    
    // Draw border
    ctx.strokeStyle = this.style.borderColor;
    ctx.lineWidth = this.style.borderWidth;
    ctx.strokeRect(this.boxX, this.boxY, this.boxWidth, this.boxHeight);
    
    // Draw portrait
    const portraitX = this.boxX + this.style.boxPadding;
    const portraitY = this.boxY + this.style.boxPadding;
    
    if (this.currentPortrait) {
      ctx.drawImage(
        this.currentPortrait,
        portraitX,
        portraitY,
        this.style.portraitSize,
        this.style.portraitSize
      );
      
      // Portrait border
      ctx.strokeStyle = this.style.borderColor;
      ctx.lineWidth = 2;
      ctx.strokeRect(
        portraitX,
        portraitY,
        this.style.portraitSize,
        this.style.portraitSize
      );
    }
    
    // Calculate text area
    const textStartX = portraitX + this.style.portraitSize + this.style.portraitPadding;
    const textMaxWidth = this.boxWidth - (textStartX - this.boxX) - this.style.boxPadding;
    
    // Draw speaker name
    ctx.font = `bold 16px ${this.style.fontFamily}`;
    ctx.fillStyle = this.style.speakerColor;
    ctx.textBaseline = 'top';
    ctx.fillText(this.currentSpeaker, textStartX, this.boxY + this.style.boxPadding);
    
    // Draw dialogue text
    const textY = this.boxY + this.style.boxPadding + 24;
    ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
    ctx.fillStyle = this.style.textColor;
    
    this.wrapText(
      ctx,
      this.displayedText,
      textStartX,
      textY,
      textMaxWidth,
      this.style.fontSize * this.style.lineHeight
    );
  }
  
  /**
   * Render text with word wrapping
   * @param {CanvasRenderingContext2D} ctx
   * @param {string} text
   * @param {number} x
   * @param {number} y
   * @param {number} maxWidth
   * @param {number} lineHeight
   */
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    
    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && i > 0) {
        ctx.fillText(line, x, currentY);
        line = words[i] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
  
  /**
   * Text-to-Speech functionality
   * @param {string} text - Text to speak
   */
  speak(text) {
    if (!this.speechSynthesis) return;
    
    // Cancel any ongoing speech
    if (this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;  // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    this.speechSynthesis.speak(utterance);
  }
  
  /**
   * Toggle Text-to-Speech
   * @returns {boolean} - New TTS state
   */
  toggleTTS() {
    this.ttsEnabled = !this.ttsEnabled;
    
    if (!this.ttsEnabled && this.speechSynthesis.speaking) {
      this.speechSynthesis.cancel();
    }
    
    console.log(`Text-to-Speech ${this.ttsEnabled ? 'enabled' : 'disabled'}`);
    return this.ttsEnabled;
  }
  
  /**
   * Update canvas reference (if canvas size changes)
   * @param {HTMLCanvasElement} canvas
   */
  setCanvas(canvas) {
    this.canvas = canvas;
    this.updateBoxDimensions();
  }
}
