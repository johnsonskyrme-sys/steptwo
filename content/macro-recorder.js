// macro-recorder.js - Enterprise workflow automation and macro recording
// Advanced macro system for recording and replaying user interactions

// Prevent duplicate declarations
if (window.MacroRecorder) {
  console.log('MacroRecorder already loaded, skipping...');
} else {

class MacroRecorder {
  constructor(options = {}) {
    this.options = {
      maxActions: options.maxActions || 1000,
      captureScreenshots: options.captureScreenshots !== false,
      captureNetwork: options.captureNetwork !== false,
      captureConsole: options.captureConsole !== false,
      playbackSpeed: options.playbackSpeed || 1.0,
      ...options
    };
        
    this.isRecording = false;
    this.isPlaying = false;
    this.currentMacro = null;
    this.actionQueue = [];
    this.recordingStartTime = null;
    this.playbackController = new PlaybackController();
    this.conditionEvaluator = new ConditionEvaluator();
        
    this.listeners = new Map();
    this.observedElements = new Set();
    this.networkLogs = [];
    this.consoleLogs = [];
        
    this.macroLibrary = new MacroLibrary();
    this.scheduleManager = new ScheduleManager();
        
    this.setupEventCapture();
  }
    
  setupEventCapture() {
    // Define all event types we want to capture
    this.captureEvents = [
      'click', 'dblclick', 'mousedown', 'mouseup', 'mousemove',
      'keydown', 'keyup', 'keypress',
      'input', 'change', 'submit',
      'scroll', 'resize',
      'focus', 'blur',
      'dragstart', 'dragend', 'drop'
    ];
        
    // Page lifecycle events
    this.pageEvents = [
      'load', 'unload', 'beforeunload',
      'DOMContentLoaded', 'hashchange'
    ];
  }
    
  startRecording(macroName, options = {}) {
    if (this.isRecording) {
      throw new Error('Already recording a macro');
    }
        
    this.isRecording = true;
    this.recordingStartTime = Date.now();
    this.actionQueue = [];
        
    this.currentMacro = {
      name: macroName,
      description: options.description || '',
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      metadata: {
        url: window.location.href,
        title: document.title,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        ...options.metadata
      },
      actions: [],
      conditions: [],
      variables: {},
      settings: {
        ...this.options,
        ...options.settings
      }
    };
        
    this.attachEventListeners();
    this.startNetworkCapture();
    this.startConsoleCapture();
        
    this.recordAction({
      type: 'macro_start',
      timestamp: Date.now(),
      data: {
        name: macroName,
        url: window.location.href
      }
    });
        
    this.showRecordingIndicator();
        
    return {
      macroId: this.generateMacroId(),
      status: 'recording',
      startTime: this.recordingStartTime
    };
  }
    
  stopRecording() {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }
        
    this.recordAction({
      type: 'macro_end',
      timestamp: Date.now(),
      data: {
        duration: Date.now() - this.recordingStartTime,
        actionCount: this.actionQueue.length
      }
    });
        
    this.isRecording = false;
    this.detachEventListeners();
    this.stopNetworkCapture();
    this.stopConsoleCapture();
    this.hideRecordingIndicator();
        
    // Finalize macro
    this.currentMacro.actions = this.actionQueue;
    this.currentMacro.duration = Date.now() - this.recordingStartTime;
    this.currentMacro.finalizedAt = new Date().toISOString();
        
    // Optimize actions
    this.currentMacro.actions = this.optimizeActions(this.currentMacro.actions);
        
    // Save to library
    const savedMacro = this.macroLibrary.save(this.currentMacro);
        
    const result = {
      macro: savedMacro,
      stats: {
        duration: this.currentMacro.duration,
        actionCount: this.currentMacro.actions.length,
        optimizations: this.getOptimizationStats()
      }
    };
        
    this.currentMacro = null;
    this.actionQueue = [];
        
    return result;
  }
    
  recordAction(action) {
    if (!this.isRecording) {return;}
        
    // Add relative timing
    action.relativeTime = Date.now() - this.recordingStartTime;
        
    // Capture screenshot if enabled
    if (this.options.captureScreenshots && this.shouldCaptureScreenshot(action)) {
      action.screenshot = this.captureScreenshot();
    }
        
    // Enhance action with context
    action = this.enhanceActionContext(action);
        
    this.actionQueue.push(action);
        
    // Limit queue size
    if (this.actionQueue.length > this.options.maxActions) {
      this.actionQueue.shift();
    }
        
    // Broadcast action for real-time monitoring
    this.broadcastAction(action);
  }
    
  enhanceActionContext(action) {
    const enhanced = { ...action };
        
    // Add page context
    enhanced.pageContext = {
      url: window.location.href,
      title: document.title,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
        
    // Add element context for DOM events
    if (action.target) {
      enhanced.elementContext = this.getElementContext(action.target);
    }
        
    // Add network context
    if (this.options.captureNetwork && this.networkLogs.length > 0) {
      enhanced.networkContext = this.getRecentNetworkActivity();
    }
        
    return enhanced;
  }
    
  getElementContext(element) {
    if (!element || element === document || element === window) {
      return null;
    }
        
    return {
      tagName: element.tagName?.toLowerCase(),
      id: element.id || null,
      className: element.className || null,
      textContent: element.textContent?.substring(0, 100),
      attributes: this.getElementAttributes(element),
      position: this.getElementPosition(element),
      selector: this.generateElementSelector(element),
      xpath: this.generateElementXPath(element),
      isVisible: this.isElementVisible(element)
    };
  }
    
  getElementAttributes(element) {
    const attrs = {};
    for (const attr of element.attributes || []) {
      if (attr.name.startsWith('data-') || ['id', 'class', 'name', 'value', 'href', 'src'].includes(attr.name)) {
        attrs[attr.name] = attr.value;
      }
    }
    return attrs;
  }
    
  getElementPosition(element) {
    const rect = element.getBoundingClientRect();
    return {
      x: Math.round(rect.left + window.scrollX),
      y: Math.round(rect.top + window.scrollY),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      clientX: Math.round(rect.left),
      clientY: Math.round(rect.top)
    };
  }
    
  generateElementSelector(element) {
    // Use existing enhanced selector generator if available
    try {
      if (window.stepTwoEnhancedSelector) {
        return window.stepTwoEnhancedSelector.generate(element).selector;
      }
    } catch (_error) {
      console.warn('Enhanced selector not available, using fallback');
    }
        
    // Fallback selector generation
    return this.generateFallbackSelector(element);
  }
    
  generateFallbackSelector(element) {
    if (element.id) {
      return `#${element.id}`;
    }
        
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.length > 0);
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
        
    const path = [];
    let current = element;
        
    while (current && current !== document.body && path.length < 5) {
      let selector = current.tagName.toLowerCase();
            
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      }
            
      const siblings = Array.from(current.parentElement?.children || [])
        .filter(el => el.tagName === current.tagName);
            
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
            
      path.unshift(selector);
      current = current.parentElement;
    }
        
    return path.join(' > ');
  }
    
  generateElementXPath(element) {
    const path = [];
    let current = element;
        
    while (current && current !== document.documentElement) {
      let index = 1;
      let sibling = current.previousElementSibling;
            
      while (sibling) {
        if (sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousElementSibling;
      }
            
      const tagName = current.tagName.toLowerCase();
      path.unshift(`${tagName}[${index}]`);
      current = current.parentElement;
    }
        
    return `/${  path.join('/')}`;
  }
    
  isElementVisible(element) {
    if (!element) {return false;}
        
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
        
    return rect.width > 0 && 
               rect.height > 0 && 
               style.visibility !== 'hidden' && 
               style.display !== 'none' &&
               style.opacity !== '0';
  }
    
  attachEventListeners() {
    // DOM events
    this.captureEvents.forEach(eventType => {
      const listener = (event) => this.handleDOMEvent(event);
      document.addEventListener(eventType, listener, { capture: true, passive: true });
      this.listeners.set(eventType, listener);
    });
        
    // Page events
    this.pageEvents.forEach(eventType => {
      const listener = (event) => this.handlePageEvent(event);
      window.addEventListener(eventType, listener, { passive: true });
      this.listeners.set(`page_${eventType}`, listener);
    });
        
    // Form submission events
    const formListener = (event) => this.handleFormSubmission(event);
    document.addEventListener('submit', formListener, { capture: true });
    this.listeners.set('form_submit', formListener);
        
    // AJAX and fetch events
    this.interceptNetworkRequests();
  }
    
  detachEventListeners() {
    this.captureEvents.forEach(eventType => {
      const listener = this.listeners.get(eventType);
      if (listener) {
        document.removeEventListener(eventType, listener, { capture: true });
      }
    });
        
    this.pageEvents.forEach(eventType => {
      const listener = this.listeners.get(`page_${eventType}`);
      if (listener) {
        window.removeEventListener(eventType, listener);
      }
    });
        
    const formListener = this.listeners.get('form_submit');
    if (formListener) {
      document.removeEventListener('submit', formListener, { capture: true });
    }
        
    this.listeners.clear();
    this.restoreNetworkRequests();
  }
    
  handleDOMEvent(event) {
    if (!this.isRecording) {return;}
        
    const action = {
      type: 'dom_event',
      eventType: event.type,
      timestamp: Date.now(),
      target: event.target,
      data: this.extractEventData(event)
    };
        
    // Filter out noise events
    if (this.shouldRecordEvent(event)) {
      this.recordAction(action);
    }
  }
    
  handlePageEvent(event) {
    if (!this.isRecording) {return;}
        
    this.recordAction({
      type: 'page_event',
      eventType: event.type,
      timestamp: Date.now(),
      data: {
        url: window.location.href,
        state: event.state
      }
    });
  }
    
  handleFormSubmission(event) {
    if (!this.isRecording) {return;}
        
    const formData = new FormData(event.target);
    const formFields = {};
        
    for (const [key, value] of formData.entries()) {
      formFields[key] = value;
    }
        
    this.recordAction({
      type: 'form_submit',
      timestamp: Date.now(),
      target: event.target,
      data: {
        method: event.target.method,
        action: event.target.action,
        fields: formFields
      }
    });
  }
    
  extractEventData(event) {
    const data = {
      bubbles: event.bubbles,
      cancelable: event.cancelable
    };
        
    // Mouse events
    if (event.type.startsWith('mouse') || event.type === 'click' || event.type === 'dblclick') {
      data.button = event.button;
      data.buttons = event.buttons;
      data.clientX = event.clientX;
      data.clientY = event.clientY;
      data.screenX = event.screenX;
      data.screenY = event.screenY;
      data.ctrlKey = event.ctrlKey;
      data.shiftKey = event.shiftKey;
      data.altKey = event.altKey;
      data.metaKey = event.metaKey;
    }
        
    // Keyboard events
    if (event.type.startsWith('key')) {
      data.key = event.key;
      data.code = event.code;
      data.keyCode = event.keyCode;
      data.ctrlKey = event.ctrlKey;
      data.shiftKey = event.shiftKey;
      data.altKey = event.altKey;
      data.metaKey = event.metaKey;
    }
        
    // Input events
    if (event.type === 'input' || event.type === 'change') {
      if (event.target.type !== 'password') { // Don't record passwords
        data.value = event.target.value;
      }
      data.inputType = event.inputType;
    }
        
    // Scroll events
    if (event.type === 'scroll') {
      data.scrollX = window.scrollX;
      data.scrollY = window.scrollY;
    }
        
    return data;
  }
    
  shouldRecordEvent(event) {
    // Filter out noise events
    if (event.type === 'mousemove') {
      // Only record mousemove occasionally
      return Math.random() < 0.1;
    }
        
    // Don't record events on recording UI
    if (event.target.closest('.steptwo-macro-recorder')) {
      return false;
    }
        
    return true;
  }
    
  shouldCaptureScreenshot(action) {
    const screenshotEvents = ['click', 'submit', 'page_event'];
    return screenshotEvents.includes(action.type) || screenshotEvents.includes(action.eventType);
  }
    
  captureScreenshot() {
    try {
      // This would normally use html2canvas or similar
      // For now, just capture viewport info
      return {
        timestamp: Date.now(),
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY
        },
        url: window.location.href
      };
    } catch (_error) {
      console.warn('Screenshot capture failed:', _error);
      return null;
    }
  }
    
  interceptNetworkRequests() {
    if (!this.options.captureNetwork) {return;}
        
    // Intercept fetch
    this.originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const request = new Request(...args);
            
      try {
        const response = await this.originalFetch(...args);
                
        this.networkLogs.push({
          type: 'fetch',
          url: request.url,
          method: request.method,
          status: response.status,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        });
                
        return response;
      } catch (_error) {
        this.networkLogs.push({
          type: 'fetch',
          url: request.url,
          method: request.method,
          error: _error.message,
          duration: Date.now() - startTime,
          timestamp: Date.now()
        });
                
        throw _error;
      }
    };
        
    // Intercept XMLHttpRequest
    this.originalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = class extends this.originalXHR {
      open(method, url, ...args) {
        this._macroRecorder = {
          method,
          url,
          startTime: Date.now()
        };
                
        return super.open(method, url, ...args);
      }
            
      send(...args) {
        const result = super.send(...args);
                
        this.addEventListener('loadend', () => {
          if (this._macroRecorder) {
            this.outer.networkLogs.push({
              type: 'xhr',
              url: this._macroRecorder.url,
              method: this._macroRecorder.method,
              status: this.status,
              duration: Date.now() - this._macroRecorder.startTime,
              timestamp: Date.now()
            });
          }
        });
                
        return result;
      }
    };
    window.XMLHttpRequest.prototype.outer = this;
  }
    
  restoreNetworkRequests() {
    if (this.originalFetch) {
      window.fetch = this.originalFetch;
    }
        
    if (this.originalXHR) {
      window.XMLHttpRequest = this.originalXHR;
    }
  }
    
  startNetworkCapture() {
    this.networkLogs = [];
  }
    
  stopNetworkCapture() {
    // Network logs are captured in real-time
  }
    
  startConsoleCapture() {
    if (!this.options.captureConsole) {return;}
        
    this.consoleLogs = [];
    this.originalConsole = { ...console };
        
    ['log', 'warn', 'error', 'info'].forEach(method => {
      console[method] = (...args) => {
        this.consoleLogs.push({
          level: method,
          message: args.map(arg => String(arg)).join(' '),
          timestamp: Date.now()
        });
                
        this.originalConsole[method](...args);
      };
    });
  }
    
  stopConsoleCapture() {
    if (this.originalConsole) {
      Object.assign(console, this.originalConsole);
    }
  }
    
  getRecentNetworkActivity() {
    return this.networkLogs.slice(-5); // Last 5 network requests
  }
    
  optimizeActions(actions) {
    // Remove redundant actions
    const optimized = [];
    let lastAction = null;
        
    for (const action of actions) {
      if (this.shouldKeepAction(action, lastAction)) {
        optimized.push(action);
        lastAction = action;
      }
    }
        
    return optimized;
  }
    
  shouldKeepAction(action, lastAction) {
    // Remove consecutive mousemove events
    if (action.eventType === 'mousemove' && lastAction?.eventType === 'mousemove') {
      return false;
    }
        
    // Remove duplicate input events
    if (action.eventType === 'input' && lastAction?.eventType === 'input' &&
            action.target === lastAction.target && 
            action.data.value === lastAction.data.value) {
      return false;
    }
        
    return true;
  }
    
  getOptimizationStats() {
    return {
      originalCount: this.actionQueue.length,
      optimizedCount: this.currentMacro?.actions.length || 0,
      reduction: this.actionQueue.length - (this.currentMacro?.actions.length || 0)
    };
  }
    
  async playMacro(macroId, options = {}) {
    if (this.isPlaying) {
      throw new Error('Already playing a macro');
    }
        
    const macro = this.macroLibrary.get(macroId);
    if (!macro) {
      throw new Error(`Macro ${macroId} not found`);
    }
        
    this.isPlaying = true;
        
    try {
      const result = await this.playbackController.play(macro, {
        speed: options.speed || this.options.playbackSpeed,
        waitForElements: options.waitForElements !== false,
        skipErrors: options.skipErrors || false,
        ...options
      });
            
      return result;
    } finally {
      this.isPlaying = false;
    }
  }
    
  pausePlayback() {
    if (this.isPlaying) {
      this.playbackController.pause();
    }
  }
    
  resumePlayback() {
    if (this.isPlaying) {
      this.playbackController.resume();
    }
  }
    
  stopPlayback() {
    if (this.isPlaying) {
      this.playbackController.stop();
      this.isPlaying = false;
    }
  }
    
  showRecordingIndicator() {
    if (document.querySelector('.steptwo-recording-indicator')) {return;}
        
    const indicator = document.createElement('div');
    indicator.className = 'steptwo-recording-indicator';
    indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 10px 15px;
            border-radius: 20px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            font-weight: bold;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
            animation: pulse 2s infinite;
        `;
        
    indicator.innerHTML = `
            <span style="display: inline-block; width: 8px; height: 8px; background: white; border-radius: 50%; margin-right: 8px;"></span>
            Recording Macro
        `;
        
    const style = document.createElement('style');
    style.textContent = `
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.7; }
                100% { opacity: 1; }
            }
        `;
        
    document.head.appendChild(style);
    document.body.appendChild(indicator);
  }
    
  hideRecordingIndicator() {
    const indicator = document.querySelector('.steptwo-recording-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
    
  broadcastAction(action) {
    // Broadcast action for real-time monitoring
    if (window.chrome?.runtime) {
      chrome.runtime.sendMessage({
        type: 'MACRO_ACTION_RECORDED',
        action: {
          type: action.type,
          eventType: action.eventType,
          timestamp: action.timestamp,
          relativeTime: action.relativeTime
        }
      });
    }
  }
    
  generateMacroId() {
    return `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
    
  getMacroLibrary() {
    return this.macroLibrary;
  }
    
  getScheduleManager() {
    return this.scheduleManager;
  }
    
  destroy() {
    if (this.isRecording) {
      this.stopRecording();
    }
        
    if (this.isPlaying) {
      this.stopPlayback();
    }
        
    this.restoreNetworkRequests();
    this.stopConsoleCapture();
    this.hideRecordingIndicator();
  }
}

