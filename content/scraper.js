// scraper.js - Enhanced extractor with site profiles, pagination, infinite scroll, and advanced filtering
// ENHANCED VERSION: Integrated with AdvancedExtractor, EnhancedErrorHandler, and MemoryOptimizedProcessor

// Import enhanced modules
// Note: These are loaded via injector.js or included separately
// const AdvancedExtractor = window.AdvancedExtractor;
// const EnhancedErrorHandler = window.EnhancedErrorHandler;

// Global scraping state
let isScrapingActive = false;
let scraperSettings = {};
let profileData = null;
const statusCallback = null;
let currentScrollAttempts = 0;
let lastItemCount = 0;
let stagnantCountChecks = 0;

// Enhanced components
let advancedExtractor = null;
let errorHandler = null;
let memoryProcessor = null;

// Initialize MemoryOptimizedProcessor for large galleries
async function initializeMemoryProcessor(expectedItemCount = 0) {
  if (window.MemoryOptimizedProcessor && !memoryProcessor) {
    const maxMemoryItems = expectedItemCount > 10000 ? 500 : 1000; // Reduce memory footprint for very large galleries
    
    memoryProcessor = new window.MemoryOptimizedProcessor({
      maxMemoryItems: maxMemoryItems,
      spillBatchSize: Math.min(expectedItemCount / 20, 500),
      processingBatchSize: expectedItemCount > 5000 ? 50 : 100,
      enableCompression: expectedItemCount > 1000,
      maxTotalItems: 100000,
      dbName: 'StepTwoScrapingProcessor'
    });
    
    // Set up progress monitoring
    memoryProcessor.subscribe('progress', (data) => {
      if (statusCallback) {
        statusCallback({
          type: 'memory_processing',
          ...data,
          gallerySize: expectedItemCount
        });
      }
    });
    
    memoryProcessor.subscribe('memory', (data) => {
      console.log('🧠 Memory optimization:', data);
      if (statusCallback) {
        statusCallback({
          type: 'memory_spill',
          ...data
        });
      }
    });
    
    console.log(`🧠 MemoryOptimizedProcessor initialized for ${expectedItemCount} expected items`);
  }
}

// Enhanced settings loader with error handling
async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'minWidth', 'minHeight', 'formats', 'skipDup', 
      'maxScrollAttempts', 'pageWaitTimeout', 'scrollDelay',
      'concurrency', 'hostLimit', 'retryLimit',
      'enableAdvancedExtraction', 'enableErrorRecovery', 'enableMemoryOptimization'
    ]);
    
    return {
      minWidth: settings.minWidth || 0,
      minHeight: settings.minHeight || 0,
      formats: settings.formats || {jpeg:true, png:true, webp:true, gif:false},
      skipDup: settings.skipDup || false,
      maxScrollAttempts: settings.maxScrollAttempts || 10,
      pageWaitTimeout: settings.pageWaitTimeout || 30,
      scrollDelay: settings.scrollDelay || 500,
      concurrency: settings.concurrency || 5,
      hostLimit: settings.hostLimit || 3,
      retryLimit: settings.retryLimit || 3,
      enableAdvancedExtraction: settings.enableAdvancedExtraction !== false,
      enableErrorRecovery: settings.enableErrorRecovery !== false,
      enableMemoryOptimization: settings.enableMemoryOptimization !== false
    };
  } catch (_error) {
    console.error('Failed to load settings:', _error);
    // Return defaults on error
    return {
      minWidth: 0,
      minHeight: 0,
      formats: {jpeg:true, png:true, webp:true, gif:false},
      skipDup: false,
      maxScrollAttempts: 10,
      pageWaitTimeout: 30,
      scrollDelay: 500,
      concurrency: 5,
      hostLimit: 3,
      retryLimit: 3,
      enableAdvancedExtraction: true,
      enableErrorRecovery: true,
      enableMemoryOptimization: true
    };
  }
}

// Estimate gallery size for performance optimization
function estimateGallerySize(selector) {
  try {
    // First, try to count visible elements
    const elements = document.querySelectorAll(selector);
    let count = elements.length;
    
    // Look for pagination indicators
    const paginationSelectors = [
      '.pagination', '.page-numbers', '.pager', '.next-page',
      '[class*="page"]', '[class*="pagination"]', '[data-page]',
      'a[href*="page"]', 'button[aria-label*="page"]'
    ];
    
    let paginationCount = 0;
    for (const paginationSelector of paginationSelectors) {
      const paginationElements = document.querySelectorAll(paginationSelector);
      paginationCount = Math.max(paginationCount, paginationElements.length);
    }
    
    // Look for "Load More" buttons or infinite scroll indicators
    const loadMoreSelectors = [
      '[class*="load-more"]', '[class*="show-more"]', 
      '[data-load-more]', '.infinite-scroll',
      '[class*="infinite"]', '.lazy-load'
    ];
    
    let hasInfiniteScroll = false;
    for (const loadSelector of loadMoreSelectors) {
      if (document.querySelector(loadSelector)) {
        hasInfiniteScroll = true;
        break;
      }
    }
    
    // Estimate total size based on indicators
    if (hasInfiniteScroll) {
      count = Math.max(count * 10, 1000); // Assume at least 10x current visible items
    } else if (paginationCount > 5) {
      count = count * Math.min(paginationCount, 50); // Estimate based on pagination
    }
    
    console.log(`📊 Gallery size estimation: ${count} items (visible: ${elements.length}, pagination: ${paginationCount}, infinite: ${hasInfiniteScroll})`);
    return count;
    
  } catch (_error) {
    console.warn('Gallery size estimation failed:', _error);
    return 100; // Safe default
  }
}

