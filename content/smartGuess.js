// smartGuess.js – Advanced heuristic inspired by Instant Data Scraper
import {getCssPath} from '../lib/css-path.js';

// Utility: check visible
function isVisible(el){
  const rect = el.getBoundingClientRect();
  return rect.width>0 && rect.height>0 && rect.bottom>0 && rect.right>0 && getComputedStyle(el).display!=='none' && getComputedStyle(el).visibility!=='hidden';
}

// Advanced pattern recognition for galleries
function analyzeImagePatterns() {
  const images = Array.from(document.querySelectorAll('img')).filter(isVisible);
  const patterns = new Map();
  
  for (const img of images) {
    // Analyze parent containers
    let container = img.closest('[class*="gallery"], [class*="grid"], [class*="item"], [class*="card"], [class*="photo"]');
    if (!container) {
      container = img.closest('div, article, section, li');
    }
    if (!container) {
      continue;
    }
    
    // Create pattern signature
    const pattern = {
      tagName: container.tagName.toLowerCase(),
      classList: Array.from(container.classList).sort().join('.'),
      hasLink: !!container.querySelector('a'),
      imageCount: container.querySelectorAll('img').length,
      position: container.getBoundingClientRect()
    };
    
    const signature = `${pattern.tagName}|${pattern.classList}|${pattern.hasLink}|${pattern.imageCount}`;
    
    if (!patterns.has(signature)) {
      patterns.set(signature, {
        containers: [],
        score: 0,
        pattern
      });
    }
    
    const entry = patterns.get(signature);
    entry.containers.push(container);
    
    // Calculate pattern score
    entry.score = calculatePatternScore(entry.containers, pattern);
  }
  
  return patterns;
}

function calculatePatternScore(containers, pattern) {
  let score = 0;
  
  // Repetition bonus
  score += containers.length * 10;
  
  // Layout consistency bonus
  if (containers.length >= 3) {
    const positions = containers.map(c => c.getBoundingClientRect());
    const avgHeight = positions.reduce((sum, pos) => sum + pos.height, 0) / positions.length;
    const heightVariance = positions.reduce((sum, pos) => sum + Math.abs(pos.height - avgHeight), 0) / positions.length;
    
    if (heightVariance < avgHeight * 0.3) {
      score += 20; // Consistent heights
    }
    
    // Grid detection
    const rows = groupByRow(positions);
    if (rows.length >= 2) {
      const avgItemsPerRow = rows.reduce((sum, row) => sum + row.length, 0) / rows.length;
      if (avgItemsPerRow >= 2) {
        score += 30; // Grid layout
      }
    }
  }
  
  // Content quality bonus
  if (pattern.hasLink) {
    score += 15;
  }
  if (pattern.imageCount === 1) {
    score += 10; // Single image per container is typical
  }
  
  // Gallery-related class names
  const classText = pattern.classList.toLowerCase();
  if (/gallery|grid|photo|image|item|card|tile/.test(classText)) {
    score += 25;
  }
  if (/thumb|preview|thumbnail/.test(classText)) {
    score += 20;
  }
  
  return score;
}

function groupByRow(positions, tolerance = 20) {
  const rows = [];
  const sorted = positions.slice().sort((a, b) => a.top - b.top);
  
  for (const pos of sorted) {
    let foundRow = false;
    for (const row of rows) {
      if (Math.abs(row[0].top - pos.top) <= tolerance) {
        row.push(pos);
        foundRow = true;
        break;
      }
    }
    if (!foundRow) {
      rows.push([pos]);
    }
  }
  
  return rows;
}

