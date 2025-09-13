// enhanced-selector.js - Enterprise-grade selector generation and validation
// Based on EasyScraper research patterns for professional web scraping

// Prevent duplicate declarations
if (window.EnhancedSelectorGenerator) {
  console.log('EnhancedSelectorGenerator already loaded, skipping...');
} else {

class EnhancedSelectorGenerator {
  constructor() {
    this.strategies = [
      new DataAttributeStrategy(),
      new IdStrategy(),
      new ClassStrategy(),
      new StructuralStrategy(),
      new XPathStrategy(),
      new FallbackStrategy()
    ];
        
    this.cache = new Map();
  }
    
  generate(element, options = {}) {
    const cacheKey = this.getCacheKey(element, options);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
        
    const results = [];
        
    for (const strategy of this.strategies) {
      try {
        const result = strategy.generate(element, options);
        if (result && result.selector) {
          const validation = this.validateSelector(result.selector, result.type);
          if (validation.isValid && validation.uniqueness >= 0.8) {
            result.validation = validation;
            results.push(result);
                        
            // Return immediately if we have a highly reliable selector
            if (validation.uniqueness >= 0.95 && validation.matchCount <= 10) {
              this.cache.set(cacheKey, result);
              return result;
            }
          }
        }
      } catch (_error) {
        console.warn(`Selector strategy ${strategy.constructor.name} failed:`, _error);
      }
    }
        
    // Sort by reliability score and return best
    results.sort((a, b) => this.calculateReliabilityScore(b) - this.calculateReliabilityScore(a));
        
    const bestResult = results[0] || this.getFallbackSelector(element);
    this.cache.set(cacheKey, bestResult);
        
    return bestResult;
  }
    
  calculateReliabilityScore(result) {
    const validation = result.validation;
    if (!validation) {return 0;}
        
    let score = validation.uniqueness * 100;
        
    // Prefer fewer matches (more specific)
    if (validation.matchCount <= 5) {score += 20;} else if (validation.matchCount <= 10) {score += 10;} else if (validation.matchCount > 50) {score -= 20;}
        
    // Prefer certain selector types
    if (result.type === 'data-attribute') {score += 15;} else if (result.type === 'id') {score += 10;} else if (result.type === 'class') {score += 5;} else if (result.type === 'xpath') {score -= 5;} // XPath is less human-readable
        
    // Prefer shorter selectors
    if (result.selector.length < 50) {score += 10;} else if (result.selector.length > 100) {score -= 10;}
        
    return score;
  }
    
  validateSelector(selector, type = 'css') {
    try {
      let elements = [];
      const isValid = true;
            
      if (type === 'css') {
        elements = Array.from(document.querySelectorAll(selector));
      } else if (type === 'xpath') {
        const result = document.evaluate(
          selector, 
          document, 
          null, 
          XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
          null
        );
        elements = Array.from({ length: result.snapshotLength }, (_, i) => result.snapshotItem(i));
      }
            
      const matchCount = elements.length;
      const uniqueness = matchCount > 0 ? 1 / matchCount : 0;
            
      return {
        isValid,
        matchCount,
        uniqueness,
        elements: elements.slice(0, 5), // Return first 5 for preview
        performance: this.measureSelectorPerformance(selector, type)
      };
            
    } catch (_error) {
      return {
        isValid: false,
        error: _error.message,
        matchCount: 0,
        uniqueness: 0,
        elements: []
      };
    }
  }
    
  measureSelectorPerformance(selector, type) {
    const start = performance.now();
        
    try {
      if (type === 'css') {
        document.querySelectorAll(selector);
      } else if (type === 'xpath') {
        document.evaluate(selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
      }
    } catch (_error) {
      return { time: -1, error: _error.message };
    }
        
    const time = performance.now() - start;
    return { time: Math.round(time * 100) / 100 };
  }
    
  getCacheKey(element, options) {
    const path = this.getElementPath(element);
    const optionsKey = JSON.stringify(options);
    return `${path}:${optionsKey}`;
  }
    
  getElementPath(element) {
    const path = [];
    let current = element;
        
    while (current && current !== document.body && path.length < 10) {
      let identifier = current.tagName.toLowerCase();
      if (current.id) {identifier += `#${current.id}`;}
      if (current.className) {identifier += `.${current.className.split(' ')[0]}`;}
      path.unshift(identifier);
      current = current.parentElement;
    }
        
    return path.join(' > ');
  }
    
  getFallbackSelector(element) {
    const _tagName = element.tagName.toLowerCase();
    const path = this.getElementPath(element);
        
    return {
      selector: path,
      type: 'css',
      strategy: 'fallback',
      confidence: 0.5,
      validation: {
        isValid: true,
        matchCount: 1,
        uniqueness: 1
      }
    };
  }
    
  testSelector(selector, type = 'css') {
    const validation = this.validateSelector(selector, type);
        
    // Visual highlighting
    this.highlightMatches(validation.elements);
        
    return {
      ...validation,
      preview: validation.elements.map(el => this.generateElementPreview(el))
    };
  }
    
  highlightMatches(elements) {
    // Remove existing highlights
    document.querySelectorAll('.steptwo-selector-highlight').forEach(el => {
      el.classList.remove('steptwo-selector-highlight');
      el.style.outline = '';
      el.style.boxShadow = '';
    });
        
    // Add new highlights
    elements.forEach((element, index) => {
      element.classList.add('steptwo-selector-highlight');
      element.style.outline = '2px solid #007acc';
      element.style.outlineOffset = '2px';
      element.style.boxShadow = '0 0 0 4px rgba(0, 122, 204, 0.2)';
            
      // Add numbered label
      const label = document.createElement('div');
      label.style.cssText = `
                position: absolute;
                top: -8px;
                left: -8px;
                background: #007acc;
                color: white;
                width: 20px;
                height: 20px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 11px;
                font-weight: bold;
                z-index: 10000;
                pointer-events: none;
            `;
      label.textContent = index + 1;
      label.className = 'steptwo-selector-label';
            
      const rect = element.getBoundingClientRect();
      label.style.left = `${rect.left + window.scrollX - 8  }px`;
      label.style.top = `${rect.top + window.scrollY - 8  }px`;
      label.style.position = 'absolute';
            
      document.body.appendChild(label);
    });
        
    // Auto-remove highlights after 10 seconds
    setTimeout(() => this.clearHighlights(), 10000);
  }
    
  clearHighlights() {
    document.querySelectorAll('.steptwo-selector-highlight').forEach(el => {
      el.classList.remove('steptwo-selector-highlight');
      el.style.outline = '';
      el.style.boxShadow = '';
    });
        
    document.querySelectorAll('.steptwo-selector-label').forEach(el => {
      el.remove();
    });
  }
    
  generateElementPreview(element) {
    return {
      tagName: element.tagName.toLowerCase(),
      id: element.id,
      className: element.className,
      textContent: `${element.textContent?.substring(0, 100)  }...`,
      attributes: this.getRelevantAttributes(element),
      position: this.getElementPosition(element),
      isVisible: this.isElementVisible(element)
    };
  }
    
  getRelevantAttributes(element) {
    const relevant = {};
    const attrs = ['data-*', 'src', 'href', 'alt', 'title', 'role', 'aria-*'];
        
    for (const attr of element.attributes) {
      if (attrs.some(pattern => {
        if (pattern.includes('*')) {
          return attr.name.startsWith(pattern.replace('*', ''));
        }
        return attr.name === pattern;
      })) {
        relevant[attr.name] = attr.value;
      }
    }
        
    return relevant;
  }
    
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    };
  }
    
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
        
    return rect.width > 0 && 
               rect.height > 0 && 
               style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               style.opacity !== '0';
  }
}

