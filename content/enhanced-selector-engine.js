// enhanced-selector-engine.js - Advanced selector detection from Easy Scraper research
// Implements the sophisticated selector generation and testing from easyscraper-english-only

// Prevent duplicate declarations
if (window.EnhancedSelectorEngine) {
  console.log('EnhancedSelectorEngine already loaded, skipping...');
} else {

class EnhancedSelectorEngine {
  constructor(options = {}) {
    this.options = {
      maxDepth: options.maxDepth || 10,
      minSimilarElements: options.minSimilarElements || 3,
      includeTextContent: options.includeTextContent !== false,
      prioritizeDataAttributes: options.prioritizeDataAttributes !== false,
      ...options
    };
        
    this.patterns = new Map();
    this.selectorCache = new Map();
    this.elementAnalysis = new Map();
  }

  // CSS escape utility for special characters in class names
  escapeCSSSelector(selector) {
    if (!selector) return selector;
    
    // Use CSS.escape if available (modern browsers), otherwise manual escaping
    if (typeof CSS !== 'undefined' && CSS.escape) {
      return CSS.escape(selector);
    }
    
    // Manual escaping fallback
    return selector
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/:/g, '\\:')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\./g, '\\.')
      .replace(/\#/g, '\\#')
      .replace(/\//g, '\\/')
      .replace(/\%/g, '\\%')
      .replace(/\&/g, '\\&')
      .replace(/\*/g, '\\*')
      .replace(/\+/g, '\\+')
      .replace(/\?/g, '\\?')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$')
      .replace(/\|/g, '\\|')
      .replace(/\~/g, '\\~')
      .replace(/\=/g, '\\=')
      .replace(/\!/g, '\\!');
  }

  // Enhanced selector generation based on Easy Scraper research
  generateOptimalSelector(element) {
    if (!element || !element.tagName) {return null;}
        
    const cacheKey = this.getElementFingerprint(element);
    if (this.selectorCache.has(cacheKey)) {
      return this.selectorCache.get(cacheKey);
    }
        
    const candidates = this.generateSelectorCandidates(element);
    const optimal = this.evaluateSelectors(element, candidates);
        
    this.selectorCache.set(cacheKey, optimal);
    return optimal;
  }
    
  generateSelectorCandidates(element) {
    const candidates = [];
        
    // 1. Data attribute selectors (highest priority in Easy Scraper)
    if (this.options.prioritizeDataAttributes) {
      candidates.push(...this.generateDataAttributeSelectors(element));
    }
        
    // 2. ID-based selectors
    if (element.id) {
      candidates.push(`#${element.id}`);
    }
        
    // 3. Class-based selectors
    candidates.push(...this.generateClassSelectors(element));
        
    // 4. Attribute-based selectors
    candidates.push(...this.generateAttributeSelectors(element));
        
    // 5. Structural selectors
    candidates.push(...this.generateStructuralSelectors(element));
        
    // 6. Content-based selectors
    if (this.options.includeTextContent) {
      candidates.push(...this.generateContentSelectors(element));
    }
        
    // 7. Fallback: CSS path
    candidates.push(getCssPath(element));
        
    return [...new Set(candidates)]; // Remove duplicates
  }
    
  generateDataAttributeSelectors(element) {
    const selectors = [];
    const attributes = element.attributes;
        
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name.startsWith('data-')) {
        // Prioritize specific data attributes found in research
        if (['data-testid', 'data-test', 'data-automation', 'data-qa'].includes(attr.name)) {
          selectors.push(`[${attr.name}="${attr.value}"]`);
        } else if (attr.value) {
          selectors.push(`[${attr.name}="${attr.value}"]`);
        } else {
          selectors.push(`[${attr.name}]`);
        }
      }
    }
        
    return selectors;
  }
    
  generateClassSelectors(element) {
    const selectors = [];
    const classes = Array.from(element.classList);
        
    if (classes.length === 0) {return selectors;}
        
    // Single class selectors
    classes.forEach(cls => {
      if (this.isSemanticClass(cls)) {
        selectors.push(`.${cls}`);
      }
    });
        
    // Multi-class combinations (prioritize semantic combinations)
    if (classes.length > 1) {
      const semanticClasses = classes.filter(cls => this.isSemanticClass(cls));
      if (semanticClasses.length > 1) {
        const escapedSemanticClasses = semanticClasses.map(cls => this.escapeCSSSelector(cls));
        selectors.push(`.${escapedSemanticClasses.join('.')}`);
      }
      const escapedClasses = classes.map(cls => this.escapeCSSSelector(cls));
      selectors.push(`.${escapedClasses.join('.')}`);
    }
        
    return selectors;
  }
    
  generateAttributeSelectors(element) {
    const selectors = [];
    const importantAttrs = ['role', 'title', 'alt', 'name', 'type', 'src', 'href'];
        
    importantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        if (attr === 'src' || attr === 'href') {
          // For URLs, use contains selector
          selectors.push(`[${attr}*="${this.extractUrlSegment(value)}"]`);
        } else {
          selectors.push(`[${attr}="${value}"]`);
        }
      }
    });
        
    return selectors;
  }
    
  generateStructuralSelectors(element) {
    const selectors = [];
    const parent = element.parentElement;
    if (!parent) {return selectors;}
        
    // nth-child selectors
    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(element);
    if (index !== -1) {
      selectors.push(`${parent.tagName.toLowerCase()} > :nth-child(${index + 1})`);
            
      // nth-of-type if there are multiple of same tag
      const sameTagSiblings = siblings.filter(el => el.tagName === element.tagName);
      if (sameTagSiblings.length > 1) {
        const typeIndex = sameTagSiblings.indexOf(element);
        selectors.push(`${element.tagName.toLowerCase()}:nth-of-type(${typeIndex + 1})`);
      }
    }
        
    return selectors;
  }
    
  generateContentSelectors(element) {
    const selectors = [];
    const text = element.textContent?.trim();
        
    if (text && text.length > 0 && text.length < 50) {
      // Exact text match
      selectors.push(`${element.tagName.toLowerCase()}[text()="${text}"]`);
            
      // Contains text
      if (text.length > 5) {
        selectors.push(`${element.tagName.toLowerCase()}:contains("${text.substring(0, 20)}")`);
      }
    }
        
    // Alt text for images
    if (element.tagName.toLowerCase() === 'img' && element.alt) {
      selectors.push(`img[alt="${element.alt}"]`);
    }
        
    return selectors;
  }
    
  evaluateSelectors(targetElement, candidates) {
    let bestSelector = null;
    let bestScore = -1;
        
    for (const selector of candidates) {
      const score = this.scoreSelectorQuality(selector, targetElement);
      if (score > bestScore) {
        bestScore = score;
        bestSelector = selector;
      }
    }
        
    return bestSelector || getCssPath(targetElement);
  }
    
  scoreSelectorQuality(selector, targetElement) {
    try {
      const matches = document.querySelectorAll(selector);
            
      // Check if selector actually matches target
      if (!Array.from(matches).includes(targetElement)) {
        return -1;
      }
            
      let score = 100;
            
      // Penalize selectors that match too many elements
      const matchCount = matches.length;
      if (matchCount === 1) {
        score += 50; // Perfect uniqueness
      } else if (matchCount <= 5) {
        score += 20;
      } else if (matchCount <= 20) {
        score += 0;
      } else {
        score -= 30;
      }
            
      // Bonus for semantic selectors
      if (selector.includes('data-test') || selector.includes('data-automation')) {
        score += 40;
      }
      if (selector.includes('[role=')) {
        score += 30;
      }
      if (selector.includes('#')) {
        score += 35; // ID selectors are usually good
      }
            
      // Penalty for overly complex selectors
      const complexity = (selector.match(/[>\s~\+]/g) || []).length;
      score -= complexity * 5;
            
      // Penalty for positional selectors (fragile)
      if (selector.includes(':nth-child') || selector.includes(':nth-of-type')) {
        score -= 15;
      }
            
      return score;
            
    } catch (_e) {
      return -1; // Invalid selector
    }
  }
    
  // Enhanced pattern recognition from Easy Scraper research
  analyzePagePatterns() {
    const patterns = new Map();
        
    // Find gallery/grid patterns
    const gallerySelectors = [
      '[class*="gallery"]', '[class*="grid"]', '[class*="items"]',
      '[class*="list"]', '[class*="container"]', '[class*="wrapper"]'
    ];
        
    gallerySelectors.forEach(selector => {
      try {
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
          const pattern = this.analyzeContainerPattern(container);
          if (pattern.confidence > 0.7) {
            patterns.set(selector, pattern);
          }
        });
      } catch (_e) {
        // Invalid selector, skip
      }
    });
        
    return patterns;
  }
    
  analyzeContainerPattern(container) {
    const children = Array.from(container.children);
        
    if (children.length < 3) {
      return { confidence: 0, reason: 'Not enough child elements' };
    }
        
    // Analyze child similarity
    const childPatterns = children.map(child => ({
      tagName: child.tagName,
      classSignature: Array.from(child.classList).sort().join('|'),
      hasImage: !!child.querySelector('img'),
      hasLink: !!child.querySelector('a'),
      textLength: child.textContent?.length || 0
    }));
        
    // Calculate pattern consistency
    const first = childPatterns[0];
    const consistency = childPatterns.reduce((acc, pattern) => {
      let matches = 0;
      if (pattern.tagName === first.tagName) {matches++;}
      if (pattern.classSignature === first.classSignature) {matches++;}
      if (pattern.hasImage === first.hasImage) {matches++;}
      if (pattern.hasLink === first.hasLink) {matches++;}
      return acc + (matches / 4);
    }, 0) / childPatterns.length;
        
    return {
      confidence: consistency,
      itemCount: children.length,
      hasImages: first.hasImage,
      hasLinks: first.hasLink,
      suggestedItemSelector: first.classSignature ? `.${first.classSignature.replace(/\|/g, '.')}` : first.tagName.toLowerCase()
    };
  }
    
  // Utility functions
  isSemanticClass(className) {
    const semanticKeywords = [
      'item', 'card', 'tile', 'gallery', 'grid', 'list', 'container',
      'wrapper', 'image', 'photo', 'thumbnail', 'preview', 'content',
      'article', 'post', 'product', 'media'
    ];
        
    return semanticKeywords.some(keyword => 
      className.toLowerCase().includes(keyword)
    );
  }
    
  extractUrlSegment(url) {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/').filter(s => s);
      return segments[segments.length - 1] || urlObj.hostname;
    } catch (_e) {
      return url.substring(url.lastIndexOf('/') + 1).substring(0, 20);
    }
  }
    
  getElementFingerprint(element) {
    const rect = element.getBoundingClientRect();
    return `${element.tagName}-${element.className}-${rect.top}-${rect.left}`;
  }
    
  // Test selector against current page
  testSelector(selector) {
    try {
      const matches = document.querySelectorAll(selector);
      const result = {
        valid: true,
        matchCount: matches.length,
        matches: Array.from(matches).slice(0, 10), // Limit for performance
        coverage: this.calculateCoverage(matches)
      };
            
      // Add sample data extraction
      if (matches.length > 0) {
        result.sampleData = this.extractSampleData(matches[0]);
      }
            
      return result;
    } catch (_e) {
      return {
        valid: false,
        error: _e.message,
        matchCount: 0,
        matches: []
      };
    }
  }
    
  calculateCoverage(matches) {
    if (matches.length === 0) {return 0;}
        
    const totalViewport = window.innerWidth * window.innerHeight;
    const coveredArea = Array.from(matches).reduce((total, el) => {
      const rect = el.getBoundingClientRect();
      return total + (rect.width * rect.height);
    }, 0);
        
    return Math.min(coveredArea / totalViewport, 1);
  }
    
  extractSampleData(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim().substring(0, 100),
      attributes: Array.from(element.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {}),
      hasImage: !!element.querySelector('img'),
      hasLink: !!element.querySelector('a'),
      imageUrl: element.querySelector('img')?.src,
      linkUrl: element.querySelector('a')?.href
    };
  }
}