// Supporting classes

class PlaybackController {
  constructor() {
    this.isPlaying = false;
    this.isPaused = false;
    this.currentAction = 0;
    this.playbackSpeed = 1.0;
    this.options = {};
  }
    
  async play(macro, options = {}) {
    this.isPlaying = true;
    this.isPaused = false;
    this.currentAction = 0;
    this.playbackSpeed = options.speed || 1.0;
    this.options = options;
        
    const startTime = Date.now();
    const results = {
      macroId: macro.id,
      startTime,
      actions: [],
      errors: [],
      completed: false
    };
        
    try {
      for (let i = 0; i < macro.actions.length && this.isPlaying; i++) {
        this.currentAction = i;
                
        // Wait if paused
        while (this.isPaused && this.isPlaying) {
          await this.sleep(100);
        }
                
        if (!this.isPlaying) {break;}
                
        const action = macro.actions[i];
                
        try {
          await this.executeAction(action);
          results.actions.push({
            index: i,
            action,
            status: 'success',
            timestamp: Date.now()
          });
        } catch (_error) {
          const actionError = {
            index: i,
            action,
            error: _error.message,
            timestamp: Date.now()
          };
                    
          results.errors.push(actionError);
          results.actions.push({
            ...actionError,
            status: 'error'
          });
                    
          if (!this.options.skipErrors) {
            throw _error;
          }
        }
                
        // Apply speed control
        if (i < macro.actions.length - 1) {
          const nextAction = macro.actions[i + 1];
          const delay = (nextAction.relativeTime - action.relativeTime) / this.playbackSpeed;
          await this.sleep(Math.max(0, delay));
        }
      }
            
      results.completed = true;
    } catch (_error) {
      results.error = _error.message;
    } finally {
      results.endTime = Date.now();
      results.duration = results.endTime - startTime;
      this.isPlaying = false;
    }
        
    return results;
  }
    
