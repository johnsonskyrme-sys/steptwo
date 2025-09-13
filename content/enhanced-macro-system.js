// enhanced-macro-system.js - Advanced macro recording and playback system
// Combines features from research files for comprehensive workflow automation

// Prevent duplicate declarations
if (window.EnhancedMacroSystem) {
  console.log('EnhancedMacroSystem already loaded, skipping...');
} else {

class EnhancedMacroSystem {
  constructor(options = {}) {
    this.options = {
      maxActions: options.maxActions || 1000,
      captureScreenshots: options.captureScreenshots !== false,
      captureNetwork: options.captureNetwork !== false,
      playbackSpeed: options.playbackSpeed || 1.0,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      ...options
    };
        
    this.isRecording = false;
    this.isPlaying = false;
    this.currentMacro = null;
    this.recordedActions = [];
    this.playbackPosition = 0;
    this.startTime = null;
        
    this.eventListeners = new Map();
    this.conditionWaiter = new ConditionWaiter();
    this.networkMonitor = new NetworkMonitor();
    this.screenshotManager = new ScreenshotManager();
        
    this.bindEventHandlers();
  }
    
  // Start recording user interactions
  startRecording(macroName = `macro_${Date.now()}`) {
    if (this.isRecording) {
      throw new Error('Already recording a macro');
    }
        
    this.isRecording = true;
    this.recordedActions = [];
    this.startTime = Date.now();
    this.currentMacro = {
      name: macroName,
      createdAt: new Date(),
      version: '2.0',
      metadata: {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      },
      actions: this.recordedActions
    };
        
    this.setupRecordingListeners();
    this.captureInitialState();
        
    this.showRecordingIndicator();
        
    console.log(`📹 Started recording macro: ${macroName}`);
    return this.currentMacro;
  }
    
  // Stop recording and finalize macro
  stopRecording() {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }
        
    this.isRecording = false;
    this.removeRecordingListeners();
    this.hideRecordingIndicator();
        
    // Finalize macro
    this.currentMacro.duration = Date.now() - this.startTime;
    this.currentMacro.actionCount = this.recordedActions.length;
    this.currentMacro.finalUrl = window.location.href;
        
    // Add summary action
    this.recordedActions.push({
      type: 'summary',
      timestamp: Date.now() - this.startTime,
      description: `Macro completed with ${this.recordedActions.length} actions`
    });
        
    console.log(`⏹️ Stopped recording macro: ${this.currentMacro.name}`);
    return { ...this.currentMacro };
  }
    
  // Play back a recorded macro
  async playMacro(macro, options = {}) {
    if (this.isPlaying) {
      throw new Error('Already playing a macro');
    }
        
    this.isPlaying = true;
    this.playbackPosition = 0;
        
    const playbackOptions = { ...this.options, ...options };
        
    try {
      console.log(`▶️ Starting playback of macro: ${macro.name}`);
      this.showPlaybackIndicator(macro);
            
      for (let i = 0; i < macro.actions.length; i++) {
        if (!this.isPlaying) {break;} // Stopped during playback
                
        this.playbackPosition = i;
        const action = macro.actions[i];
                
        await this.executeAction(action, playbackOptions);
                
        // Progress callback
        if (options.onProgress) {
          options.onProgress({
            current: i + 1,
            total: macro.actions.length,
            action: action,
            percentage: Math.round(((i + 1) / macro.actions.length) * 100)
          });
        }
      }
            
      console.log(`✅ Completed playback of macro: ${macro.name}`);
      return { success: true, actionsExecuted: this.playbackPosition };
            
    } catch (_error) {
      console.error('❌ Macro playback failed:', _error);
      throw _error;
    } finally {
      this.isPlaying = false;
      this.hidePlaybackIndicator();
    }
  }
    
  // Stop macro playback
  stopPlayback() {
    if (this.isPlaying) {
      this.isPlaying = false;
      console.log('⏸️ Macro playback stopped by user');
    }
  }
    
  // Execute a single action
  async executeAction(action, options = {}) {
    const startTime = Date.now();
        
    try {
      switch (action.type) {
        case 'click':
          await this.executeClick(action, options);
          break;
                    
        case 'type':
          await this.executeType(action, options);
          break;
                    
        case 'scroll':
          await this.executeScroll(action, options);
          break;
                    
        case 'wait':
          await this.executeWait(action, options);
          break;
                    
        case 'waitUntil':
          await this.executeWaitUntil(action, options);
          break;
                    
        case 'navigate':
          await this.executeNavigate(action, options);
          break;
                    
        case 'keypress':
          await this.executeKeypress(action, options);
          break;
                    
        case 'hover':
          await this.executeHover(action, options);
          break;
                    
        case 'screenshot':
          await this.executeScreenshot(action, options);
          break;
                    
        default:
          console.warn(`Unknown action type: ${action.type}`);
      }
            
      // Add delay between actions based on playback speed
      const baseDelay = action.delay || 100;
      const adjustedDelay = baseDelay / options.playbackSpeed;
            
      if (adjustedDelay > 0) {
        await this.sleep(adjustedDelay);
      }
            
    } catch (_error) {
      const duration = Date.now() - startTime;
      throw new Error(`Action failed after ${duration}ms: ${_error.message}`);
    }
  }
    
  // Action execution methods
  async executeClick(action, options) {
    const element = await this.findElement(action.selector, options);
        
    // Scroll element into view if needed
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await this.sleep(200);
        
    // Trigger click
    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: action.clientX,
      clientY: action.clientY
    });
        
    element.dispatchEvent(clickEvent);
        
    // Wait for potential navigation or DOM changes
    if (action.expectsNavigation) {
      await this.waitForNavigation(options.timeout || 5000);
    } else if (action.expectsDomChange) {
      await this.waitForDomStable(1000);
    }
  }
    
  async executeType(action, options) {
    const element = await this.findElement(action.selector, options);
        
    // Focus the element
    element.focus();
    await this.sleep(100);
        
    // Clear existing content if specified
    if (action.clearFirst) {
      element.value = '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }
        
    // Type the text
    const text = action.text || '';
    const typeDelay = action.typeDelay || 50;
        
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
            
      // Simulate keydown, keypress, input, keyup
      const keyEvents = ['keydown', 'keypress', 'keyup'];
      keyEvents.forEach(eventType => {
        const event = new KeyboardEvent(eventType, {
          key: char,
          code: `Key${char.toUpperCase()}`,
          bubbles: true
        });
        element.dispatchEvent(event);
      });
            
      // Update value and trigger input event
      if (element.value !== undefined) {
        element.value += char;
        element.dispatchEvent(new Event('input', { bubbles: true }));
      }
            
      await this.sleep(typeDelay);
    }
        
    // Trigger change event
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
    
  async executeScroll(action, options) {
    const scrollOptions = {
      top: action.scrollY || 0,
      left: action.scrollX || 0,
      behavior: action.smooth ? 'smooth' : 'auto'
    };
        
    if (action.selector) {
      const element = await this.findElement(action.selector, options);
      element.scrollTo(scrollOptions);
    } else {
      window.scrollTo(scrollOptions);
    }
        
    // Wait for scroll to complete
    await this.sleep(action.scrollDelay || 500);
  }
    
  async executeWait(action, options) {
    const duration = action.duration || 1000;
    await this.sleep(duration);
  }
    
  async executeWaitUntil(action, options) {
    const timeout = action.timeout || options.timeout || 10000;
    const condition = action.condition;
        
    switch (condition) {
      case 'domStable':
        await this.waitForDomStable(timeout);
        break;
                
      case 'urlChange':
        await this.waitForUrlChange(action.expectedUrl, timeout);
        break;
                
      case 'elementVisible':
        await this.waitForElementVisible(action.selector, timeout);
        break;
                
      case 'elementClickable':
        await this.waitForElementClickable(action.selector, timeout);
        break;
                
      case 'networkIdle':
        await this.waitForNetworkIdle(timeout);
        break;
                
      case 'textPresent':
        await this.waitForTextPresent(action.text, timeout);
        break;
                
      default:
        throw new Error(`Unknown wait condition: ${condition}`);
    }
  }
    
  async executeNavigate(action, options) {
    const currentUrl = window.location.href;
        
    if (action.url !== currentUrl) {
      window.location.href = action.url;
      await this.waitForNavigation(options.timeout || 10000);
    }
  }
    
  async executeKeypress(action, options) {
    const keyEvent = new KeyboardEvent('keydown', {
      key: action.key,
      code: action.code,
      ctrlKey: action.ctrlKey || false,
      shiftKey: action.shiftKey || false,
      altKey: action.altKey || false,
      metaKey: action.metaKey || false,
      bubbles: true
    });
        
    document.dispatchEvent(keyEvent);
    await this.sleep(100);
  }
    
  async executeHover(action, options) {
    const element = await this.findElement(action.selector, options);
        
    const hoverEvent = new MouseEvent('mouseover', {
      bubbles: true,
      cancelable: true,
      view: window,
      clientX: action.clientX,
      clientY: action.clientY
    });
        
    element.dispatchEvent(hoverEvent);
    await this.sleep(action.hoverDelay || 200);
  }
    
  async executeScreenshot(action, options) {
    if (this.options.captureScreenshots) {
      return await this.screenshotManager.capture(action.name || 'macro_screenshot');
    }
  }
    
  // Recording event handlers
  bindEventHandlers() {
    this.handleClick = this.handleClick.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
    this.handleScroll = this.handleScroll.bind(this);
    this.handleInput = this.handleInput.bind(this);
  }
    
  setupRecordingListeners() {
    this.addRecordingListener('click', this.handleClick, true);
    this.addRecordingListener('keydown', this.handleKeydown, true);
    this.addRecordingListener('scroll', this.handleScroll, true);
    this.addRecordingListener('input', this.handleInput, true);
  }
    
  addRecordingListener(event, handler, useCapture = false) {
    document.addEventListener(event, handler, useCapture);
    this.eventListeners.set(event, { handler, useCapture });
  }
    
  removeRecordingListeners() {
    this.eventListeners.forEach(({ handler, useCapture }, event) => {
      document.removeEventListener(event, handler, useCapture);
    });
    this.eventListeners.clear();
  }
    
  handleClick(event) {
    if (!this.isRecording) {return;}
        
    const element = event.target;
    const selector = this.generateSelector(element);
        
    this.recordAction({
      type: 'click',
      timestamp: Date.now() - this.startTime,
      selector: selector,
      elementTag: element.tagName.toLowerCase(),
      elementText: element.textContent?.trim().substring(0, 50),
      clientX: event.clientX,
      clientY: event.clientY,
      expectsNavigation: this.isNavigationTrigger(element),
      expectsDomChange: this.isDomChangeTrigger(element)
    });
  }
    
  handleKeydown(event) {
    if (!this.isRecording) {return;}
        
    this.recordAction({
      type: 'keypress',
      timestamp: Date.now() - this.startTime,
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrlKey,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey
    });
  }
    
  handleScroll(event) {
    if (!this.isRecording) {return;}
        
    // Debounce scroll events
    clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.recordAction({
        type: 'scroll',
        timestamp: Date.now() - this.startTime,
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        smooth: true,
        scrollDelay: 300
      });
    }, 150);
  }
    
  handleInput(event) {
    if (!this.isRecording) {return;}
        
    const element = event.target;
    if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
      const selector = this.generateSelector(element);
            
      this.recordAction({
        type: 'type',
        timestamp: Date.now() - this.startTime,
        selector: selector,
        text: element.value,
        clearFirst: true,
        typeDelay: 50
      });
    }
  }
    
  // Utility methods
  recordAction(action) {
    if (this.recordedActions.length >= this.options.maxActions) {
      console.warn('Maximum actions reached, stopping recording');
      this.stopRecording();
      return;
    }
        
    this.recordedActions.push(action);
    console.log(`📝 Recorded action: ${action.type}`, action);
  }
    
  generateSelector(element) {
    // Enhanced selector generation
    if (window.getCssPath) {
      return window.getCssPath(element);
    }
        
    // Fallback selector generation
    const tag = element.tagName.toLowerCase();
    if (element.id) {return `#${element.id}`;}
    if (element.className) {return `${tag}.${element.className.split(' ').join('.')}`;}
        
    // Generate path
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      const index = Array.from(current.parentNode.children).indexOf(current);
      path.unshift(`${current.tagName.toLowerCase()}:nth-child(${index + 1})`);
      current = current.parentNode;
    }
        
    return path.join(' > ');
  }
    
  async findElement(selector, options = {}) {
    const timeout = options.elementTimeout || 5000;
    const interval = 100;
    const maxAttempts = timeout / interval;
        
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const element = document.querySelector(selector);
      if (element) {return element;}
            
      await this.sleep(interval);
    }
        
    throw new Error(`Element not found: ${selector}`);
  }
    
  isNavigationTrigger(element) {
    return element.tagName.toLowerCase() === 'a' || 
               element.closest('a') ||
               element.type === 'submit';
  }
    
  isDomChangeTrigger(element) {
    return element.hasAttribute('data-toggle') ||
               element.classList.contains('btn') ||
               element.classList.contains('button') ||
               element.tagName.toLowerCase() === 'button';
  }
    
  async waitForNavigation(timeout = 5000) {
    return new Promise((resolve) => {
      const startUrl = window.location.href;
      const checkInterval = setInterval(() => {
        if (window.location.href !== startUrl) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
            
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve(); // Timeout, but don't fail
      }, timeout);
    });
  }
    
  async waitForDomStable(timeout = 2000) {
    return new Promise((resolve) => {
      let mutationCount = 0;
      const observer = new MutationObserver(() => {
        mutationCount++;
      });
            
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
            
      const checkStability = () => {
        const currentCount = mutationCount;
        setTimeout(() => {
          if (mutationCount === currentCount) {
            observer.disconnect();
            resolve();
          } else {
            checkStability();
          }
        }, 500);
      };
            
      setTimeout(() => {
        observer.disconnect();
        resolve();
      }, timeout);
            
      checkStability();
    });
  }
    
  async waitForUrlChange(expectedUrl, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const checkUrl = () => {
        if (window.location.href === expectedUrl) {
          resolve();
          return;
        }
                
        if (timeout <= 0) {
          reject(new Error(`URL did not change to ${expectedUrl}`));
          return;
        }
                
        timeout -= 100;
        setTimeout(checkUrl, 100);
      };
            
      checkUrl();
    });
  }
    
  async waitForElementVisible(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const checkVisible = () => {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          resolve(element);
          return;
        }
                
        if (timeout <= 0) {
          reject(new Error(`Element not visible: ${selector}`));
          return;
        }
                
        timeout -= 100;
        setTimeout(checkVisible, 100);
      };
            
      checkVisible();
    });
  }
    
  async waitForElementClickable(selector, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const checkClickable = () => {
        const element = document.querySelector(selector);
        if (element && !element.disabled && element.offsetParent !== null) {
          resolve(element);
          return;
        }
                
        if (timeout <= 0) {
          reject(new Error(`Element not clickable: ${selector}`));
          return;
        }
                
        timeout -= 100;
        setTimeout(checkClickable, 100);
      };
            
      checkClickable();
    });
  }
    
  async waitForNetworkIdle(timeout = 5000) {
    // Simple implementation - wait for no active network requests
    return new Promise((resolve) => {
      setTimeout(resolve, Math.min(timeout, 2000));
    });
  }
    
  async waitForTextPresent(text, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const checkText = () => {
        if (document.body.textContent.includes(text)) {
          resolve();
          return;
        }
                
        if (timeout <= 0) {
          reject(new Error(`Text not found: ${text}`));
          return;
        }
                
        timeout -= 100;
        setTimeout(checkText, 100);
      };
            
      checkText();
    });
  }
    
  captureInitialState() {
    this.recordAction({
      type: 'initialize',
      timestamp: 0,
      url: window.location.href,
      title: document.title,
      description: 'Macro recording started'
    });
  }
    
  showRecordingIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'macro-recording-indicator';
    indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-family: monospace;
            font-size: 12px;
            z-index: 2147483647;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            animation: pulse 1s infinite;
        `;
    indicator.innerHTML = '🔴 REC';
        
    const style = document.createElement('style');
    style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        `;
    document.head.appendChild(style);
    document.body.appendChild(indicator);
  }
    
  hideRecordingIndicator() {
    const indicator = document.getElementById('macro-recording-indicator');
    if (indicator) {indicator.remove();}
  }
    
  showPlaybackIndicator(macro) {
    const indicator = document.createElement('div');
    indicator.id = 'macro-playback-indicator';
    indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #44aa44;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-family: monospace;
            font-size: 12px;
            z-index: 2147483647;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        `;
    indicator.innerHTML = `▶️ Playing: ${macro.name}`;
    document.body.appendChild(indicator);
  }
    
  hidePlaybackIndicator() {
    const indicator = document.getElementById('macro-playback-indicator');
    if (indicator) {indicator.remove();}
  }
    
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
    
  // Export/Import macros
  exportMacro(macro) {
    const exportData = {
      ...macro,
      exportedAt: new Date().toISOString(),
      version: '2.0'
    };
        
    return JSON.stringify(exportData, null, 2);
  }
    
  importMacro(jsonString) {
    try {
      const macro = JSON.parse(jsonString);
            
      // Validate macro structure
      if (!macro.name || !macro.actions || !Array.isArray(macro.actions)) {
        throw new Error('Invalid macro format');
      }
            
      return macro;
    } catch (_error) {
      throw new Error(`Failed to import macro: ${_error.message}`);
    }
  }
}

// Supporting classes
class ConditionWaiter {
  constructor() {
    this.waitingConditions = new Map();
  }
    
  async waitFor(condition, timeout = 5000) {
    // Implementation for various wait conditions
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Condition timeout')), timeout);
      // Add condition checking logic
      resolve();
    });
  }
}

class NetworkMonitor {
  constructor() {
    this.activeRequests = 0;
    this.requestHistory = [];
  }
    
  startMonitoring() {
    // Monitor network requests for macro recording
  }
    
  stopMonitoring() {
    // Stop monitoring
  }
}

class ScreenshotManager {
  async capture(name) {
    // Capture screenshot during macro playback
    // Would integrate with Chrome extension screenshot API
    return { name, timestamp: Date.now() };
  }
}

// Global instance for easy access
window.MacroSystem = new EnhancedMacroSystem();

// Message handling for integration with popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const macro = window.MacroSystem;
    
  switch (message.type) {
    case 'START_MACRO_RECORDING':
      try {
        const result = macro.startRecording(message.name);
        sendResponse({ success: true, macro: result });
      } catch (_error) {
        sendResponse({ success: false, error: _error.message });
      }
      break;
            
    case 'STOP_MACRO_RECORDING':
      try {
        const result = macro.stopRecording();
        sendResponse({ success: true, macro: result });
      } catch (_error) {
        sendResponse({ success: false, error: _error.message });
      }
      break;
            
    case 'PLAY_MACRO':
      macro.playMacro(message.macro, message.options)
        .then(result => sendResponse({ success: true, result }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Keep channel open for async response
            
    case 'STOP_MACRO_PLAYBACK':
      macro.stopPlayback();
      sendResponse({ success: true });
      break;
  }
});

}

// Export to window for use in other modules
window.EnhancedMacroSystem = EnhancedMacroSystem;
window.MacroSystem = EnhancedMacroSystem;

}