// Selector generation strategies

class DataAttributeStrategy {
  generate(element) {
    const dataAttrs = Array.from(element.attributes)
      .filter(attr => attr.name.startsWith('data-'))
      .sort((a, b) => this.getAttributePriority(a.name) - this.getAttributePriority(b.name));
        
    for (const attr of dataAttrs) {
      const selector = `[${attr.name}="${attr.value}"]`;
      if (document.querySelectorAll(selector).length <= 5) {
        return {
          selector,
          type: 'css',
          strategy: 'data-attribute',
          confidence: 0.95,
          attribute: attr.name
        };
      }
    }
        
    return null;
  }
    
  getAttributePriority(attrName) {
    const priorities = {
      'data-id': 1,
      'data-testid': 2,
      'data-test': 2,
      'data-cy': 2,
      'data-qa': 2,
      'data-component': 3,
      'data-name': 4
    };
        
    return priorities[attrName] || 10;
  }
}

class IdStrategy {
  generate(element) {
    if (element.id && element.id.length > 0) {
      const selector = `#${element.id}`;
            
      // Ensure ID is actually unique
      if (document.querySelectorAll(selector).length === 1) {
        return {
          selector,
          type: 'css',
          strategy: 'id',
          confidence: 0.98
        };
      }
    }
        
    return null;
  }
}