// Enhanced initialization function
async function initializeEnhancedScraper() {
  try {
    scraperSettings = await loadSettings();
    
    // Initialize advanced extractor if enabled
    if (scraperSettings.enableAdvancedExtraction && window.AdvancedExtractor) {
      advancedExtractor = new window.AdvancedExtractor();
      console.log('✅ Advanced extractor initialized');
    }
    
    // Initialize error handler if enabled
    if (scraperSettings.enableErrorRecovery && window.EnhancedErrorHandler) {
      errorHandler = new window.EnhancedErrorHandler({
        maxRetries: scraperSettings.retryLimit,
        enableLogging: true,
        enableUserNotification: true
      });
      console.log('✅ Enhanced error handler initialized');
    }
    
    // Initialize memory processor if enabled
    if (scraperSettings.enableMemoryOptimization && window.MemoryOptimizedProcessor) {
      memoryProcessor = new window.MemoryOptimizedProcessor({
        maxMemoryItems: 1000,
        enableCompression: true
      });
      
      // Subscribe to memory events
      memoryProcessor.subscribe('progress', (data) => {
        if (statusCallback) {
          statusCallback({
            type: 'memory_progress',
            data: data
          });
        }
      });
      
      console.log('✅ Memory-optimized processor initialized');
    }
    
    // Setup cleanup listeners to properly terminate workers on page unload
    setupCleanupListeners();
    
    // Load site profile if available
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_SITE_PROFILE',
        url: window.location.href
      });
      
      if (response && response.profile) {
        profileData = response.profile;
        console.log('✅ Site profile loaded:', profileData.name || 'Custom');
      }
    } catch (_error) {
      console.warn('Site profile loading failed:', _error);
    }
    
    return true;
  } catch (_error) {
    console.error('Enhanced scraper initialization failed:', _error);
    return false;
  }
}

// Enhanced main scraping function with advanced capabilities
async function enhancedStartScraping(selector, options = {}) {
  if (isScrapingActive) {
    console.warn('Scraping already active');
    return;
  }
  
  try {
    isScrapingActive = true;
    
    // Initialize enhanced components if not already done
    if (!advancedExtractor && !errorHandler) {
      await initializeEnhancedScraper();
    }
    
    // Estimate gallery size for memory optimization
    const estimatedSize = estimateGallerySize(selector);
    if (estimatedSize >= 1000 || options.forceMemoryOptimization) {
      await initializeMemoryProcessor(estimatedSize);
    }
    
    // Reset counters
    currentScrollAttempts = 0;
    lastItemCount = 0;
    stagnantCountChecks = 0;
    
    // Clear previous data if using memory processor
    if (memoryProcessor) {
      await memoryProcessor.clear();
    }
    
    // Merge options with settings
    const scrapingOptions = {
      ...scraperSettings,
      ...options,
      selector: selector
    };
    
    logStatus('🚀 Starting enhanced scraping...', 'info');
    
    // Phase 1: Advanced extraction
    let extractionResult;
    
    if (advancedExtractor) {
      try {
        extractionResult = await withErrorRecovery(
          () => advancedExtractor.extractElements(scrapingOptions),
          {
            operation: 'advanced_extraction',
            url: window.location.href,
            selector: selector
          }
        );
        
        logStatus(`✅ Advanced extraction found ${extractionResult.items.length} items`, 'success');
      } catch (_error) {
        logStatus('⚠️ Advanced extraction failed, falling back to standard method', 'warning');
        extractionResult = await fallbackExtraction(selector, scrapingOptions);
      }
    } else {
      extractionResult = await fallbackExtraction(selector, scrapingOptions);
    }
    
    if (!extractionResult.items || extractionResult.items.length === 0) {
      logStatus('❌ No items found with current selector', 'error');
      return { success: false, items: [], message: 'No items found' };
    }
    
    // Phase 2: Memory-optimized processing
    let processedItems;
    
    if (memoryProcessor && extractionResult.items.length > 100) {
      try {
        logStatus('🧠 Using memory-optimized processing for large dataset...', 'info');
        
        // Add items to processor efficiently
        await memoryProcessor.addItems(extractionResult.items);
        
        // Process with enhanced filtering and validation
        processedItems = await memoryProcessor.processItems(
          async (item) => await enhancedProcessItem(item, scrapingOptions),
          { useWorker: true }
        );
        
        logStatus(`✅ Memory-optimized processing completed: ${processedItems.length} items`, 'success');
      } catch (_error) {
        logStatus('⚠️ Memory processing failed, using standard processing', 'warning');
        processedItems = await standardProcessItems(extractionResult.items, scrapingOptions);
      }
    } else {
      processedItems = await standardProcessItems(extractionResult.items, scrapingOptions);
    }
    
    // Phase 3: Enhanced pagination handling
    if (options.handlePagination && processedItems.length > 0) {
      const paginationResult = await handleEnhancedPagination(scrapingOptions);
      if (paginationResult.items.length > 0) {
        processedItems.push(...paginationResult.items);
        logStatus(`📄 Pagination added ${paginationResult.items.length} more items`, 'info');
      }
    }
    
    // Phase 4: Final processing and validation
    const finalResults = await finalizeResults(processedItems, scrapingOptions);
    
    logStatus(`🎉 Enhanced scraping completed: ${finalResults.length} items ready`, 'success');
    
    return {
      success: true,
      items: finalResults,
      stats: {
        extracted: extractionResult.items.length,
        processed: processedItems.length,
        final: finalResults.length,
        extractionMethod: extractionResult.extractionMethod || 'standard',
        memoryOptimized: !!memoryProcessor,
        errorRecoveryUsed: errorHandler ? errorHandler.getStats().recoverable > 0 : false
      }
    };
    
  } catch (_error) {
    logStatus(`❌ Enhanced scraping failed: ${_error.message}`, 'error');
    
    if (errorHandler) {
      const recovery = await errorHandler.handleError(error, {
        operation: 'enhanced_scraping',
        url: window.location.href,
        selector: selector,
        retryFunction: () => enhancedStartScraping(selector, options)
      });
      
      if (recovery.success) {
        return recovery.result;
      }
    }
    
    return { success: false, error: error.message, items: [] };
  } finally {
    isScrapingActive = false;
  }
}

// Error recovery wrapper with enhanced logging and recovery strategies
async function withErrorRecovery(operation, context) {
  if (!errorHandler) {
    try {
      return await operation();
    } catch (_error) {
      // Basic error logging when no error handler is available
      console.error('Operation failed without error handler:', {
        operation: context?.operation || 'unknown',
        error: error.message,
        url: context?.url || window.location.href
      });
      
      // Simple retry for network errors
      if (error.name === 'NetworkError' || error.message.includes('network') || error.message.includes('fetch')) {
        console.log('Retrying network operation...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          return await operation();
        } catch (retryError) {
          console.error('Retry failed:', retryError.message);
          throw retryError;
        }
      }
      
      throw error;
    }
  }
  
  try {
    return await operation();
  } catch (_error) {
    console.error('Error in operation:', {
      operation: context?.operation || 'unknown',
      error: error.message,
      stack: error.stack,
      context: context
    });
    
    const recovery = await errorHandler.handleError(error, {
      ...context,
      retryFunction: operation
    });
    
    if (recovery.success) {
      console.log('Error recovery successful for:', context?.operation || 'unknown');
      return recovery.result;
    } else {
      console.error('Error recovery failed for:', context?.operation || 'unknown');
      throw error;
    }
  }
}