// Enhanced picker overlay with Easy Scraper features
export class EnhancedPickerOverlay {
  constructor(selectorEngine) {
    this.selectorEngine = selectorEngine;
    this.overlay = null;
    this.tooltip = null;
    this.isActive = false;
    this.selectedElements = [];
    this.mode = 'single'; // 'single', 'multi', 'pattern'
  }
    
  start(mode = 'single') {
    if (this.isActive) {return;}
        
    this.mode = mode;
    this.isActive = true;
    this.createOverlay();
    this.bindEvents();
    this.showInstructions();
  }
    
  stop() {
    if (!this.isActive) {return;}
        
    this.isActive = false;
    this.cleanup();
        
    return {
      selectedElements: this.selectedElements,
      selectors: this.selectedElements.map(el => this.selectorEngine.generateOptimalSelector(el)),
      patterns: this.selectorEngine.analyzePagePatterns()
    };
  }
    
  createOverlay() {
    // Create enhanced overlay with Easy Scraper styling
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 2147483647;
            pointer-events: none;
            border: 3px solid #007acc;
            background: rgba(0, 122, 204, 0.15);
            transition: all 0.1s ease;
            box-shadow: 
                0 0 0 1px rgba(255, 255, 255, 0.6),
                0 0 20px rgba(0, 122, 204, 0.4),
                inset 0 0 30px rgba(0, 122, 204, 0.1);
            border-radius: 4px;
        `;
    document.body.appendChild(this.overlay);
        
    this.createTooltip();
  }
    
  createTooltip() {
    this.tooltip = document.createElement('div');
    this.tooltip.style.cssText = `
            position: fixed;
            background: linear-gradient(135deg, rgba(0, 0, 0, 0.95), rgba(0, 122, 204, 0.95));
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 13px;
            line-height: 1.4;
            z-index: 2147483648;
            pointer-events: none;
            max-width: 350px;
            box-shadow: 
                0 8px 24px rgba(0, 0, 0, 0.4),
                0 0 0 1px rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
    document.body.appendChild(this.tooltip);
  }
    
