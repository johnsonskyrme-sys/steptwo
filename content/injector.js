// injector.js - Enhanced injector with smart loading and gallery detection

(async () => {
  let profiles = {};
  let autoDetect = true;
  const _currentSettings = {}; // Kept for future use
  let siteProfile = null;
  let enhancedModulesLoaded = false;
  let enhancedSelector = null;
  let macroSystem = null;
  let isGalleryPage = false;
  const _selectorCache = new Map(); // Kept for future use
  let galleryDetectionCache = null;
  
  // Smart gallery detection to avoid loading scripts on irrelevant pages
  function detectGalleryPage() {
    if (galleryDetectionCache !== null) {return galleryDetectionCache;}
    
    const galleryIndicators = [
      // Image count indicators
      () => document.querySelectorAll('img').length >= 10,
      // Common gallery/portfolio patterns
      () => /gallery|portfolio|photos|images|album|collection/i.test(document.title || ''),
      () => /gallery|portfolio|photos|images|album|collection/i.test(window.location.pathname),
      // Common gallery class names and data attributes
      () => document.querySelector('[class*="gallery"], [class*="portfolio"], [class*="photo"], [class*="image-grid"]') !== null,
      () => document.querySelector('[data-gallery], [data-portfolio], [data-photos]') !== null,
      // E-commerce product listings
      () => document.querySelector('.product-grid, .product-list, .products, [class*="product-item"]') !== null,
      // Social media photo grids
      () => document.querySelector('[role="grid"] img, .photo-grid, .image-grid') !== null,
      // Lazy loading attributes (common in galleries)
      () => document.querySelectorAll('[data-src], [data-lazy], [loading="lazy"]').length >= 5
    ];
    
    isGalleryPage = galleryIndicators.some(indicator => {
      try {
        return indicator();
      } catch (_error) {
        return false;
      }
    });
    
    galleryDetectionCache = isGalleryPage;
    console.log(`📊 Gallery detection result: ${isGalleryPage ? 'Gallery page detected' : 'Not a gallery page'}`);
    return isGalleryPage;
  }
  
  // Cached selector system for performance
  class SelectorCache {
    constructor() {
      this.cache = new Map();
      this.sitePatterns = new Map();
      this.maxCacheSize = 100;
    }
    
    getCachedSelector(key) {
      const cached = this.cache.get(key);
      if (cached && cached.timestamp > Date.now() - 300000) { // 5 minute cache
        return cached.selectors;
      }
      return null;
    }
    
    setCachedSelector(key, selectors) {
      if (this.cache.size >= this.maxCacheSize) {
        // Remove oldest entries
        const oldestKey = this.cache.keys().next().value;
        this.cache.delete(oldestKey);
      }
      
      this.cache.set(key, {
        selectors,
        timestamp: Date.now()
      });
    }
    
    getSiteKey() {
      return `${window.location.hostname}_${window.location.pathname.split('/')[1] || 'root'}`;
    }
  }
  
  const selectorCacheInstance = new SelectorCache();
  
  // Load enhanced modules only when gallery is detected or explicitly requested
  async function loadEnhancedModules(force = false) {
    if (enhancedModulesLoaded) {return;}
    
    // Only load on gallery pages unless forced
    if (!force && !detectGalleryPage()) {
      console.log('⏭️ Skipping enhanced module loading - not a gallery page');
      return;
    }
    
    try {
      console.log('🚀 Loading enhanced modules for gallery page...');
      
      // Load modules with priority order (most critical first)
      const moduleLoaders = [
        {
          name: 'Enhanced Selector Engine',
          url: 'content/enhanced-selector-engine.js',
          init: initializeEnhancedSelector,
          priority: 1
        },
        {
          name: 'Advanced Extractor',
          url: 'content/advanced-extractor.js',
          init: null,
          priority: 1
        },
        {
          name: 'Enhanced Error Handler',
          url: 'content/enhanced-error-handler.js',
          init: null,
          priority: 2
        },
        {
          name: 'Perceptual Duplicate Detector',
          url: 'content/perceptual-duplicate-detector.js',
          init: null,
          priority: 3
        },
        {
          name: 'Enhanced Macro System',
          url: 'content/enhanced-macro-system.js',
          init: initializeMacroSystem,
          priority: 3
        }
      ];
      
      // Sort by priority and load
      moduleLoaders.sort((a, b) => a.priority - b.priority);
      
      const loadPromises = moduleLoaders.map(module => 
        loadModuleScript(module.name, module.url, module.init)
      );
      
      await Promise.all(loadPromises);
      
      // Signal that enhanced modules are loaded
      enhancedModulesLoaded = true;
      console.log('✅ Enhanced scraper modules loaded successfully');
      
      // Dispatch event for other scripts
      window.dispatchEvent(new CustomEvent('StepTwoEnhancedReady', {
        detail: { 
          modulesLoaded: true,
          galleryDetected: isGalleryPage,
          selectorCache: selectorCacheInstance
        }
      }));
      
    } catch (_error) {
      console.error('❌ Failed to load enhanced modules:', error);
    }
  }
  
  // Helper function to load individual module scripts
  function loadModuleScript(name, url, initFunction) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL(url);
      script.onload = () => {
        console.log(`✅ ${name} loaded`);
        if (initFunction) {
          setTimeout(initFunction, 10); // Small delay to ensure script is parsed
        }
        resolve();
      };
      script.onerror = () => {
        console.warn(`⚠️ Failed to load ${name}`);
        resolve(); // Don't reject to allow other modules to load
      };
      document.head.appendChild(script);
    });
  }
  
  // Initialize enhanced selector with caching
  function initializeEnhancedSelector() {
    if (window.EnhancedSelectorEngine) {
      enhancedSelector = new window.EnhancedSelectorEngine({
        prioritizeDataAttributes: true,
        includeTextContent: true,
        maxDepth: 10,
        selectorCache: selectorCacheInstance
      });
      
      // Load cached patterns for this site
      loadSiteSpecificPatterns();
      console.log('🎯 Enhanced selector engine initialized with caching');
    }
  }
  
  // Load site-specific selector patterns from profiles
  function loadSiteSpecificPatterns() {
    if (!siteProfile) {return;}
    
    const siteKey = selectorCacheInstance.getSiteKey();
    const cachedPatterns = selectorCacheInstance.getCachedSelector(siteKey);
    
    if (cachedPatterns) {
      console.log(`📋 Using cached selectors for ${window.location.hostname}`);
      if (enhancedSelector) {
        enhancedSelector.addCachedPatterns(cachedPatterns);
      }
    } else if (siteProfile.selectors) {
      console.log(`🎯 Loading site-specific patterns for ${siteProfile.name}`);
      selectorCacheInstance.setCachedSelector(siteKey, siteProfile.selectors);
      if (enhancedSelector) {
        enhancedSelector.addCachedPatterns(siteProfile.selectors);
      }
    }
  }
  
  // Initialize macro system
  function initializeMacroSystem() {
    if (window.MacroSystem) {
      macroSystem = window.MacroSystem;
      console.log('🎬 Enhanced macro system initialized');
    }
  }
  
  // Enhanced site profile checking with gallery awareness
  function checkSiteProfile() {
    if (!autoDetect || !profiles) {return;}
    
    const hostname = window.location.hostname;
    const url = window.location.href;
    
    // Look for site-specific profile
    for (const [key, profile] of Object.entries(profiles)) {
      if (profile.hosts && profile.hosts.some(host => hostname.includes(host))) {
        siteProfile = profile;
        console.log(`🎯 Site profile detected: ${profile.name}`);
        
        // Load enhanced modules if this is a known gallery site
        if (profile.type === 'gallery' || profile.type === 'ecommerce') {
          loadEnhancedModules(true); // Force load for known gallery sites
        }
        
        break;
      }
    }
    
    // If no specific profile but gallery detected, use smart loading
    if (!siteProfile && detectGalleryPage()) {
      loadEnhancedModules();
    }
  }
  
  // Load profiles and settings
  chrome.runtime.sendMessage({type:'GET_PROFILES'}, resp => {
    if(resp){
      profiles = resp.profiles||{}; 
      autoDetect = resp.autoDetect; 
      checkSiteProfile();
    }
  });

  // Smart loading: Load enhanced modules only when needed
  // Lazy loading trigger function
  async function ensureEnhancedModulesLoaded() {
    if (!enhancedModulesLoaded) {
      console.log('🚀 Lazy loading enhanced modules...');
      await loadEnhancedModules();
    }
  }

  // Message listener for dynamic module loading
  chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    if (message.type === 'ENSURE_MODULES_LOADED') {
      await ensureEnhancedModulesLoaded();
      sendResponse({ loaded: enhancedModulesLoaded });
    } else if (message.type === 'FORCE_LOAD_MODULES') {
      await loadEnhancedModules(true);
      sendResponse({ loaded: enhancedModulesLoaded });
    }
  });

  function showSiteProfileIndicator(siteName) {
    // Remove existing indicator
    const existing = document.querySelector('#steptwo-profile-indicator');
    if (existing) {existing.remove();}
    
    // Create new indicator
    const indicator = document.createElement('div');
    indicator.id = 'steptwo-profile-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed; 
        top: 10px; 
        right: 10px; 
        background: #667eea; 
        color: white; 
        padding: 8px 12px; 
        border-radius: 6px; 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
        font-size: 12px; 
        z-index: 10000; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        cursor: pointer;
        animation: steptwo-fade-in 0.3s ease-in;
      ">
        🎯 ${siteName} Profile Active
      </div>
      <style>
        @keyframes steptwo-fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      </style>
    `;
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.style.opacity = '0.7';
        indicator.style.fontSize = '10px';
        indicator.style.padding = '4px 8px';
      }
    }, 3000);
    
    // Remove on click
    indicator.addEventListener('click', () => {
      indicator.remove();
    });
  }

  async function autoStartScraping() {
    if (!siteProfile || !autoDetect) {return;}
    
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    try {
      const response = await import(chrome.runtime.getURL('content/scraper.js'));
      response.runScrape(siteProfile.selectors?.imageContainer, {
        profile: siteProfile,
        autoDetected: true,
        waitSettings: siteProfile.waitSettings,
        scrollBehavior: siteProfile.scrollBehavior
      });
    } catch (_error) {
      console.error('[STEPTWO] Auto-scraping failed:', error);
    }
  }

  // Load current settings for filtering
  chrome.storage.sync.get(['minWidth', 'minHeight', 'skipDup', 'formats']).then(settings => {
    currentSettings = settings;
  });

  function maybeAuto(){
    if(!autoDetect) {return;}
    const host = location.hostname.replace(/^www\./,'');
    const profile = profiles[host];
    if(profile){
      console.log(`[STEPTWO] Auto-detected legacy profile for ${host}:`, profile);
      import(chrome.runtime.getURL('content/scraper.js')).then(mod => {
        mod.runScrape(profile.selector, {
          profile: profile,
          autoDetected: true
        });
      });
    }
  }

  // Enhanced message handling
  chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
    console.log('[STEPTWO] Received message:', msg.type);
    
    switch(msg.type) {
      case 'START_PICKER':
        import(chrome.runtime.getURL('content/picker.js')).then(module => {
          module.startPicker({
            ...msg.options,
            siteProfile
          });
        });
        break;
        
      case 'STOP_PICKER':
        import(chrome.runtime.getURL('content/picker.js')).then(module => {
          if (module.stopPicker) {
            module.stopPicker();
          }
        });
        break;
        
      case 'START_ENHANCED_PICKER':
        // Lazy load enhanced modules if needed
        await ensureEnhancedModulesLoaded();
        if (enhancedSelector) {
          const pickerOverlay = new window.EnhancedPickerOverlay(enhancedSelector);
          pickerOverlay.start(msg.mode || 'single');
        } else {
          console.warn('[STEPTWO] Enhanced selector not available, falling back to regular picker');
          import(chrome.runtime.getURL('content/picker.js')).then(module => {
            module.startPicker({ ...msg.options, siteProfile });
          });
        }
        break;
        
      case 'TEST_SELECTOR':
        // Lazy load enhanced modules if needed
        await ensureEnhancedModulesLoaded();
        if (enhancedSelector) {
          try {
            const result = enhancedSelector.testSelector(msg.selector);
            sendResponse({ success: true, ...result });
          } catch (_error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'Enhanced selector not available' });
        }
        break;
        
      case 'START_MACRO_RECORDING':
        // Lazy load enhanced modules if needed
        await ensureEnhancedModulesLoaded();
        if (macroSystem) {
          try {
            const macro = macroSystem.startRecording(msg.name);
            sendResponse({ success: true, macro });
          } catch (_error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'Macro system not available' });
        }
        break;
        
      case 'STOP_MACRO_RECORDING':
        if (macroSystem) {
          try {
            const macro = macroSystem.stopRecording();
            sendResponse({ success: true, macro });
          } catch (_error) {
            sendResponse({ success: false, error: error.message });
          }
        } else {
          sendResponse({ success: false, error: 'Macro system not available' });
        }
        break;
        
      case 'START_CROP_SELECTION':
        import(chrome.runtime.getURL('content/crop-selector.js')).then(module => {
          module.startCropSelection();
          sendResponse({ success: true });
        }).catch(error => {
          console.error('[STEPTWO] Failed to load crop selector:', error);
          sendResponse({ success: false, error: error.message });
        });
        break;
        
      case 'STOP_CROP_SELECTION':
        import(chrome.runtime.getURL('content/crop-selector.js')).then(module => {
          module.stopCropSelection();
          sendResponse({ success: true });
        }).catch(error => {
          console.error('[STEPTWO] Failed to stop crop selector:', error);
          sendResponse({ success: false, error: error.message });
        });
        break;
        
      case 'PLAY_MACRO':
        if (macroSystem) {
          macroSystem.playMacro(msg.macro, msg.options)
            .then(result => sendResponse({ success: true, result }))
            .catch(error => sendResponse({ success: false, error: error.message }));
          return true; // Keep message channel open for async response
        } else {
          sendResponse({ success: false, error: 'Macro system not available' });
        }
        break;
        
      case 'STOP_MACRO_PLAYBACK':
        if (macroSystem) {
          macroSystem.stopPlayback();
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'Macro system not available' });
        }
        break;
        
      case 'PICKER_DONE':
        console.log('[STEPTWO] Picker selected:', msg);
        import(chrome.runtime.getURL('content/scraper.js')).then(mod => {
          mod.runScrape(msg.selector, {
            siteProfile,
            userSelected: true,
            ...msg.options
          });
        });
        break;
        
      case 'START_SCRAPING':
        import(chrome.runtime.getURL('content/scraper.js')).then(mod => {
          const selector = msg.selector || siteProfile?.selectors?.imageContainer;
          mod.runScrape(selector, {
            siteProfile,
            waitSettings: siteProfile?.waitSettings,
            scrollBehavior: siteProfile?.scrollBehavior,
            ...msg.options
          });
        });
        break;
        
      case 'SMART_GUESS':
        // Lazy load enhanced modules for smart guessing
        await ensureEnhancedModulesLoaded();
        import(chrome.runtime.getURL('content/smartGuess.js')).then(module => {
          module.smartGuess({
            siteProfile,
            universalFallback: true,
            enhancedSelector: enhancedSelector // Pass enhanced selector if available
          });
        });
        break;
        
      case 'START_REC':
        import(chrome.runtime.getURL('content/macro/recorder.js')).then(mod => {
          mod.startRecording();
        });
        break;
        
      case 'STOP_REC':
        import(chrome.runtime.getURL('content/macro/recorder.js')).then(mod => {
          mod.stopRecording();
        });
        break;
        
      case 'RELOAD_PROFILE':
        checkSiteProfile();
        break;
        
      default:
        // Legacy handler for backward compatibility
        import(chrome.runtime.getURL('content/scraper.js')).then(mod => {
          mod.runScrape(msg.selector, {
            siteProfile,
            legacy: true
          });
        });
    }
  });

  // Initialize legacy auto-detection as fallback
  maybeAuto();
})();