// Site-specific pattern detection
function detectSiteSpecificPatterns() {
  const hostname = window.location.hostname.toLowerCase();
  const pathname = window.location.pathname.toLowerCase();
  
  // Common site patterns
  const sitePatterns = {
    'pinterest.com': [
      '[data-test-id="pin"]',
      '[data-test-id="pin-image"]',
      '.pinWrapper img'
    ],
    'instagram.com': [
      'article img',
      '[role="presentation"] img',
      '.v1Nh3'
    ],
    'flickr.com': [
      '.photo-list-photo-view img',
      '.search-photos-results img',
      '.photo-engagement-view img'
    ],
    'gettyimages.com': [
      'img[data-testid="gallery-asset-image"]',
      '.gallery-mosaic-asset__image',
      '.search-result img'
    ],
    'shutterstock.com': [
      'img[data-automation="mosaic-grid-cell-image"]',
      '.mosaic-grid-cell img',
      '.search-result img'
    ],
    'unsplash.com': [
      'img[data-test="photo-grid-image"]',
      '.photo-grid img',
      '[data-testid="photo-grid"] img'
    ],
    'mirrorpix.com': [
      // Enhanced MirrorPix selectors based on page type
      ...(pathname.includes('/offer/') ? [
        '.offer-image img',
        '.offer-gallery img', 
        '.offer-content img',
        'img[src*="offer"]'
      ] : []),
      'img.medium-thumbnail',
      'img[id^="medium__"]',
      '.gallery-item img',
      '.image-container img',
      '.thumbnail-container img',
      '[class*="thumb"] img',
      '[class*="image"] img'
    ]
  };
  
  // Check for MirrorPix-style patterns on any historical archive site
  const historicalArchivePatterns = [
    'img.medium-thumbnail',
    'img[id^="medium__"]', 
    '.offer-image img',
    '.archive-image img',
    '.historical-photo img'
  ];
  
  // Test MirrorPix patterns on any site that might be a historical archive
  if (hostname.includes('archive') || hostname.includes('historical') || 
      hostname.includes('news') || hostname.includes('photo') ||
      pathname.includes('/offer/') || pathname.includes('/archive/')) {
    
    for (const selector of historicalArchivePatterns) {
      const elements = Array.from(document.querySelectorAll(selector)).filter(isVisible);
      if (elements.length >= 2) {
        return { 
          selector, 
          elements, 
          confidence: 0.85, 
          source: 'historical-archive-pattern',
          note: 'MirrorPix-style historical archive detected'
        };
      }
    }
  }
  
  for (const [site, selectors] of Object.entries(sitePatterns)) {
    if (hostname.includes(site)) {
      for (const selector of selectors) {
        const elements = Array.from(document.querySelectorAll(selector)).filter(isVisible);
        if (elements.length >= 3) {
          return { selector, elements, confidence: 0.9, source: 'site-specific' };
        }
      }
    }
  }
  
  return null;
}

// Data attribute analysis
function analyzeDataAttributes() {
  const candidates = [];
  const images = Array.from(document.querySelectorAll('img')).filter(isVisible);
  
  for (const img of images) {
    const attributes = Array.from(img.attributes);
    for (const attr of attributes) {
      if (attr.name.startsWith('data-') && 
          /test|id|gallery|photo|image|grid|item/.test(attr.name)) {
        const selector = `img[${attr.name}]`;
        const matches = Array.from(document.querySelectorAll(selector)).filter(isVisible);
        if (matches.length >= 3) {
          candidates.push({
            selector,
            elements: matches,
            confidence: 0.8,
            source: 'data-attribute'
          });
        }
      }
    }
  }
  
  return candidates.sort((a, b) => b.elements.length - a.elements.length)[0];
}