class ClassStrategy {
  generate(element) {
    if (!element.className) {return null;}
        
    const classes = element.className.split(/\s+/)
      .filter(cls => cls.length > 0)
      .filter(cls => this.isMeaningfulClass(cls))
      .sort((a, b) => this.getClassSpecificity(b) - this.getClassSpecificity(a));
        
    // Try single classes first
    for (const cls of classes) {
      const selector = `.${this.escapeCSSSelector(cls)}`;
      let matches = 0;
      try {
        matches = document.querySelectorAll(selector).length;
      } catch (_error) {
        // Skip problematic selectors
        continue;
      }
            
      if (matches <= 3) {
        return {
          selector,
          type: 'css',
          strategy: 'class',
          confidence: 0.8 - (matches * 0.1),
          className: cls
        };
      }
    }
        
    // Try class combinations
    if (classes.length >= 2) {
      const escapedClasses = classes.slice(0, 2).map(cls => this.escapeCSSSelector(cls));
      const combinedSelector = `.${escapedClasses.join('.')}`;
      let matches = 0;
      try {
        matches = document.querySelectorAll(combinedSelector).length;
      } catch (_error) {
        // Skip problematic selectors
        return null;
      }
            
      if (matches <= 5) {
        return {
          selector: combinedSelector,
          type: 'css',
          strategy: 'class-combination',
          confidence: 0.85 - (matches * 0.05),
          classes: classes.slice(0, 2)
        };
      }
    }
        
    return null;
  }
    
  isMeaningfulClass(className) {
    // Filter out utility classes and framework-specific classes
    const utilityPatterns = [
      /^(p|m|pt|pb|pl|pr|mt|mb|ml|mr)-\d+$/,
      /^(w|h)-\d+$/,
      /^text-(xs|sm|md|lg|xl|2xl|3xl)$/,
      /^bg-(red|blue|green|yellow|purple|pink|gray)-\d+$/,
      /^(flex|grid|block|inline|hidden)$/,
      /^(absolute|relative|fixed|sticky)$/,
      /^(rounded|shadow|border)(-\w+)?$/,
      /^tw-.*\[.*\].*$/, // Tailwind classes with brackets like tw-max-h-[270px]
      /^.*:tw-.*$/, // Tailwind pseudo-classes like focus-visible:tw-outline-none
      /^\[&_.*\]:.*$/ // Tailwind complex selectors like [&_svg]:tw-pointer-events-none
    ];
        
    return !utilityPatterns.some(pattern => pattern.test(className)) &&
               className.length >= 3 &&
               !className.match(/^[0-9]+$/) &&
               !className.includes('--');
  }

  // CSS escape utility for special characters in class names
  escapeCSSSelector(selector) {
    if (!selector) return selector;
    
    // Escape special characters that are problematic in CSS selectors
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
    
  getClassSpecificity(className) {
    // Prefer semantic class names
    const semanticWords = ['item', 'card', 'container', 'wrapper', 'content', 'image', 'photo', 'gallery'];
    const semanticScore = semanticWords.some(word => className.toLowerCase().includes(word)) ? 10 : 0;
        
    // Prefer longer, more descriptive class names
    const lengthScore = Math.min(className.length / 10, 5);
        
    return semanticScore + lengthScore;
  }
}

class StructuralStrategy {
  generate(element) {
    const path = this.buildStructuralPath(element);
        
    if (path.length > 0) {
      const selector = path.join(' > ');
            
      return {
        selector,
        type: 'css',
        strategy: 'structural',
        confidence: 0.7,
        path
      };
    }
        
    return null;
  }
    
  buildStructuralPath(element, maxDepth = 5) {
    const path = [];
    let current = element;
    let depth = 0;
        
    while (current && current !== document.body && depth < maxDepth) {
      const descriptor = this.createElementDescriptor(current);
            
      if (descriptor) {
        path.unshift(descriptor);
                
        // Check if current path is unique enough
        const testSelector = path.join(' > ');
        let matches = 0;
        try {
          matches = document.querySelectorAll(testSelector).length;
        } catch (_error) {
          // Skip problematic selectors
          continue;
        }
                
        if (matches <= 3) {
          break;
        }
      }
            
      current = current.parentElement;
      depth++;
    }
        
    return path;
  }
    