// Fallback extraction method
async function fallbackExtraction(selector, options) {
  try {
    // Use existing extraction logic
    const items = [];
    const elements = selector ? 
      document.querySelectorAll(selector) : 
      document.querySelectorAll('img, [style*="background-image"]');
    
    for (const element of elements) {
      const item = await extractItemFromElement(element);
      if (item && await passesBasicFilters(item, options)) {
        items.push(item);
      }
    }
    
    return {
      success: items.length > 0,
      items: items,
      extractionMethod: 'fallback'
    };
  } catch (_error) {
    console.error('Fallback extraction failed:', _error);
    return { success: false, items: [], extractionMethod: 'failed' };
  }
}

// Enhanced item processing
async function enhancedProcessItem(item, options) {
  try {
    // Standard processing
    const processed = await standardProcessItem(item, options);
    
    // Add enhanced metadata
    processed.enhanced = {
      extractionMethod: item.extractionMethod,
      processingTimestamp: Date.now(),
      qualityScore: calculateQualityScore(processed),
      metadata: item.metadata || {}
    };
    
    return processed;
  } catch (_error) {
    console.warn('Enhanced processing failed for item:', error);
    return await standardProcessItem(item, options);
  }
}

// Standard item processing (existing logic)
async function standardProcessItem(item, options) {
  // Existing item processing logic
  return {
    ...item,
    processed: true,
    processedAt: Date.now()
  };
}

// Standard batch processing
async function standardProcessItems(items, options) {
  const processed = [];
  
  for (const item of items) {
    try {
      const processedItem = await standardProcessItem(item, options);
      processed.push(processedItem);
    } catch (_error) {
      console.warn('Item processing failed:', error);
    }
  }
  
  return processed;
}

// Enhanced pagination handling
async function handleEnhancedPagination(options) {
  const additionalItems = [];
  let attempts = 0;
  const maxAttempts = options.maxScrollAttempts || 10;
  
  while (attempts < maxAttempts) {
    try {
      // Try to find and click next page
      const nextButton = findNextPageButton();
      if (!nextButton) {
        logStatus('📄 No more pages found', 'info');
        break;
      }
      
      // Click next page with error recovery
      await withErrorRecovery(
        async () => {
          nextButton.click();
          await waitForPageLoad(options.pageWaitTimeout * 1000);
        },
        {
          operation: 'pagination_navigation',
          attempt: attempts + 1
        }
      );
      
      // Extract new items
      const newItems = await withErrorRecovery(
        () => advancedExtractor ? 
          advancedExtractor.extractElements(options) :
          fallbackExtraction(options.selector, options),
        {
          operation: 'pagination_extraction',
          page: attempts + 2
        }
      );
      
      if (newItems.items.length === 0) {
        logStatus('📄 No new items on this page, stopping pagination', 'info');
        break;
      }
      
      additionalItems.push(...newItems.items);
      attempts++;
      
      logStatus(`📄 Page ${attempts + 1}: Found ${newItems.items.length} items`, 'info');
      
      // Delay between pages
      await new Promise(resolve => setTimeout(resolve, options.scrollDelay || 500));
      
    } catch (_error) {
      logStatus(`📄 Pagination error on attempt ${attempts + 1}: ${error.message}`, 'warning');
      break;
    }
  }
  
  return { items: additionalItems, pages: attempts };
}

// Quality score calculation
function calculateQualityScore(item) {
  let score = 0;
  
  // Image quality factors
  if (item.image) {
    score += 20;
    if (item.imageAnalysis?.dimensions?.width > 500) {score += 10;}
    if (item.imageAnalysis?.dimensions?.height > 500) {score += 10;}
  }
  
  // Metadata richness
  if (item.text && item.text.length > 10) {score += 15;}
  if (item.link) {score += 10;}
  if (item.metadata && Object.keys(item.metadata).length > 2) {score += 10;}
  
  // Extraction method bonus
  if (item.extractionMethod === 'modern') {score += 15;} else if (item.extractionMethod === 'container') {score += 10;} else if (item.extractionMethod === 'fallback') {score -= 5;}
  
  return Math.min(Math.max(score, 0), 100);
}

// Finalize results with deduplication and sorting
async function finalizeResults(items, options) {
  let finalItems = [...items];
  
  // Enhanced deduplication
  if (options.skipDup) {
    finalItems = await enhancedDeduplication(finalItems);
  }
  
  // Sort by quality score if available
  finalItems.sort((a, b) => {
    const scoreA = a.enhanced?.qualityScore || 50;
    const scoreB = b.enhanced?.qualityScore || 50;
    return scoreB - scoreA;
  });
  
  return finalItems;
}

// Enhanced deduplication with perceptual hashing
async function enhancedDeduplication(items) {
  const uniqueItems = [];
  const seenUrls = new Set();
  const seenHashes = new Set();
  
  for (const item of items) {
    // URL deduplication
    if (seenUrls.has(item.image)) {
      continue;
    }
    
    // Perceptual hash deduplication (if available)
    if (window.PerceptualHashWorker && item.image) {
      try {
        const hash = await generateImageHash(item.image);
        if (seenHashes.has(hash)) {
          continue;
        }
        seenHashes.add(hash);
      } catch (_error) {
        // Continue with URL-only dedup
      }
    }
    
    seenUrls.add(item.image);
    uniqueItems.push(item);
  }
  
  return uniqueItems;
}

// Enhanced image hash generation with performance optimization
async function generateImageHash(url, options = {}) {
  // Use enhanced detector for better efficiency if available
  if (window.PerceptualDuplicateDetector && !options.forceWorker) {
    try {
      return await window.PerceptualDuplicateDetector.generateSimpleHash(url);
    } catch (_error) {
      console.warn('Enhanced detector failed, falling back to worker:', error);
    }
  }
  
  // Fallback to worker-based approach
  return new Promise((res) => {
    const id = Math.random().toString(36);
    const wk = new Worker('content/hashWorker.js');
    const listener = (e) => {
      if (e.data.id === id) {
        wk.removeEventListener('message', listener); 
        wk.terminate(); // Clean up worker
        res(e.data.hash || null);
      } 
    };
    wk.addEventListener('message', listener);
    wk.postMessage({id, url, options});
    
    // Add timeout to prevent hanging
    setTimeout(() => {
      wk.removeEventListener('message', listener);
      wk.terminate();
      res(null);
    }, 30000);
  });
}