  bindEvents() {
    this.mouseMoveHandler = (e) => this.handleMouseMove(e);
    this.clickHandler = (e) => this.handleClick(e);
    this.keydownHandler = (e) => this.handleKeydown(e);
        
    document.addEventListener('mousemove', this.mouseMoveHandler, true);
    document.addEventListener('click', this.clickHandler, true);
    document.addEventListener('keydown', this.keydownHandler, true);
  }
    
  handleMouseMove(e) {
    const element = e.target;
    if (element === this.overlay || element === this.tooltip) {return;}
        
    this.updateOverlay(element);
    this.updateTooltip(element, e);
  }
    
  updateOverlay(element) {
    const rect = element.getBoundingClientRect();
        
    this.overlay.style.top = `${rect.top  }px`;
    this.overlay.style.left = `${rect.left  }px`;
    this.overlay.style.width = `${rect.width  }px`;
    this.overlay.style.height = `${rect.height  }px`;
  }
    
  updateTooltip(element, event) {
    const selector = this.selectorEngine.generateOptimalSelector(element);
    const testResult = this.selectorEngine.testSelector(selector);
        
    const content = this.generateTooltipContent(element, selector, testResult);
    this.tooltip.innerHTML = content;
        
    // Position tooltip
    this.tooltip.style.left = `${event.clientX + 15  }px`;
    this.tooltip.style.top = `${event.clientY - 10  }px`;
  }
    