  async executeAction(action) {
    switch (action.type) {
      case 'dom_event':
        await this.executeDOMEvent(action);
        break;
      case 'page_event':
        await this.executePageEvent(action);
        break;
      case 'form_submit':
        await this.executeFormSubmit(action);
        break;
      case 'macro_start':
      case 'macro_end':
        // These are metadata actions, skip
        break;
      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }
    
  async executeDOMEvent(action) {
    const element = await this.findElement(action);
        
    if (!element) {
      throw new Error(`Element not found for action: ${action.eventType}`);
    }
        
    switch (action.eventType) {
      case 'click':
        await this.simulateClick(element, action.data);
        break;
      case 'input':
        await this.simulateInput(element, action.data);
        break;
      case 'keydown':
      case 'keyup':
        await this.simulateKeyEvent(element, action);
        break;
      case 'scroll':
        await this.simulateScroll(action.data);
        break;
      default:
        console.warn(`Unsupported event type: ${action.eventType}`);
    }
  }
    
  async findElement(action) {
    if (!action.elementContext) {
      return null;
    }
        
    const context = action.elementContext;
    let element = null;
        
    // Try different strategies to find the element
    const strategies = [
      () => document.querySelector(context.selector),
      () => document.getElementById(context.id),
      () => document.querySelector(`.${context.className?.split(' ')[0]}`),
      () => this.findByXPath(context.xpath),
      () => this.findByText(context.textContent)
    ];
        
    for (const strategy of strategies) {
      try {
        element = strategy();
        if (element) {break;}
      } catch (_error) {
        continue;
      }
    }
        
    // Wait for element if enabled
    if (!element && this.options.waitForElements) {
      element = await this.waitForElement(context, 5000);
    }
        
    return element;
  }
    
  async waitForElement(context, timeout = 5000) {
    const startTime = Date.now();
        
    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(context.selector);
      if (element) {return element;}
            
      await this.sleep(100);
    }
        
    return null;
  }
    
