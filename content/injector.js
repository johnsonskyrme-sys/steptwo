// injector.js - Enhanced injector with smart loading and gallery detection

(async () => {
  // Check if we're running in a Chrome extension context
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.getURL) {
    console.log('🌐 STEPTWO: Not running in Chrome extension context, skipping content script initialization');
    return;
  }

  // Import utility functions dynamically
  const { createStatusIndicator, setTextContent } = await import(chrome.runtime.getURL('lib/lib-utilities.js'));
  
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
    
    // Use performance monitoring if available
    const measureFunc = window.globalPerformanceMonitor?.measureSync || ((name, fn) => fn());
    
    return measureFunc('gallery-detection', () => {
      const galleryIndicators = [
        // Enhanced image count indicators with quality check
        () => {
          const images = document.querySelectorAll('img, picture source, [style*="background-image"]');
          const significantImages = Array.from(images).filter(el => {
            if (el.tagName === 'IMG') {
              const rect = el.getBoundingClientRect();
              return rect.width > 50 && rect.height > 50; // Filter small icons/avatars
            } else if (el.tagName === 'SOURCE') {
              return true; // Picture sources are typically significant
            } else {
              // Check background image elements
              const style = window.getComputedStyle(el);
              const bgImage = style.backgroundImage;
              return bgImage && bgImage !== 'none' && !bgImage.includes('data:image');
            }
          });
          return significantImages.length >= 8;
        },
        
        // Enhanced title/URL patterns with more keywords
        () => /gallery|portfolio|photos?|images?|album|collection|catalog|artwork|media|browse|search|stock|pic|visual|exhibit|showcase|board|stream|feed/i.test(document.title || ''),
        () => /gallery|portfolio|photos?|images?|album|collection|catalog|browse|search|media|pic|visual|exhibit|showcase|board|stream|feed/i.test(window.location.pathname),
        
        // Enhanced DOM structure patterns
        () => document.querySelector([
          '[class*="gallery"]', '[class*="portfolio"]', '[class*="photo"]', 
          '[class*="image-grid"]', '[class*="grid"]', '[class*="masonry"]',
          '[class*="thumbnail"]', '[class*="tile"]', '[class*="card-grid"]',
          '[class*="media-grid"]', '[class*="asset-grid"]'
        ].join(', ')) !== null,
        
        () => document.querySelector([
          '[data-gallery]', '[data-portfolio]', '[data-photos]', '[data-grid]',
          '[data-masonry]', '[data-lightbox]', '[data-fancybox]', '[data-photoswipe]'
        ].join(', ')) !== null,
        
        // E-commerce and marketplace patterns
        () => document.querySelector([
          '.product-grid', '.product-list', '.products', '[class*="product-item"]',
          '.listing-grid', '.search-results', '.browse-grid', '.category-grid'
        ].join(', ')) !== null,
        
        // Social media and content platforms
        () => document.querySelector([
          '[role="grid"] img', '.photo-grid', '.image-grid', '.content-grid',
          '.feed img', '.timeline img', '.posts img', '.cards img'
        ].join(', ')) !== null,
        
        // Advanced lazy loading and modern patterns
        () => document.querySelectorAll([
          '[data-src]', '[data-lazy]', '[loading="lazy"]', '[data-srcset]',
          'img[src*="placeholder"]', 'img[src*="loading"]'
        ].join(', ')).length >= 5,
        
        // Stock photo and professional sites patterns
        () => {
          const professionalIndicators = [
            'stock', 'premium', 'royalty', 'license', 'download', 'resolution',
            'watermark', 'preview', 'comp', 'editorial', 'commercial'
          ];
          const text = (document.title + ' ' + document.body.textContent).toLowerCase();
          return professionalIndicators.some(indicator => text.includes(indicator));
        },
        
        // Pagination indicators (suggests image browsing)
        () => document.querySelector([
          '.pagination', '.page-numbers', '[class*="pager"]', '.load-more',
          '[aria-label*="next"]', '[aria-label*="page"]', '.infinite-scroll'
        ].join(', ')) !== null,
        
        // Image container patterns
        () => {
          const containers = document.querySelectorAll([
            'figure', '.figure', '.image-container', '.photo-container',
            '.thumbnail-container', '.media-container'
          ].join(', '));
          return containers.length >= 6;
        },
        
        // Modern framework and CSS Grid/Flexbox patterns
        () => {
          const modernPatterns = document.querySelectorAll([
            '[style*="display: grid"]', '[style*="display: flex"]',
            '.grid', '.flex', '.d-flex', '.d-grid',
            '[class*="col-"], [class*="row"], [class*="grid-"]',
            '.masonry', '.isotope', '.packery'
          ].join(', '));
          return modernPatterns.length >= 3;
        },
        
        // Progressive Web App and modern image formats
        () => {
          const modernImages = document.querySelectorAll([
            'img[src*=".webp"]', 'img[src*=".avif"]', 'source[type*="webp"]',
            'source[type*="avif"]', '[data-srcset]', 'img[sizes]'
          ].join(', '));
          return modernImages.length >= 3;
        },
        
        // Social media and content platform indicators
        () => {
          const socialPatterns = [
            'instagram', 'pinterest', 'flickr', 'behance', 'dribbble',
            'unsplash', 'pexels', 'shutterstock', 'getty', 'alamy',
            'artstation', 'deviantart', 'tumblr', 'reddit'
          ];
          const urlAndTitle = (window.location.href + ' ' + document.title).toLowerCase();
          return socialPatterns.some(pattern => urlAndTitle.includes(pattern));
        }
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
    }, { url: window.location.href });
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
  
  // Ensure scraper module is loaded - scraper.js is already injected via content_scripts in manifest
  async function ensureScraperLoaded() {
    // Since scraper.js is loaded via content_scripts in manifest.json, functions should be available
    if (window.runScrape) {
      return; // Already loaded
    }
    
    // Wait a bit for the content script to initialize
    let retries = 0;
    const maxRetries = 10;
    
    while (!window.runScrape && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
    
    if (!window.runScrape) {
      throw new Error('runScrape function not available after waiting for content script initialization');
    }
    
    console.log('✅ Core scraper module loaded successfully from content script');
  }
  
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
        // Phase 1 modules - Core enhanced functionality
        {
          name: 'Adaptive Selector System', 
          url: 'content/adaptive-selector-system.js',
          init: initializeEnhancedSelectorSystem,
          priority: 1
        },
        {
          name: 'Element Picker',
          url: 'content/picker.js',
          init: null,
          priority: 1
        },
        {
          name: 'Advanced Extractor',
          url: 'content/advanced-extractor.js',
          init: null,
          priority: 1
        },
        {
          name: 'Dynamic Content Observer',
          url: 'content/dynamic-content-observer.js',
          init: null,
          priority: 1
        },
        {
          name: 'Adaptive Selector System',
          url: 'content/adaptive-selector-system.js',
          init: null,
          priority: 1
        },
        {
          name: 'Infinite Scroll Handler',
          url: 'content/infinite-scroll-handler.js',
          init: null,
          priority: 1
        },
        {
          name: 'Comprehensive Validation',
          url: 'content/comprehensive-validation.js',
          init: null,
          priority: 1
        },
        {
          name: 'Network Interceptor',
          url: 'content/network-interceptor.js',
          init: null,
          priority: 1
        },
        {
          name: 'CSS Background Extractor',
          url: 'content/css-background-extractor.js',
          init: null,
          priority: 1
        },
        {
          name: 'Enhanced Integration Manager',
          url: 'content/enhanced-integration-manager.js',
          init: null,
          priority: 1
        },
        
        {
          name: 'Production Monitor',
          url: 'content/production-monitor.js',
          init: initializeProductionMonitor,
          priority: 1
        },
        {
          name: 'Enhanced Scraper Utils',
          url: 'content/enhanced-scraper-utils.js',
          init: null,
          priority: 1
        },
        {
          name: 'Enhanced Pagination Handler',
          url: 'content/enhanced-pagination-handler.js',
          init: initializeEnhancedPaginationHandler,
          priority: 1
        },
        {
          name: 'Scraper Integration',
          url: 'content/scraper-integration.js',
          init: initializeScraperIntegration,
          priority: 1
        },
        {
          name: 'Advanced Export System',
          url: 'content/advanced-export-system.js',
          init: null,
          priority: 2
        },
        {
          name: 'Enterprise Integration Core (Phases 2-4)',
          url: 'content/enterprise-integration-core.js',
          init: initializeEnterpriseIntegration,
          priority: 2
        },
        {
          name: 'Intelligent Caching System',
          url: 'content/intelligent-caching-system.js',
          init: null,
          priority: 2
        },
        {
          name: 'Adaptive Resource Manager',
          url: 'content/adaptive-resource-manager.js',
          init: null,
          priority: 2
        },
        
        // Lower priority modules
      ];

      // Load all modules with error handling
      for (const module of moduleLoaders) {
        try {
          console.log(`⚡ Loading ${module.name}...`);
          
          // Dynamic script loading for content script context
          const script = document.createElement('script');
          script.src = chrome.runtime.getURL(module.url);
          script.async = true;
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
          
          if (module.init && typeof module.init === 'function') {
            await module.init();
          }
          
          console.log(`✅ ${module.name} loaded successfully`);
        } catch (error) {
          console.warn(`⚠️ Failed to load ${module.name}:`, error);
          // Continue with other modules even if one fails
        }
      }
      
      enhancedModulesLoaded = true;
      console.log('🎉 All enhanced modules loaded successfully');
      
    } catch (error) {
      console.error('❌ Failed to load enhanced modules:', error);
      // Don't throw - allow basic functionality to continue
    }
  }

})();