  generateTooltipContent(element, selector, testResult) {
    const tagName = element.tagName.toLowerCase();
    const shortSelector = selector.length > 60 ? `${selector.substring(0, 60)  }...` : selector;
        
    return `
            <div style="font-weight: 600; margin-bottom: 6px; color: #64b5f6;">
                ${tagName}${element.id ? `#${  element.id}` : ''}
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 11px; 
                       background: rgba(255,255,255,0.1); padding: 4px 6px; 
                       border-radius: 3px; margin-bottom: 6px;">
                ${shortSelector}
            </div>
            <div style="font-size: 11px; opacity: 0.9;">
                <div>📊 Matches: <strong>${testResult.matchCount}</strong></div>
                ${element.querySelector('img') ? '<div>🖼️ Contains images</div>' : ''}
                ${element.querySelector('a') ? '<div>🔗 Contains links</div>' : ''}
                <div style="margin-top: 4px; color: #81c784;">
                    Click to select • ESC to cancel
                </div>
            </div>
        `;
  }
    
  handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
        
    const element = e.target;
    if (element === this.overlay || element === this.tooltip) {return;}
        
    if (this.mode === 'multi') {
      this.selectedElements.push(element);
      this.highlightSelected(element);
    } else {
      this.selectedElements = [element];
      this.stop();
    }
  }
    
  handleKeydown(e) {
    if (e.key === 'Escape') {
      this.stop();
    }
  }
    
  highlightSelected(element) {
    const highlight = document.createElement('div');
    const rect = element.getBoundingClientRect();
        
    highlight.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: rgba(76, 175, 80, 0.3);
            border: 2px solid #4caf50;
            z-index: 2147483646;
            pointer-events: none;
            border-radius: 4px;
        `;
        
    document.body.appendChild(highlight);
    setTimeout(() => highlight.remove(), 2000);
  }
    
  showInstructions() {
    const instructions = document.createElement('div');
    instructions.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            font-size: 14px;
            z-index: 2147483649;
            border: 1px solid rgba(255, 255, 255, 0.2);
        `;
        
    instructions.innerHTML = `
            <div style="font-weight: 600; margin-bottom: 8px;">Enhanced Selector Mode</div>
            <div>🎯 Hover to preview selection</div>
            <div>👆 Click to select element</div>
            <div>⌨️ ESC to cancel</div>
        `;
        
    document.body.appendChild(instructions);
    setTimeout(() => instructions.remove(), 5000);
  }
    
  cleanup() {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
        
    if (this.tooltip) {
      this.tooltip.remove();
      this.tooltip = null;
    }
        
    document.removeEventListener('mousemove', this.mouseMoveHandler, true);
    document.removeEventListener('click', this.clickHandler, true);
    document.removeEventListener('keydown', this.keydownHandler, true);
  }
}

}

// Export to window for use in other modules
window.EnhancedSelectorEngine = EnhancedSelectorEngine;

}