// Enhanced batch hash generation for improved performance
async function generateImageHashesBatch(urls, options = {}) {
  const batchSize = options.batchSize || 10;
  const enablePerformanceMode = options.enablePerformanceMode || urls.length > 100;
  
  if (window.PerceptualDuplicateDetector && enablePerformanceMode) {
    try {
      const detector = new window.PerceptualDuplicateDetector({
        enablePerformanceMode: true,
        bypassDuplicationForLargeScale: urls.length > 500,
        largeScaleThreshold: 500,
        batchSize: batchSize
      });
      
      const result = await detector.processBatch(urls, { algorithms: ['average'] });
      detector.destroy();
      
      return result.results.map(r => ({
        url: r.url,
        hash: r.success ? r.result?.hashes?.average : null,
        success: r.success,
        error: r.error
      }));
    } catch (_error) {
      console.warn('Batch processing failed, falling back to individual processing:', error);
    }
  }
  
  // Fallback to individual processing
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => 
      generateImageHash(url, options).then(hash => ({ url, hash, success: !!hash }))
    );
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Yield control between batches
    if (i + batchSize < urls.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

// Alias for backward compatibility
async function hashImage(url) {
  return await generateImageHash(url);
}

// Enhanced URL cleaning and validation
function cleanImageUrl(url, baseUrl) {
  if (!url) {return null;}
  
  try {
    // Handle relative URLs
    const fullUrl = new URL(url, baseUrl || window.location.href);
    
    // Remove tracking parameters
    const cleanedUrl = new URL(fullUrl);
    const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source', 'track'];
    paramsToRemove.forEach(param => cleanedUrl.searchParams.delete(param));
    
    return cleanedUrl.href;
  } catch (_error) {
    console.warn('Invalid URL:', url, error);
    return null;
  }
}

// Enhanced metadata extraction
function extractImageMetadata(img, container) {
  const metadata = {
    url: null,
    filename: null,
    alt: '',
    caption: '',
    id: '',
    resolution: '',
    filesize: null,
    mirrorPixOffer: null
  };
  
  // Extract URL (prefer highest quality)
  const urls = [
    img.getAttribute('data-src-full'),
    img.getAttribute('data-original'),
    img.getAttribute('data-src'),
    img.getAttribute('data-large'),
    img.getAttribute('data-hires'),
    img.src,
    img.getAttribute('srcset')?.split(',').pop()?.trim().split(' ')[0]
  ].filter(Boolean);
  
  metadata.url = urls[0] ? cleanImageUrl(urls[0]) : null;
  if (!metadata.url) {return null;}
  
  // Special handling for MirrorPix URLs - try to find high-res versions
  if (metadata.url.includes('mirrorpix.com')) {
    const betterUrl = findMirrorPixHighResUrl(img, container, metadata.url);
    if (betterUrl) {
      metadata.url = betterUrl;
    }
    
    // Extract offer ID if this is an offer page
    const offerMatch = window.location.pathname.match(/\/offer\/(\d+)/);
    if (offerMatch) {
      metadata.mirrorPixOffer = offerMatch[1];
    }
  }
  
  // Extract filename
  try {
    const urlPath = new URL(metadata.url).pathname;
    metadata.filename = urlPath.split('/').pop() || 'untitled';
  } catch {
    metadata.filename = 'untitled';
  }
  
  // Extract metadata
  metadata.alt = img.alt || img.getAttribute('title') || '';
  metadata.id = img.id || img.getAttribute('data-id') || '';
  
  // Look for caption in various places (enhanced for MirrorPix)
  const captionSelectors = [
    '.caption', '.title', '.description', '[data-caption]',
    'figcaption', '.photo-caption', '.image-title',
    // MirrorPix specific selectors
    '.offer-title', '.offer-description', '.image-info',
    '.photo-details', '.metadata', '.info-text'
  ];
  
  for (const selector of captionSelectors) {
    const captionEl = container?.querySelector(selector) || img.closest('figure')?.querySelector(selector) || img.closest('.offer-content')?.querySelector(selector);
    if (captionEl) {
      metadata.caption = captionEl.textContent?.trim() || '';
      break;
    }
  }
  
  // Extract resolution if available
  if (img.naturalWidth && img.naturalHeight) {
    metadata.resolution = `${img.naturalWidth}x${img.naturalHeight}`;
  }
  
  return metadata;
}

// MirrorPix specific URL enhancement
function findMirrorPixHighResUrl(img, container, originalUrl) {
  try {
    // Look for onclick handlers that might contain high-res URLs
    const onclick = img.getAttribute('onclick');
    if (onclick) {
      const urlMatch = onclick.match(/['"]([^'"]*\.(jpg|jpeg|png|gif)[^'"]*)['"]/i);
      if (urlMatch && urlMatch[1]) {
        return cleanImageUrl(urlMatch[1]);
      }
    }
    
    // Look for data attributes that might contain high-res URLs
    const dataAttrs = ['data-full', 'data-large', 'data-original', 'data-highres'];
    for (const attr of dataAttrs) {
      const url = img.getAttribute(attr);
      if (url) {
        return cleanImageUrl(url);
      }
    }
    
    // Look for parent links that might point to high-res images
    const parentLink = img.closest('a');
    if (parentLink && parentLink.href) {
      const href = parentLink.href;
      if (href.includes('image/') || href.includes('photo/') || href.includes('full/')) {
        return cleanImageUrl(href);
      }
    }
    
    // Note: PHP thumbnail transformation system removed as per requirements
    
    // Try to replace size indicators in URL
    if (originalUrl.includes('medium') || originalUrl.includes('thumb')) {
      const largeUrl = originalUrl
        .replace(/medium/g, 'large')
        .replace(/thumb/g, 'full')
        .replace(/_m\./g, '_l.')
        .replace(/_s\./g, '_l.')
        .replace(/\?w=\d+/g, '')
        .replace(/\?h=\d+/g, '');
      
      if (largeUrl !== originalUrl) {
        return cleanImageUrl(largeUrl);
      }
    }
    
    return null;
  } catch (_error) {
    console.warn('[STEPTWO] Error finding high-res URL for MirrorPix:', error);
    return null;
  }
}

function validFormat(url, formats){
  const ext = (url.split('.').pop()||'').toLowerCase().split(/[#?]/)[0];
  if(['jpg','jpeg'].includes(ext)) {return formats.jpeg;}
  if(ext==='png') {return formats.png;}
  if(ext==='webp') {return formats.webp;}
  if(ext==='gif') {return formats.gif;}
  if(ext==='svg') {return formats.svg || false;}
  return false;
}

async function passesSize(url, minW, minH){
  if(minW===0&&minH===0) {return true;}
  return new Promise(res => {
    const img = new Image();
    img.onload = () => {
      res(img.naturalWidth>=minW && img.naturalHeight>=minH);
    };
    img.onerror = () => res(false);
    setTimeout(() => res(false), 5000); // timeout after 5s
    img.src = url;
  });
}

// Enhanced scraping with site profile and pagination support
async function runScrape(selector, options = {}) {
  if (isScrapingActive) {
    console.warn('[STEPTWO] Scraping already active');
    return;
  }
  
  isScrapingActive = true;
  scraperSettings = await loadSettings();
  profileData = options.siteProfile || options.profile || null;
  currentScrollAttempts = 0;
  lastItemCount = 0;
  stagnantCountChecks = 0;
  
  // Reset tracking sets
  seenHashes.clear();
  seenUrls.clear();
  
  // Send initial status
  updateStatus('initializing', 'Loading settings and preparing scraper...');
  
  try {
    let finalSelector = selector;
    let waitSettings = {
      pageLoad: 3000,
      scrollDelay: 1000,
      afterScroll: 2000
    };
    let scrollBehavior = {
      type: 'smooth',
      maxAttempts: 10,
      scrollDistance: 600
    };
    
    // Apply site profile if available
    if (profileData) {
      console.log('[STEPTWO] Using site profile:', profileData.name || 'Unknown');
      
      // Use profile selectors
      if (profileData.selectors) {
        finalSelector = profileData.selectors.imageContainer || finalSelector;
      }
      
      // Override timing settings with profile settings
      if (profileData.waitSettings) {
        waitSettings = { ...waitSettings, ...profileData.waitSettings };
      }
      
      if (profileData.scrollBehavior) {
        scrollBehavior = { ...scrollBehavior, ...profileData.scrollBehavior };
      }
      
      updateStatus('starting', `Using ${profileData.name} profile with selector: ${finalSelector}`);
    } else {
      updateStatus('starting', `Using selector: ${finalSelector}`);
    }
    
    // Wait for page to stabilize
    await waitForPageLoad(waitSettings.pageLoad);
    
    const collected = new Set();
    const items = [];
    let pagesProcessed = 0;
    
    // Enhanced collection function with site profile support and error recovery
    async function collect() {
      return await withErrorRecovery(async () => {
        updateStatus('scanning', `Scanning page ${pagesProcessed + 1} for images...`);
        
        // Use different selectors based on profile
        let images = [];
        
        if (profileData?.selectors) {
          // Try profile-specific selectors first
          if (profileData.selectors.imageElement) {
            images = Array.from(document.querySelectorAll(profileData.selectors.imageElement));
          }
          
          // Fallback to container-based search
          if (images.length === 0 && profileData.selectors.imageContainer) {
            const containers = document.querySelectorAll(profileData.selectors.imageContainer);
            containers.forEach(container => {
              const imgs = container.querySelectorAll('img, [style*="background-image"]');
              images.push(...Array.from(imgs));
            });
          }
        } else {
          // Standard selector approach
          const containers = document.querySelectorAll(finalSelector);
          containers.forEach(container => {
            const imgs = container.querySelectorAll('img, [style*="background-image"]');
            images.push(...Array.from(imgs));
          });
        }
        
        updateStatus('processing', `Found ${images.length} image elements, processing...`);
        
        let newImages = 0;
        
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          const container = img.closest(finalSelector);
          
          try {
            const metadata = await withErrorRecovery(
              () => extractImageMetadata(img, container),
              {
                operation: 'metadata_extraction',
                imageIndex: i,
                totalImages: images.length
              }
            );
            
            if (!metadata?.url) {continue;}
            
            // Check for duplicates
            if (collected.has(metadata.url)) {continue;}
            
            // Apply filtering with error recovery
            const passesFilter = await withErrorRecovery(
              () => passesFilters(metadata),
              {
                operation: 'filter_validation',
                url: metadata.url
              }
            );
            
            if (!passesFilter) {continue;}
            
            collected.add(metadata.url);
            items.push(metadata);
            newImages++;
            
            // Update progress
            if (newImages % 10 === 0) {
              updateStatus('collecting', `Collected ${items.length} images so far...`);
            }
            
          } catch (_error) {
            console.warn('[STEPTWO] Error processing image:', error);
            // Continue with next image instead of failing completely
          }
        }
        
        updateStatus('page_complete', `Page ${pagesProcessed + 1} complete: ${newImages} new images`);
        pagesProcessed++;
        
        return newImages;
      }, {
        operation: 'page_collection',
        page: pagesProcessed + 1,
        selector: finalSelector
      });
    }
    
    // Collect from initial page
    await collect();
    
    // Handle pagination and infinite scroll
    if (profileData?.special?.infiniteScroll || scrollBehavior.maxAttempts > 0) {
      await handleInfiniteScroll(collect, scrollBehavior, waitSettings);
    } else {
      await handlePagination(collect, profileData?.selectors?.nextPageButton);
    }
    
    // Send results to background
    updateStatus('completing', `Scraping complete! Collected ${items.length} images`);
    
    chrome.runtime.sendMessage({
      type: 'SCRAPE_DONE',
      items: items,
      stats: {
        totalImages: items.length,
        pagesProcessed: pagesProcessed,
        duplicatesSkipped: currentScrollAttempts,
        profileUsed: profileData?.name || 'None'
      }
    });
    
  } catch (_error) {
    console.error('[STEPTWO] Scraping error:', _error);
    updateStatus('error', `Scraping failed: ${_error.message}`);
  } finally {
    isScrapingActive = false;
  }
}

function extractUrl(el) {
  if (el.tagName === 'IMG') {
    // Prefer high-res versions
    return el.getAttribute('data-src') || 
           el.getAttribute('data-original') ||
           el.getAttribute('data-full') ||
           el.src;
  } else if (el.tagName === 'A') {
    return el.href;
  } else {
    // Check for background images
    const bg = getComputedStyle(el).backgroundImage;
    const match = bg && bg.match(/url\(["']?(.*?)["']?\)/);
    if (match) {return match[1];}
    
    // Check for data attributes
    const dataSrc = el.getAttribute('data-src') || el.getAttribute('data-background');
    if (dataSrc) {return dataSrc;}
  }
  return null;
}

function getContainerInfo(el) {
  const container = el.closest('[class*="item"], [class*="card"], [class*="tile"], article, section');
  if (!container) {return null;}
  
  return {
    tagName: container.tagName.toLowerCase(),
    className: container.className,
    hasLink: !!container.querySelector('a'),
    position: container.getBoundingClientRect()
  };
}

// Enhanced pagination handler with site profile support
async function handlePagination(collectFn, nextButtonSelector) {
  let continuePagination = true;
  let pageCount = 0;
  const maxPages = 50; // Safety limit
  
  // Enhanced next button selectors based on site profile
  const nextSelectors = [
    nextButtonSelector,
    '[aria-label*="next" i]', '[aria-label*="následující" i]',
    '.next', '.next-page', '.pagination-next',
    'a[rel="next"]', '[href*="page="]',
    '.pager-next', '.nav-next'
  ].filter(Boolean);
  
  while (continuePagination && pageCount < maxPages) {
    updateStatus('paginating', `Looking for next page (page ${pageCount + 1})...`);
    
    // Try to find and click next button
    let nextButton = null;
    for (const selector of nextSelectors) {
      nextButton = document.querySelector(selector);
      if (nextButton && !nextButton.disabled && nextButton.offsetParent !== null) {
        break;
      }
      nextButton = null;
    }
    
    if (nextButton) {
      try {
        pageCount++;
        updateStatus('paginating', `Navigating to page ${pageCount + 1}...`);
        
        // Click next button
        nextButton.click();
        
        // Wait for page load
        await waitForPageLoad(3000);
        
        // Additional wait for content to load
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Collect new items
        const newItems = await collectFn();
        updateStatus('scanning', `Page ${pageCount + 1}: Found ${newItems} new images`);
        
        if (newItems === 0) {
          stagnantCountChecks++;
          if (stagnantCountChecks >= 3) {
            continuePagination = false;
            console.log('[STEPTWO] No new items found after 3 attempts, stopping pagination');
          }
        } else {
          stagnantCountChecks = 0;
        }
        
      } catch (_error) {
        console.warn('[STEPTWO] Pagination error:', _error);
        continuePagination = false;
      }
    } else {
      continuePagination = false;
      console.log('[STEPTWO] No next button found, pagination complete');
    }
  }
  
  if (pageCount >= maxPages) {
    updateStatus('warning', `Reached maximum page limit (${maxPages})`);
  }
}

// Enhanced infinite scroll handler with site profile support and robust exit conditions
async function handleInfiniteScroll(collectFn, scrollBehavior, waitSettings) {
  let scrollAttempts = 0;
  let lastCount = lastItemCount;
  let stagnantScrolls = 0;
  const startTime = Date.now();
  
  // Enhanced exit conditions
  const maxTotalTime = (scraperSettings.pageWaitTimeout || 30) * 60 * 1000; // Convert to ms and multiply by 60 for total operation
  const maxStagnantTime = 30000; // 30 seconds without new content
  const maxConsecutiveStagnant = 5; // Maximum consecutive failed attempts
  let lastNewContentTime = startTime;
  let lastScrollPosition = window.scrollY;
  let scrollPositionStagnant = 0;
  
  updateStatus('scrolling', 'Starting infinite scroll detection...');
  
  while (scrollAttempts < scrollBehavior.maxAttempts) {
    const currentTime = Date.now();
    
    // Check overall timeout - prevent hanging indefinitely
    if (currentTime - startTime > maxTotalTime) {
      updateStatus('warning', `Infinite scroll timeout reached (${Math.round(maxTotalTime/1000)}s), stopping`);
      break;
    }
    
    // Check stagnant content timeout
    if (currentTime - lastNewContentTime > maxStagnantTime) {
      updateStatus('warning', `No new content for ${Math.round(maxStagnantTime/1000)}s, stopping infinite scroll`);
      break;
    }
    
    scrollAttempts++;
    currentScrollAttempts = scrollAttempts;
    
    updateStatus('scrolling', `Scroll attempt ${scrollAttempts}/${scrollBehavior.maxAttempts}`);
    
    // Store current scroll position for stuck detection
    const beforeScrollY = window.scrollY;
    
    // Perform scroll based on behavior type
    if (scrollBehavior.type === 'smooth') {
      window.scrollBy({
        top: scrollBehavior.scrollDistance,
        behavior: 'smooth'
      });
    } else {
      window.scrollBy(0, scrollBehavior.scrollDistance);
    }
    
    // Wait for scroll delay
    await new Promise(resolve => setTimeout(resolve, waitSettings.scrollDelay));
    
    // Check if scroll position actually changed (detect stuck pages)
    const afterScrollY = window.scrollY;
    if (Math.abs(afterScrollY - beforeScrollY) < 10) {
      scrollPositionStagnant++;
      if (scrollPositionStagnant >= 3) {
        updateStatus('warning', 'Page scroll appears stuck, checking for bottom...');
        
        // Enhanced bottom detection with multiple strategies
        const isAtBottom = detectPageBottom();
        if (isAtBottom) {
          updateStatus('scrolling', 'Confirmed: reached bottom of page');
          break;
        } else {
          // Try alternative scroll method
          document.documentElement.scrollTop = document.documentElement.scrollHeight;
          await new Promise(resolve => setTimeout(resolve, waitSettings.scrollDelay));
          
          // Check again after forced scroll
          if (window.scrollY === afterScrollY) {
            updateStatus('warning', 'Unable to scroll further, assuming end of content');
            break;
          }
        }
      }
    } else {
      scrollPositionStagnant = 0;
    }
    
    // Enhanced bottom detection
    const isAtBottom = detectPageBottom();
    if (isAtBottom) {
      updateStatus('scrolling', 'Reached bottom of page, waiting for content...');
      await new Promise(resolve => setTimeout(resolve, waitSettings.afterScroll));
      
      // Check if new content appeared after waiting
      const postWaitHeight = document.body.scrollHeight;
      const heightBeforeWait = document.body.scrollHeight;
      
      if (postWaitHeight === heightBeforeWait) {
        // Try one final scroll to trigger lazy loading
        window.scrollBy(0, 100);
        await new Promise(resolve => setTimeout(resolve, waitSettings.scrollDelay));
        
        if (document.body.scrollHeight === postWaitHeight) {
          updateStatus('scrolling', 'No new content loaded at bottom, stopping');
          break;
        }
      }
    }
    
    // Collect new items with timeout protection
    let newItems = 0;
    try {
      const collectPromise = collectFn();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Collection timeout')), 10000)
      );
      
      newItems = await Promise.race([collectPromise, timeoutPromise]);
    } catch (_error) {
      updateStatus('warning', `Content collection failed: ${error.message}`);
      stagnantScrolls++;
    }
    
    if (newItems === 0) {
      stagnantScrolls++;
      updateStatus('scrolling', `No new items found (attempt ${stagnantScrolls}/${maxConsecutiveStagnant})`);
      
      if (stagnantScrolls >= maxConsecutiveStagnant) {
        updateStatus('scrolling', 'No new content after multiple scrolls, stopping');
        break;
      }
      
      // Progressive retry strategy
      if (stagnantScrolls === 2) {
        // Try a larger scroll if no new items
        updateStatus('scrolling', 'Attempting larger scroll distance...');
        window.scrollBy(0, scrollBehavior.scrollDistance * 2);
        await new Promise(resolve => setTimeout(resolve, waitSettings.afterScroll * 1.5));
      } else if (stagnantScrolls === 3) {
        // Try scrolling to very bottom to trigger any remaining lazy loading
        updateStatus('scrolling', 'Attempting scroll to bottom...');
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, waitSettings.afterScroll * 2));
      }
    } else {
      stagnantScrolls = 0;
      lastNewContentTime = currentTime;
      updateStatus('collecting', `Scroll ${scrollAttempts}: Found ${newItems} new images`);
      
      // Additional wait after finding new content
      await new Promise(resolve => setTimeout(resolve, waitSettings.afterScroll));
    }
    
    lastCount = newItems;
    lastScrollPosition = window.scrollY;
  }
  
  if (scrollAttempts >= scrollBehavior.maxAttempts) {
    updateStatus('warning', `Reached maximum scroll attempts (${scrollBehavior.maxAttempts})`);
  }
  
  updateStatus('scrolling', `Infinite scroll completed after ${scrollAttempts} attempts in ${Math.round((Date.now() - startTime)/1000)}s`);
}

// Enhanced bottom detection with multiple strategies
function detectPageBottom() {
  const strategies = [
    // Strategy 1: Standard bottom detection
    () => (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 100),
    
    // Strategy 2: Document element height
    () => (window.innerHeight + window.scrollY) >= (document.documentElement.scrollHeight - 100),
    
    // Strategy 3: Maximum of body and document heights
    () => {
      const bodyHeight = document.body.scrollHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const maxHeight = Math.max(bodyHeight, documentHeight);
      return (window.innerHeight + window.scrollY) >= (maxHeight - 100);
    },
    
    // Strategy 4: Check if current scroll position is at maximum possible
    () => {
      const maxScrollTop = Math.max(
        document.body.scrollHeight - window.innerHeight,
        document.documentElement.scrollHeight - window.innerHeight,
        0
      );
      return window.scrollY >= (maxScrollTop - 50);
    }
  ];
  
  // Return true if any strategy confirms we're at the bottom
  return strategies.some(strategy => {
    try {
      return strategy();
    } catch (_error) {
      console.warn('Bottom detection strategy failed:', error);
      return false;
    }
  });
}

async function tryPagination() {
  const paginationSelectors = [
    profileData?.pagination,
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
  ].filter(Boolean);
  
  for (const paginationSelector of paginationSelectors) {
    const nextButton = document.querySelector(paginationSelector);
    if (nextButton && isElementVisible(nextButton) && !nextButton.disabled) {
      try {
        console.log('[STEPTWO] Clicking pagination:', paginationSelector);
        nextButton.click();
        return { success: true, method: 'click', selector: paginationSelector };
      } catch (_error) {
        console.warn('[STEPTWO] Pagination click failed:', error);
      }
    }
  }
  
  return { success: false };
}



function isElementVisible(el) {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && 
         rect.bottom > 0 && rect.right > 0 &&
         getComputedStyle(el).display !== 'none' &&
         getComputedStyle(el).visibility !== 'hidden';
}

function updateStatus(state, message) {
  console.log(`[STEPTWO] ${state}: ${message}`);
  
  chrome.runtime.sendMessage({
    type: 'SCRAPER_STATUS',
    state,
    message,
    timestamp: Date.now()
  }).catch(() => {}); // Ignore if no listeners
}

// Enhanced filtering with site profile support
async function passesFilters(metadata) {
  if (!metadata?.url) {return false;}
  
  // Check URL duplicates
  if (seenUrls.has(metadata.url)) {return false;}
  seenUrls.add(metadata.url);
  
  // Check file extension
  const allowedTypes = Object.keys(scraperSettings.formats).filter(k => scraperSettings.formats[k]);
  const ext = metadata.filename.split('.').pop()?.toLowerCase();
  if (ext && !allowedTypes.includes(ext) && !allowedTypes.includes('jpeg') && ext === 'jpg') {
    // Allow jpg when jpeg is enabled
    if (!allowedTypes.includes('jpeg')) {return false;}
  }
  
  // Check dimensions if required
  if (scraperSettings.minWidth > 0 || scraperSettings.minHeight > 0) {
    const meetsSize = await checkImageSize(metadata.url, scraperSettings.minWidth, scraperSettings.minHeight);
    if (!meetsSize) {return false;}
  }
  
  // Check content hash for duplicates if enabled
  if (scraperSettings.skipDup) {
    try {
      const hash = await hashImage(metadata.url);
      if (hash && seenHashes.has(hash)) {
        chrome.runtime.sendMessage({type: 'DUP_SKIPPED', url: metadata.url, hash});
        return false;
      }
      if (hash) {seenHashes.add(hash);}
    } catch (_error) {
      console.warn('Hash checking failed:', error);
    }
  }
  
  return true;
}

// Enhanced page load waiting with network detection and slow page handling
async function waitForPageLoad(timeout = 3000) {
  const startTime = Date.now();
  const maxTimeout = Math.max(timeout, 5000); // Minimum 5 seconds for slow pages
  
  updateStatus('waiting', 'Waiting for page to stabilize...');
  
  // Wait for basic page state
  if (document.readyState !== 'complete') {
    await new Promise(resolve => {
      const checkReady = () => {
        const elapsed = Date.now() - startTime;
        
        if (document.readyState === 'complete') {
          updateStatus('waiting', 'Page ready state complete');
          resolve();
        } else if (elapsed > maxTimeout) {
          updateStatus('warning', `Page ready timeout after ${Math.round(elapsed/1000)}s, continuing anyway`);
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    });
  }
  
  // Enhanced network idle detection for slow pages
  await waitForNetworkIdle(Math.min(maxTimeout - (Date.now() - startTime), 3000));
  
  // Additional stability check for dynamic content
  await waitForContentStability(2000);
  
  const totalTime = Date.now() - startTime;
  updateStatus('waiting', `Page stabilization complete (${Math.round(totalTime/1000)}s)`);
}

// Enhanced network idle detection for better slow page handling
async function waitForNetworkIdle(timeout = 2000) {
  return new Promise(resolve => {
    let networkIdleTimer = null;
    const originalFetch = window.fetch;
    let pendingRequests = 0;
    let timeoutReached = false;
    
    const checkNetworkIdle = () => {
      if (timeoutReached) {return;}
      
      if (pendingRequests === 0) {
        if (networkIdleTimer) {clearTimeout(networkIdleTimer);}
        networkIdleTimer = setTimeout(() => {
          if (!timeoutReached) {
            window.fetch = originalFetch;
            resolve();
          }
        }, 800); // Increased idle time for slower pages
      }
    };
    
    // Override fetch to track requests
    window.fetch = function(...args) {
      if (timeoutReached) {return originalFetch.apply(this, args);}
      
      pendingRequests++;
      return originalFetch.apply(this, args)
        .finally(() => {
          pendingRequests--;
          checkNetworkIdle();
        })
        .catch(error => {
          console.warn('Network request failed during idle detection:', error);
          return Promise.reject(error);
        });
    };
    
    // Also monitor XHR requests for older pages
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;
    
    XMLHttpRequest.prototype.open = function(...args) {
      this._stepTwoTracked = true;
      return originalXHROpen.apply(this, args);
    };
    
    XMLHttpRequest.prototype.send = function(...args) {
      if (this._stepTwoTracked && !timeoutReached) {
        pendingRequests++;
        
        const cleanup = () => {
          pendingRequests--;
          checkNetworkIdle();
        };
        
        this.addEventListener('load', cleanup);
        this.addEventListener('error', cleanup);
        this.addEventListener('abort', cleanup);
      }
      
      return originalXHRSend.apply(this, args);
    };
    
    // Fallback timeout with progressive resolution
    const progressiveTimeout = Math.max(timeout, 1000);
    setTimeout(() => {
      timeoutReached = true;
      window.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXHROpen;
      XMLHttpRequest.prototype.send = originalXHRSend;
      
      if (pendingRequests > 0) {
        updateStatus('warning', `Network idle timeout with ${pendingRequests} pending requests`);
      }
      resolve();
    }, progressiveTimeout);
    
    checkNetworkIdle();
  });
}

// Wait for content stability (useful for dynamic/lazy-loaded content)
async function waitForContentStability(timeout = 2000) {
  return new Promise(resolve => {
    let imageCount = document.querySelectorAll('img').length;
    let divCount = document.querySelectorAll('div').length;
    let stableChecks = 0;
    const requiredStableChecks = 3;
    
    const checkStability = () => {
      const newImageCount = document.querySelectorAll('img').length;
      const newDivCount = document.querySelectorAll('div').length;
      
      if (newImageCount === imageCount && newDivCount === divCount) {
        stableChecks++;
        if (stableChecks >= requiredStableChecks) {
          resolve();
          return;
        }
      } else {
        stableChecks = 0;
        imageCount = newImageCount;
        divCount = newDivCount;
      }
      
      setTimeout(checkStability, 300);
    };
    
    // Start stability checking
    setTimeout(checkStability, 300);
    
    // Fallback timeout
    setTimeout(() => {
      updateStatus('info', `Content stability timeout (${stableChecks}/${requiredStableChecks} stable checks)`);
      resolve();
    }, timeout);
  });
}

function cleanup() {
  // Clean up any global state
  seenHashes.clear();
  seenUrls.clear();
  
  if (hashWorker) {
    hashWorker.terminate();
    hashWorker = null;
  }
  
  // Remove any temporary elements
  document.querySelectorAll('.steptwo-scraper-sentinel').forEach(el => el.remove());
}

// Setup cleanup listeners to properly terminate workers on page unload
function setupCleanupListeners() {
  const cleanup = () => {
    try {
      // Clean up memory processor worker
      if (memoryProcessor && typeof memoryProcessor.destroy === 'function') {
        memoryProcessor.destroy();
        console.log('✅ Memory processor worker terminated');
      }
      
      // Clean up any active hash workers
      if (window.hashWorker) {
        window.hashWorker.terminate();
        window.hashWorker = null;
        console.log('✅ Hash worker terminated');
      }
      
      // Clean up perceptual duplicate detector workers
      if (window.perceptualDetector && typeof window.perceptualDetector.destroy === 'function') {
        window.perceptualDetector.destroy();
        console.log('✅ Perceptual detector workers terminated');
      }
      
      // Clear caches to free memory
      if (typeof seenHashes !== 'undefined') {seenHashes.clear();}
      if (typeof seenUrls !== 'undefined') {seenUrls.clear();}
      
      console.log('🧹 Scraper cleanup completed');
    } catch (_error) {
      console.warn('Cleanup error:', _error);
    }
  };
  
  // Add event listeners for page unload
  window.addEventListener('beforeunload', cleanup);
  window.addEventListener('unload', cleanup);
  
  // Also clean up when navigating away via history API
  window.addEventListener('pagehide', cleanup);
  
  // Store cleanup function globally for manual cleanup if needed
  window.stepTwoCleanup = cleanup;
  
  console.log('🔧 Cleanup listeners registered');
}

// Export functions for module usage
export { runScrape, handleInfiniteScroll, detectPageBottom, waitForNetworkIdle, waitForContentStability, setupCleanupListeners };

// Export functions to window object for testing
if (typeof window !== 'undefined') {
  window.runScrape = runScrape;
  window.handleInfiniteScroll = handleInfiniteScroll;
  window.detectPageBottom = detectPageBottom;
  window.waitForNetworkIdle = waitForNetworkIdle;
  window.waitForContentStability = waitForContentStability;
  window.scraperSettings = scraperSettings;
  window.setupCleanupListeners = setupCleanupListeners;
}