  findByXPath(xpath) {
    if (!xpath) {return null;}
        
    const result = document.evaluate(
      xpath,
      document,
      null,
      XPathResult.FIRST_ORDERED_NODE_TYPE,
      null
    );
        
    return result.singleNodeValue;
  }
    
  findByText(text) {
    if (!text) {return null;}
        
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
        
    while (walker.nextNode()) {
      if (walker.currentNode.textContent.includes(text.substring(0, 50))) {
        return walker.currentNode.parentElement;
      }
    }
        
    return null;
  }
    
  async simulateClick(element, data) {
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: data.clientX,
      clientY: data.clientY,
      button: data.button || 0,
      ctrlKey: data.ctrlKey || false,
      shiftKey: data.shiftKey || false,
      altKey: data.altKey || false,
      metaKey: data.metaKey || false
    });
        
    element.dispatchEvent(event);
    await this.sleep(100); // Small delay after click
  }
    
  async simulateInput(element, data) {
    if (data.value !== undefined) {
      element.value = data.value;
            
      const inputEvent = new Event('input', { bubbles: true });
      element.dispatchEvent(inputEvent);
            
      const changeEvent = new Event('change', { bubbles: true });
      element.dispatchEvent(changeEvent);
    }
  }
    
  async simulateKeyEvent(element, action) {
    const event = new KeyboardEvent(action.eventType, {
      bubbles: true,
      cancelable: true,
      key: action.data.key,
      code: action.data.code,
      keyCode: action.data.keyCode,
      ctrlKey: action.data.ctrlKey || false,
      shiftKey: action.data.shiftKey || false,
      altKey: action.data.altKey || false,
      metaKey: action.data.metaKey || false
    });
        
    element.dispatchEvent(event);
  }
    
  async simulateScroll(data) {
    window.scrollTo(data.scrollX, data.scrollY);
    await this.sleep(200); // Wait for scroll to complete
  }
    
  async executePageEvent(action) {
    // Handle page navigation events
    if (action.eventType === 'load' && action.data.url !== window.location.href) {
      window.location.href = action.data.url;
      // Wait for page to load
      await this.waitForPageLoad();
    }
  }
    
  async executeFormSubmit(action) {
    const form = await this.findElement(action);
        
    if (form && form.tagName === 'FORM') {
      form.submit();
      await this.waitForPageLoad();
    }
  }
    
  async waitForPageLoad() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve, { once: true });
      }
    });
  }
    
  pause() {
    this.isPaused = true;
  }
    
  resume() {
    this.isPaused = false;
  }
    
  stop() {
    this.isPlaying = false;
    this.isPaused = false;
  }
    
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class ConditionEvaluator {
  evaluate(condition, context) {
    try {
      switch (condition.type) {
        case 'element_exists':
          return !!document.querySelector(condition.selector);
        case 'element_visible':
          const element = document.querySelector(condition.selector);
          return element && this.isElementVisible(element);
        case 'url_matches':
          return new RegExp(condition.pattern).test(window.location.href);
        case 'text_contains':
          return document.body.textContent.includes(condition.text);
        case 'variable_equals':
          return context.variables[condition.variable] === condition.value;
        default:
          return false;
      }
    } catch (_error) {
      console.warn('Condition evaluation failed:', _error);
      return false;
    }
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

class MacroLibrary {
  constructor() {
    this.macros = new Map();
    this.loadFromStorage();
  }
    
  save(macro) {
    macro.id = macro.id || this.generateId();
    macro.savedAt = new Date().toISOString();
        
    this.macros.set(macro.id, macro);
    this.saveToStorage();
        
    return macro;
  }
    
  get(id) {
    return this.macros.get(id);
  }
    
  list() {
    return Array.from(this.macros.values());
  }
    
  delete(id) {
    const deleted = this.macros.delete(id);
    if (deleted) {
      this.saveToStorage();
    }
    return deleted;
  }
    
  search(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();
        
    for (const macro of this.macros.values()) {
      if (macro.name.toLowerCase().includes(lowerQuery) ||
                macro.description.toLowerCase().includes(lowerQuery)) {
        results.push(macro);
      }
    }
        
    return results;
  }
    
  export(id) {
    const macro = this.get(id);
    if (!macro) {return null;}
        
    return JSON.stringify(macro, null, 2);
  }
    
  import(macroJSON) {
    try {
      const macro = JSON.parse(macroJSON);
      macro.id = this.generateId(); // Generate new ID to avoid conflicts
      macro.importedAt = new Date().toISOString();
            
      return this.save(macro);
    } catch (_error) {
      throw new Error(`Failed to import macro: ${_error.message}`);
    }
  }
    
  generateId() {
    return `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
    
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get('steptwo_macros');
      if (result.steptwo_macros) {
        const macros = JSON.parse(result.steptwo_macros);
        macros.forEach(macro => {
          this.macros.set(macro.id, macro);
        });
      }
    } catch (_error) {
      console.warn('Failed to load macros from storage:', _error);
    }
  }
    
  async saveToStorage() {
    try {
      const macros = Array.from(this.macros.values());
      await chrome.storage.local.set({
        steptwo_macros: JSON.stringify(macros)
      });
    } catch (_error) {
      console.warn('Failed to save macros to storage:', _error);
    }
  }
}

class ScheduleManager {
  constructor() {
    this.schedules = new Map();
    this.activeSchedules = new Map();
    this.loadFromStorage();
  }
    
  schedule(macroId, schedule, options = {}) {
    const scheduleId = this.generateId();
    const scheduleData = {
      id: scheduleId,
      macroId,
      schedule,
      options,
      createdAt: new Date().toISOString(),
      enabled: true,
      lastRun: null,
      nextRun: this.calculateNextRun(schedule)
    };
        
    this.schedules.set(scheduleId, scheduleData);
    this.activateSchedule(scheduleData);
    this.saveToStorage();
        
    return scheduleId;
  }
    
  unschedule(scheduleId) {
    const schedule = this.schedules.get(scheduleId);
    if (schedule) {
      this.deactivateSchedule(scheduleId);
      this.schedules.delete(scheduleId);
      this.saveToStorage();
      return true;
    }
    return false;
  }
    
  activateSchedule(schedule) {
    if (schedule.enabled && schedule.nextRun) {
      const delay = new Date(schedule.nextRun).getTime() - Date.now();
            
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          this.executeMacro(schedule);
        }, delay);
                
        this.activeSchedules.set(schedule.id, timeoutId);
      }
    }
  }
    
  deactivateSchedule(scheduleId) {
    const timeoutId = this.activeSchedules.get(scheduleId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this.activeSchedules.delete(scheduleId);
    }
  }
    
  async executeMacro(schedule) {
    try {
      // This would typically send a message to the background script
      // to execute the macro
      const result = await chrome.runtime.sendMessage({
        type: 'EXECUTE_SCHEDULED_MACRO',
        macroId: schedule.macroId,
        scheduleId: schedule.id,
        options: schedule.options
      });
            
      // Update schedule
      schedule.lastRun = new Date().toISOString();
      schedule.nextRun = this.calculateNextRun(schedule.schedule);
            
      // Reschedule if recurring
      if (schedule.nextRun) {
        this.activateSchedule(schedule);
      }
            
      this.saveToStorage();
            
    } catch (_error) {
      console.error('Scheduled macro execution failed:', _error);
    }
  }
    
  calculateNextRun(schedule) {
    const now = new Date();
        
    switch (schedule.type) {
      case 'once':
        return schedule.datetime > now.toISOString() ? schedule.datetime : null;
            
      case 'daily':
        const daily = new Date(now);
        daily.setHours(schedule.hour, schedule.minute, 0, 0);
        if (daily <= now) {
          daily.setDate(daily.getDate() + 1);
        }
        return daily.toISOString();
            
      case 'weekly':
        const weekly = new Date(now);
        weekly.setDate(weekly.getDate() + (schedule.dayOfWeek - weekly.getDay() + 7) % 7);
        weekly.setHours(schedule.hour, schedule.minute, 0, 0);
        if (weekly <= now) {
          weekly.setDate(weekly.getDate() + 7);
        }
        return weekly.toISOString();
            
      case 'interval':
        const interval = new Date(now.getTime() + schedule.intervalMs);
        return interval.toISOString();
            
      default:
        return null;
    }
  }
    
  generateId() {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
    
  async loadFromStorage() {
    try {
      const result = await chrome.storage.local.get('steptwo_schedules');
      if (result.steptwo_schedules) {
        const schedules = JSON.parse(result.steptwo_schedules);
        schedules.forEach(schedule => {
          this.schedules.set(schedule.id, schedule);
          this.activateSchedule(schedule);
        });
      }
    } catch (_error) {
      console.warn('Failed to load schedules from storage:', _error);
    }
  }
    
  async saveToStorage() {
    try {
      const schedules = Array.from(this.schedules.values());
      await chrome.storage.local.set({
        steptwo_schedules: JSON.stringify(schedules)
      });
    } catch (_error) {
      console.warn('Failed to save schedules to storage:', _error);
    }
  }
}

}

// Export to window for use in other modules
window.MacroRecorder = MacroRecorder;