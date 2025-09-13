// Enhanced macro recorder with advanced interaction tracking
import {getCssPath} from '../../lib/css-path.js';

let recording = false;
let steps = [];
let lastTime = Date.now();
let lastTarget = null;
let mutationObserver;
let urlAtStart = location.href;
let urlAtClick = location.href;
let sessionId = null;
let recordingStartTime = null;

// Enhanced observers for better macro recording
function startObservers(){
  if(mutationObserver) {return;}
  
  // Enhanced mutation observer with more detailed tracking
  mutationObserver = new MutationObserver((mutations) => {
    if (!recording) {return;}
    
    // Track significant DOM changes
    const significantChanges = mutations.filter(mut => 
      (mut.type === 'childList' && mut.addedNodes.length > 0) ||
      (mut.type === 'attributes' && ['class', 'style', 'src'].includes(mut.attributeName))
    );
    
    if (significantChanges.length > 3) {
      addStep({
        type: 'waitUntil',
        condition: 'domStable',
        timeout: 2000,
        description: `Wait for DOM to stabilize (${significantChanges.length} changes detected)`
      });
    }
  });
  
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'src', 'href']
  });
}

function stopObservers(){
  if(mutationObserver){
    mutationObserver.disconnect();
    mutationObserver=null;
  }
}

// Enhanced wait condition inference
function inferWaitUntil(){
  const now = Date.now();
  
  // URL change detection
  if(location.href !== urlAtClick){
    addStep({
      type: 'waitUntil',
      condition: 'urlChange',
      expectedUrl: location.href,
      timeout: 10000,
      description: `Wait for navigation to ${new URL(location.href).pathname}`
    });
    urlAtClick = location.href;
    return;
  }
  
  // Element visibility detection
  if(lastTarget){
    const sel = getCssPath(lastTarget);
    if(document.querySelector(sel)){
      addStep({
        type: 'waitUntil',
        condition: 'elementVisible',
        selector: sel,
        timeout: 5000,
        description: `Wait for element to be visible: ${sel.slice(0, 50)}...`
      });
    } else {
      addStep({
        type: 'waitUntil',
        condition: 'domStable',
        timeout: 3000,
        description: 'Wait for DOM to stabilize after interaction'
      });
    }
  }
  
  lastTime = now;
}

// Enhanced step recording with metadata
function addStep(step) {
  const enhancedStep = {
    ...step,
    timestamp: Date.now(),
    relativeTime: Date.now() - recordingStartTime,
    pageUrl: location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    }
  };
  
  steps.push(enhancedStep);
  console.log('[MACRO] Recorded step:', enhancedStep);
}

// Enhanced click handler with detailed tracking
function onClick(e){
  if(!recording) {return;}
  
  const now = Date.now();
  const gap = now - lastTime;
  
  // Add delay if significant gap between actions
  if(gap > 800) {
    addStep({
      type: 'delay',
      ms: Math.min(gap, 5000), // Cap at 5 seconds
      description: `Wait ${gap}ms between actions`
    });
  }
  
  const target = e.target;
  const sel = getCssPath(target);
  const rect = target.getBoundingClientRect();
  
  addStep({
    type: 'click',
    selector: sel,
    button: e.button,
    modifiers: {
      ctrl: e.ctrlKey,
      shift: e.shiftKey,
      alt: e.altKey,
      meta: e.metaKey
    },
    coordinates: {
      x: e.clientX,
      y: e.clientY,
      relativeX: e.clientX - rect.left,
      relativeY: e.clientY - rect.top
    },
    targetText: target.textContent?.slice(0, 50) || '',
    targetTag: target.tagName.toLowerCase(),
    targetType: target.type || '',
    description: `Click ${target.tagName.toLowerCase()}${target.id ? `#${  target.id}` : ''}${target.className ? `.${  target.className.split(' ')[0]}` : ''}`
  });
  
  lastTarget = target;
  lastTime = now;
  
  // Infer wait conditions after click
  setTimeout(inferWaitUntil, 100);
}

// Enhanced scroll handler with intelligent tracking
let lastScrollY = window.scrollY;
const lastScrollTime = Date.now();
let scrollTimeout = null;

