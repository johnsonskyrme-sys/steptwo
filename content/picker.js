import {getCssPath} from '../lib/css-path.js';

let overlay;
let tooltip;
let selectedElements = [];
let isMultiSelect = false;

export function startPicker(options = {}) {
  if (overlay) {return;}
  
  isMultiSelect = options.multiSelect || false;
  
  createOverlay();
  createTooltip();
  
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('keydown', handleKeyDown, true);
  
  showInstructions();
}

function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483647;
    pointer-events: none;
    border: 2px solid #007acc;
    background: rgba(0, 122, 204, 0.1);
    transition: all 0.1s ease;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5), 
                0 0 10px rgba(0, 122, 204, 0.3);
  `;
  document.body.appendChild(overlay);
}

function createTooltip() {
  tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 12px;
    z-index: 2147483648;
    pointer-events: none;
    max-width: 300px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  `;
  document.body.appendChild(tooltip);
}

function handleMouseMove(e) {
  const el = e.target;
  if (el === overlay || el === tooltip) {return;}
  
  const rect = el.getBoundingClientRect();
  
  // Update overlay position
  overlay.style.top = `${rect.top  }px`;
  overlay.style.left = `${rect.left  }px`;
  overlay.style.width = `${rect.width  }px`;
  overlay.style.height = `${rect.height  }px`;
  
  // Update tooltip
  updateTooltip(el, e);
}

function updateTooltip(element, event) {
  const tagName = element.tagName.toLowerCase();
  const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
  const id = element.id ? `#${element.id}` : '';
  
  // Generate preview selector
  const selector = getCssPath(element);
  const shortSelector = selector.length > 50 ? `${selector.substring(0, 50)  }...` : selector;
  
  // Count similar elements
  const similarCount = document.querySelectorAll(tagName + className).length;
  
  // Check if it's an image or contains images
  const isImage = tagName === 'img';
  const hasImages = element.querySelectorAll('img').length;
  
  let content = `
    <div style="font-weight: 600; margin-bottom: 4px;">
      ${tagName}${id}${className}
    </div>
    <div style="opacity: 0.8; margin-bottom: 4px;">
      ${shortSelector}
    </div>
    <div style="opacity: 0.6; font-size: 11px;">
      ${similarCount} similar elements
      ${isImage ? ' • Image element' : ''}
      ${hasImages > 0 ? ` • Contains ${hasImages} images` : ''}
    </div>
  `;
  
  if (isMultiSelect && selectedElements.length > 0) {
    content += `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px;">
      Selected: ${selectedElements.length} elements
    </div>`;
  }
  
  content += `<div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); font-size: 11px; opacity: 0.8;">
    Click to select • ESC to cancel${isMultiSelect ? ' • CTRL+Click for multi-select' : ''}
  </div>`;
  
  tooltip.innerHTML = content;
  
  // Position tooltip
  const tooltipRect = tooltip.getBoundingClientRect();
  let x = event.clientX + 10;
  let y = event.clientY - tooltipRect.height - 10;
  
  // Keep tooltip in viewport
  if (x + tooltipRect.width > window.innerWidth) {
    x = event.clientX - tooltipRect.width - 10;
  }
  if (y < 0) {
    y = event.clientY + 10;
  }
  
  tooltip.style.left = `${x  }px`;
  tooltip.style.top = `${y  }px`;
}

function handleClick(e) {
  e.preventDefault();
  e.stopPropagation();
  
  const element = e.target;
  if (element === overlay || element === tooltip) {return;}
  
  if (isMultiSelect && e.ctrlKey) {
    // Multi-select mode
    if (!selectedElements.includes(element)) {
      selectedElements.push(element);
      highlightSelectedElement(element);
    }
  } else {
    // Single select or finish multi-select
    const selector = getCssPath(element);
    const selectedInfo = {
      selector,
      element: element.tagName.toLowerCase(),
      count: document.querySelectorAll(selector).length,
      isImage: element.tagName.toLowerCase() === 'img',
      hasImages: element.querySelectorAll('img').length
    };
    
    if (isMultiSelect && selectedElements.length > 0) {
      // Include multi-select data
      selectedInfo.multiSelect = selectedElements.map(el => ({
        selector: getCssPath(el),
        element: el.tagName.toLowerCase()
      }));
    }
    
    cleanup();
    chrome.runtime.sendMessage({type:'PICKER_DONE', ...selectedInfo});
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    cleanup();
    chrome.runtime.sendMessage({type:'PICKER_CANCELLED'});
  }
}

function highlightSelectedElement(element) {
  const highlight = document.createElement('div');
  const rect = element.getBoundingClientRect();
  
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
  `;
  
  highlight.className = 'steptwo-highlight';
  document.body.appendChild(highlight);
}

function showInstructions() {
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 13px;
    z-index: 2147483648;
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  `;
  
  instructions.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 8px;">🎯 Element Picker Mode</div>
    <div style="opacity: 0.9; line-height: 1.4;">
      • Hover over elements to preview<br>
      • Click to select an element<br>
      ${isMultiSelect ? '• Ctrl+Click for multi-select<br>' : ''}
      • Press ESC to cancel
    </div>
  `;
  
  instructions.className = 'steptwo-instructions';
  document.body.appendChild(instructions);
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    if (instructions.parentNode) {
      instructions.remove();
    }
  }, 5000);
}

function cleanup() {
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  
  if (overlay) {
    overlay.remove();
    overlay = null;
  }
  
  if (tooltip) {
    tooltip.remove();
    tooltip = null;
  }
  
  // Remove highlights and instructions
  document.querySelectorAll('.steptwo-highlight, .steptwo-instructions').forEach(el => el.remove());
  
  selectedElements = [];
  isMultiSelect = false;
}

export function stopPicker() {
  cleanup();
}