export async function guessSelector(){
  try {
    // 1. Try site-specific patterns first
    const siteSpecific = detectSiteSpecificPatterns();
    if (siteSpecific) {
      highlightElements(siteSpecific.elements.slice(0, 5));
      return {
        selector: siteSpecific.selector,
        count: siteSpecific.elements.length,
        confidence: siteSpecific.confidence,
        source: siteSpecific.source
      };
    }
    
    // 2. Try data attribute analysis
    const dataAttrResult = analyzeDataAttributes();
    if (dataAttrResult) {
      highlightElements(dataAttrResult.elements.slice(0, 5));
      return dataAttrResult;
    }
    
    // 3. Use advanced pattern analysis
    const patterns = analyzeImagePatterns();
    let bestPattern = null;
    let bestScore = 0;
    
    for (const [_signature, data] of patterns) {
      if (data.score > bestScore && data.containers.length >= 3) {
        bestPattern = data;
        bestScore = data.score;
      }
    }
    
    if (bestPattern) {
      const selector = getCssPath(bestPattern.containers[0]);
      const imageSelector = `${selector} img`;
      const elements = Array.from(document.querySelectorAll(imageSelector)).filter(isVisible);
      
      highlightElements(bestPattern.containers.slice(0, 5));
      
      return {
        selector: imageSelector,
        count: elements.length,
        confidence: Math.min(0.9, bestScore / 100),
        source: 'pattern-analysis',
        containerSelector: selector,
        containerCount: bestPattern.containers.length
      };
    }
    
    // 4. Fallback to original algorithm
    const map = new Map(); // hash -> nodes array
    const all = Array.from(document.querySelectorAll('body *'));
    for(const el of all){
      if(!isVisible(el)) {
        continue;
      }
      const hash = `${el.tagName.toLowerCase()}|${Array.from(el.classList).sort().join('.')}`;
      const arr = map.get(hash)||[];
      arr.push(el);
      map.set(hash,arr);
    }

    let best=null;
    for(const [_hash,nodes] of map){
      if(nodes.length<5) {
        continue; // need repetition
      }
      // compute average height and gap
      let totalH=0, totalGap=0;
      for(let i=0;i<nodes.length;i++){
        const r=nodes[i].getBoundingClientRect();
        totalH+=r.height;
        if(i>0){ totalGap+=r.top - nodes[i-1].getBoundingClientRect().bottom; }
      }
      const avgH = totalH/nodes.length;
      const avgGap = totalGap/Math.max(1,nodes.length-1);
      if(avgGap/avgH>0.6) {
        continue; // rows too far apart
      }
      // ensure it contains img or link
      const first = nodes[0];
      if(!first.querySelector('img, a')) {
        continue;
      }

      const areaScore = nodes.length * avgH;
      if(!best || areaScore>best.areaScore){
        best={nodes, areaScore};
      }
    }

    if(!best) {
      return {
        selector: '',
        count: 0,
        confidence: 0,
        source: 'fallback',
        error: 'No suitable gallery pattern detected'
      };
    }
    
    const selector = getCssPath(best.nodes[0]);
    const finalSelector = `${selector} img, ${selector} a`;
    const elements = Array.from(document.querySelectorAll(finalSelector)).filter(isVisible);
    
    highlightElements(best.nodes.slice(0,3));
    
    return {
      selector: finalSelector,
      count: elements.length,
      confidence: 0.6,
      source: 'fallback'
    };
    
  } catch (_error) {
    console.error('Smart guess error:', _error);
    return {
      selector: '',
      count: 0,
      confidence: 0,
      source: 'error',
      error: _error.message
    };
  }
}

function highlightElements(elements) {
  // Remove existing highlights
  document.querySelectorAll('.steptwo-smart-highlight').forEach(el => el.remove());
  
  elements.forEach((el, index) => {
    const rect = el.getBoundingClientRect();
    const highlight = document.createElement('div');
    
    highlight.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 2px solid #28a745;
      background: rgba(40, 167, 69, 0.2);
      z-index: 2147483646;
      pointer-events: none;
      transition: opacity 0.3s ease;
    `;
    
    highlight.className = 'steptwo-smart-highlight';
    document.body.appendChild(highlight);
    
    // Add number label
    const label = document.createElement('div');
    label.style.cssText = `
      position: absolute;
      top: -20px;
      left: 0;
      background: #28a745;
      color: white;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 11px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-weight: 600;
    `;
    label.textContent = index + 1;
    highlight.appendChild(label);
  });
  
  // Auto-remove highlights after 5 seconds
  setTimeout(() => {
    document.querySelectorAll('.steptwo-smart-highlight').forEach(el => el.remove());
  }, 5000);
}

// Analyze pagination patterns
export function detectPagination() {
  const paginationPatterns = [
    'a[aria-label*="next"]',
    'a[aria-label*="Next"]',
    '.pagination .next',
    '.pagination-next',
    '[data-testid*="next"]',
    '[data-test*="next"]',
    'a[href*="page="]',
    '.load-more',
    '[class*="load-more"]',
    '[data-automation*="next"]'
  ];
  
  for (const pattern of paginationPatterns) {
    const elements = Array.from(document.querySelectorAll(pattern)).filter(isVisible);
    if (elements.length > 0) {
      return {
        selector: pattern,
        elements: elements,
        type: pattern.includes('load') ? 'load-more' : 'pagination'
      };
    }
  }
  
  return null;
}

// Legacy highlight function for compatibility
export function highlight(elements) {
  highlightElements(elements);
}

// Main smartGuess function that orchestrates all the detection methods
export function smartGuess(_options = {}) {
  return guessSelector();
}