function onScroll(){
  if(!recording) {return;}
  
  const now = Date.now();
  const currentScrollY = window.scrollY;
  const delta = currentScrollY - lastScrollY;
  
  // Ignore very small movements
  if(Math.abs(delta) < 20) {return;}
  
  // Debounce scroll events to capture meaningful scrolling
  if(scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
  
  scrollTimeout = setTimeout(() => {
    const gap = now - lastTime;
    
    if(gap > 800) {
      addStep({
        type: 'delay',
        ms: gap,
        description: `Wait ${gap}ms before scrolling`
      });
    }
    
    addStep({
      type: 'scroll',
      deltaY: delta,
      fromY: lastScrollY,
      toY: currentScrollY,
      behavior: Math.abs(delta) > 500 ? 'auto' : 'smooth',
      description: `Scroll ${delta > 0 ? 'down' : 'up'} by ${Math.abs(delta)}px`
    });
    
    lastScrollY = currentScrollY;
    lastTime = now;
    lastTarget = null;
    
    // Add wait for scroll to complete
    setTimeout(() => {
      addStep({
        type: 'waitUntil',
        condition: 'scrollComplete',
        timeout: 1000,
        description: 'Wait for scroll to complete'
      });
    }, 100);
    
  }, 200); // Debounce by 200ms
}

// Enhanced input handler with comprehensive form tracking
function onInput(e){
  if(!recording) {return;}
  
  const now = Date.now();
  const gap = now - lastTime;
  const target = e.target;
  const sel = getCssPath(target);
  
  if(gap > 800) {
    addStep({
      type: 'delay',
      ms: gap,
      description: `Wait ${gap}ms before input`
    });
  }
  
  addStep({
    type: 'input',
    selector: sel,
    value: target.value,
    inputType: target.type || 'text',
    placeholder: target.placeholder || '',
    fieldName: target.name || target.id || '',
    isPassword: target.type === 'password',
    description: `Enter text in ${target.tagName.toLowerCase()}${target.name ? ` "${  target.name  }"` : ''}`
  });
  
  lastTarget = target;
  lastTime = now;
}

// Enhanced keyboard event handler
function onKeydown(e) {
  if(!recording) {return;}
  
  // Record special key combinations
  if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'Escape' || 
      (e.ctrlKey && ['a', 'c', 'v', 'x', 'z', 'y'].includes(e.key.toLowerCase()))) {
    
    const now = Date.now();
    const gap = now - lastTime;
    
    if(gap > 500) {
      addStep({
        type: 'delay',
        ms: gap,
        description: `Wait ${gap}ms before key press`
      });
    }
    
    addStep({
      type: 'keypress',
      key: e.key,
      code: e.code,
      modifiers: {
        ctrl: e.ctrlKey,
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey
      },
      description: `Press ${e.ctrlKey ? 'Ctrl+' : ''}${e.shiftKey ? 'Shift+' : ''}${e.altKey ? 'Alt+' : ''}${e.key}`
    });
    
    lastTime = now;
  }
}

// Enhanced recording start with session management
export function startRecording(){
  if(recording) {
    console.warn('[MACRO] Recording already in progress');
    return;
  }
  
  recording = true;
  steps = [];
  sessionId = `macro_${  Date.now()  }_${  Math.random().toString(36).substr(2, 9)}`;
  recordingStartTime = Date.now();
  urlAtStart = location.href;
  urlAtClick = location.href;
  lastTime = Date.now();
  
  // Add initial state
  addStep({
    type: 'start',
    sessionId: sessionId,
    startUrl: urlAtStart,
    userAgent: navigator.userAgent,
    description: `Start macro recording session on ${new URL(urlAtStart).hostname}`
  });
  
  // Attach enhanced event listeners
  document.addEventListener('click', onClick, true);
  document.addEventListener('input', onInput, true);
  document.addEventListener('keydown', onKeydown, true);
  window.addEventListener('scroll', onScroll, true);
  
  startObservers();
  
  console.log('[MACRO] Recording started with session ID:', sessionId);
  
  // Show visual indicator
  showRecordingIndicator();
}

export function stopRecording(){
  if(!recording) {
    console.warn('[MACRO] No recording in progress');
    return;
  }
  
  recording = false;
  
  // Add final state
  addStep({
    type: 'end',
    sessionId: sessionId,
    endUrl: location.href,
    duration: Date.now() - recordingStartTime,
    totalSteps: steps.length,
    description: `End macro recording session (${steps.length} steps recorded)`
  });
  
  // Remove event listeners
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('input', onInput, true);
  document.removeEventListener('keydown', onKeydown, true);
  window.removeEventListener('scroll', onScroll, true);
  
  stopObservers();
  
  // Clean up
  if(scrollTimeout) {
    clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }
  
  // Hide visual indicator
  hideRecordingIndicator();
  
  console.log('[MACRO] Recording stopped. Steps recorded:', steps.length);
  
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'REC_COMPLETE',
    sessionId: sessionId,
    steps: steps,
    duration: Date.now() - recordingStartTime,
    startUrl: urlAtStart,
    endUrl: location.href
  });
}

// Visual recording indicator
function showRecordingIndicator() {
  const indicator = document.createElement('div');
  indicator.id = 'steptwo-recording-indicator';
  indicator.innerHTML = `
    <div style="
      position: fixed;
      top: 20px;
      left: 20px;
      background: #e74c3c;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 12px;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(231, 76, 60, 0.3);
      animation: steptwo-pulse 2s infinite;
    ">
      🔴 Recording Macro
    </div>
    <style>
      @keyframes steptwo-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
    </style>
  `;
  document.body.appendChild(indicator);
}

function hideRecordingIndicator() {
  const indicator = document.getElementById('steptwo-recording-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Legacy exports for backward compatibility
export const startRec = startRecording;
export const stopRec = stopRecording;