  createElementDescriptor(element) {
    let descriptor = element.tagName.toLowerCase();
        
    // Add meaningful identifier
    if (element.id) {
      descriptor += `#${element.id}`;
    } else if (element.className) {
      const meaningfulClasses = element.className.split(/\s+/)
        .filter(cls => this.isMeaningfulClass(cls))
        .slice(0, 2);
            
      if (meaningfulClasses.length > 0) {
        descriptor += `.${meaningfulClasses.join('.')}`;
      }
    }
        
    // Add position-based selector if needed
    const siblings = Array.from(element.parentElement?.children || []);
    const sameTagSiblings = siblings.filter(sibling => 
      sibling.tagName === element.tagName
    );
        
    if (sameTagSiblings.length > 1) {
      const index = sameTagSiblings.indexOf(element) + 1;
      descriptor += `:nth-of-type(${index})`;
    }
        
    return descriptor;
  }
    
  isMeaningfulClass(className) {
    return className.length >= 3 && 
               !className.match(/^[0-9]+$/) &&
               !className.includes('--') &&
               !className.startsWith('js-');
  }
}

class XPathStrategy {
  generate(element) {
    const xpath = this.generateXPath(element);
        
    if (xpath) {
      return {
        selector: xpath,
        type: 'xpath',
        strategy: 'xpath',
        confidence: 0.75
      };
    }
        
    return null;
  }
    
  generateXPath(element) {
    if (element.id) {
      return `//*[@id="${element.id}"]`;
    }
        
    const path = [];
    let current = element;
        
    while (current && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();
            
      // Try to use unique attributes
      const uniqueAttr = this.findUniqueAttribute(current);
      if (uniqueAttr) {
        selector += `[@${uniqueAttr.name}="${uniqueAttr.value}"]`;
        path.unshift(selector);
        break;
      }
            
      // Use position-based selector
      const siblings = Array.from(current.parentElement?.children || [])
        .filter(sibling => sibling.tagName === current.tagName);
            
      if (siblings.length > 1) {
        const position = siblings.indexOf(current) + 1;
        selector += `[${position}]`;
      }
            
      path.unshift(selector);
      current = current.parentElement;
    }
        
    return `//${  path.join('/')}`;
  }
    
  findUniqueAttribute(element) {
    const priorityAttrs = ['data-id', 'data-testid', 'data-test', 'class', 'name', 'value'];
        
    for (const attrName of priorityAttrs) {
      const attr = element.attributes[attrName];
      if (attr) {
        const xpath = `//*[@${attrName}="${attr.value}"]`;
        try {
          const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
          if (result.snapshotLength <= 3) {
            return attr;
          }
        } catch (_error) {
          continue;
        }
      }
    }
        
    return null;
  }
}

class FallbackStrategy {
  generate(element) {
    // Simple tag-based selector with position
    const tagName = element.tagName.toLowerCase();
    const allElements = Array.from(document.querySelectorAll(tagName));
    const index = allElements.indexOf(element) + 1;
        
    return {
      selector: `${tagName}:nth-of-type(${index})`,
      type: 'css',
      strategy: 'fallback',
      confidence: 0.3,
      note: 'Basic fallback selector - may not be reliable'
    };
  }
}

// Selector validation and testing utilities
class SelectorTester {
  static test(selector, type = 'css') {
    const generator = new EnhancedSelectorGenerator();
    return generator.testSelector(selector, type);
  }
    
  static validate(selector, type = 'css') {
    const generator = new EnhancedSelectorGenerator();
    return generator.validateSelector(selector, type);
  }
    
  static highlight(selector, type = 'css') {
    const validation = this.validate(selector, type);
    const generator = new EnhancedSelectorGenerator();
    generator.highlightMatches(validation.elements);
    return validation;
  }
    
  static clearHighlights() {
    const generator = new EnhancedSelectorGenerator();
    generator.clearHighlights();
  }
}

}

// Export to window for use in other modules
window.EnhancedSelectorGenerator = EnhancedSelectorGenerator;
window.SelectorTester = SelectorTester;