// site-profiles.js - Site-specific scraping profiles for enhanced compatibility
// Based on research from gallery-scraper-extension

const SITE_PROFILES = {
  'gettyimages.com': {
    name: 'Getty Images Professional',
    selectors: {
      imageContainer: '[data-testid="gallery-mosaic-asset"], .gallery-asset, .search-result',
      imageElement: 'img[data-testid="gallery-mosaic-asset-image"], img.gallery-mosaic-asset__image, .gallery-asset img',
      linkElement: 'a[data-testid="gallery-mosaic-asset-link"], .gallery-asset a, a[href*="/detail/"]',
      nextPageButton: '[data-testid="pagination-next-button"], .next-page, a[aria-label*="next" i]'
    },
    waitSettings: {
      pageLoad: 8000,
      scrollDelay: 1500,
      afterScroll: 3000
    },
    scrollBehavior: {
      type: 'smooth',
      maxAttempts: 20,
      scrollDistance: 800
    },
    special: {
      infiniteScroll: true,
      lazyLoad: true,
      requiresAuth: false,
      highQualityPreviews: true,
      pathBasedPagination: true
    },
    urlPatterns: {
      search: '/search/',
      detail: '/detail/',
      photo: '/photo/',
      newsPhoto: '/news-photo/',
      pagination: /[?&]page=/
    },
    urlTransforms: {
      // Search URLs like https://www.gettyimages.co.uk/search/2/image?phrase=banana&page=50
      searchUrls: {
        pattern: /\/search\/\d+\/image\?phrase=([^&]+)/,
        preservePhrase: true
      },
      // Detail page URLs like https://www.gettyimages.co.uk/detail/photo/chubby-woman-is-leaning-against-the-kitchen-counter-royalty-free-image/2195676586
      detailPages: {
        pattern: /\/detail\/(photo|news-photo)\/[^\/]+\/(\d+)/,
        type: 'product'
      },
      // Pagination in search results
      paginationUrls: {
        pattern: /[?&]page=(\d+)/,
        type: 'pagination'
      }
    }
  },

  'gettyimages.co.uk': {
    name: 'Getty Images UK',
    extends: 'gettyimages.com' // Inherit all settings from parent
  },

  'shutterstock.com': {
    name: 'Shutterstock',
    selectors: {
      imageContainer: '[data-automation="mosaic-grid-cell"]',
      imageElement: 'img[data-automation="mosaic-grid-cell-image"]',
      linkElement: 'a[data-automation="mosaic-grid-cell-overlay"]',
      nextPageButton: '[data-automation="pagination-next-button"]'
    },
    waitSettings: {
      pageLoad: 4000,
      scrollDelay: 800,
      afterScroll: 1500
    },
    scrollBehavior: {
      type: 'smooth',
      maxAttempts: 15,
      scrollDistance: 600
    },
    special: {
      infiniteScroll: true,
      lazyLoad: true,
      requiresAuth: false,
      modernReactFramework: true
    }
  },

  'unsplash.com': {
    name: 'Unsplash',
    selectors: {
      imageContainer: '[data-test="photo-tile"]',
      imageElement: 'img[srcset*="ixlib"]',
      linkElement: 'a[title]',
      nextPageButton: 'a[aria-label="Next"]'
    },
    waitSettings: {
      pageLoad: 3000,
      scrollDelay: 1000,
      afterScroll: 2000
    },
    scrollBehavior: {
      type: 'smooth',
      maxAttempts: 25,
      scrollDistance: 1000
    },
    special: {
      infiniteScroll: true,
      lazyLoad: true,
      requiresAuth: false,
      highResolution: true
    }
  },

  'mirrorpix.com': {
    name: 'MirrorPix Historical Archives',
    selectors: {
      imageContainer: 'img.medium-thumbnail, img[id^="medium__"], .offer-image img, .gallery-item img, .image-container img, .thumbnail-container img, [class*="thumb"] img, [class*="image"] img',
      imageElement: 'img.medium-thumbnail, img[id^="medium__"], .offer-image img, .gallery-item img, .image-container img, .thumbnail-container img, [class*="thumb"] img, [class*="image"] img',
      linkElement: 'a:has(img.medium-thumbnail), img.medium-thumbnail[onclick], .offer-image a, .gallery-item a, .image-container a, a[href*="offer/"], a[href*="image/"], a[href*="id/"]',
      nextPageButton: '.pagination .next, .pagination-next, [href*="page="], .nav-next, .next-page, [aria-label*="next" i], [href*="PAGING_SCOPE_1="]'
    },
    waitSettings: {
      pageLoad: 12000,
      scrollDelay: 2500,
      afterScroll: 5000
    },
    scrollBehavior: {
      type: 'incremental',
      maxAttempts: 15,
      scrollDistance: 600
    },
    special: {
      infiniteScroll: false,
      requiresAuth: true,
      jqueryUI: true,
      historicalArchive: true,
      phpThumbnails: true,
      offerPages: true,
      multiplePageTypes: true
    },
    urlPatterns: {
      offer: '/offer/',
      search: '/search',
      gallery: '/gallery',
      image: '/image',
      id: '/id/',
      paging: 'PAGING_SCOPE_1=',
      dynamic: /\?\d{17,}/  // Match dynamic session IDs like ?17422710581083042885
    },
    urlTransforms: {
      // Transform URLs and handle dynamic content
      // Note: PHP thumbnail system removed as per requirements
      // Handle dynamic search URLs
      searchUrls: {
        // URLs like https://www.mirrorpix.com/?17422710581083042885
        pattern: /\?\d{17,}/,
        preserveSearch: true
      },
      // Product page URLs like https://www.mirrorpix.com/id/02004766
      productPages: {
        pattern: /\/id\/(\d+)/,
        type: 'product'
      }
    }
  },

  'actionpress.de': {
    name: 'ActionPress German Photo Agency',
    selectors: {
      imageContainer: '.gallery-item, .search-result-item, .media-item, .image-container',
      imageElement: '.gallery-item img, .search-result-item img, .media-item img, .image-container img',
      linkElement: '.gallery-item a, .search-result-item a, .media-item a, .image-container a, a[href*="/id/"]',
      nextPageButton: '.next-page, .pagination-next, [href*="PAGING_SCOPE_1="], [aria-label*="next" i]'
    },
    waitSettings: {
      pageLoad: 5500,
      scrollDelay: 1200,
      afterScroll: 2200
    },
    scrollBehavior: {
      type: 'incremental',
      maxAttempts: 15,
      scrollDistance: 600
    },
    special: {
      requiresAuth: true,
      germanLanguage: true,
      professionalAgency: true,
      dynamicPagination: true,
      postBasedRequests: true
    },
    urlPatterns: {
      dynamic: /\?\d{17,}/,  // Match dynamic session IDs like ?17612161895857215350 (check first)
      product: '/id/',
      paging: 'PAGING_SCOPE_1=',
      mediagroup: 'MEDIAGROUP=',
      search: '/'  // Match this last as it's very broad
    },
    urlTransforms: {
      // Product page URLs like https://www.actionpress.de/id/9.00125892
      productPages: {
        pattern: /\/id\/([\d.]+)/,
        type: 'product'
      },
      // Dynamic search URLs with session IDs
      searchUrls: {
        pattern: /\?\d{17,}/,
        preserveSearch: true
      },
      // Pagination URLs with complex parameters
      paginationUrls: {
        pattern: /PAGING_SCOPE_1=(\d+)/,
        type: 'pagination'
      }
    }
  },

  'news-images.smartframe.io': {
    name: 'SmartFrame News',
    selectors: {
      imageContainer: '.sf-grid-item',
      imageElement: '.sf-grid-item img, iframe img',
      linkElement: '.sf-grid-item a',
      nextPageButton: '.sf-pagination-next'
    },
    waitSettings: {
      pageLoad: 7000,
      scrollDelay: 1500,
      afterScroll: 3000
    },
    scrollBehavior: {
      type: 'smooth',
      maxAttempts: 12,
      scrollDistance: 700
    },
    special: {
      embeddedImages: true,
      slowLoading: true,
      smartFrameTech: true
    }
  },

  'archive.newsimages.co.uk': {
    name: 'News Images Archive',
    extends: 'news-images.smartframe.io'
  },

  'imago-images.com': {
    name: 'Imago Images International',
    selectors: {
      imageContainer: '.search-result, .media-item, .gallery-item, .image-container',
      imageElement: '.search-result img, .media-item img, .gallery-item img, .image-container img',
      linkElement: '.search-result a, .media-item a, .gallery-item a, .image-container a, a[href*="/st/"]',
      nextPageButton: '.pagination-next, .next-page, [aria-label*="next" i], .load-more'
    },
    waitSettings: {
      pageLoad: 5000,
      scrollDelay: 1000,
      afterScroll: 2000
    },
    scrollBehavior: {
      type: 'incremental',
      maxAttempts: 15,
      scrollDistance: 600
    },
    special: {
      requiresAuth: true,
      germanLanguage: true,
      sportsNews: true,
      highQuality: true,
      dynamicLoading: true
    },
    urlPatterns: {
      search: '/search',
      product: '/st/',
      searchWithQuery: /search\?querystring=/
    },
    urlTransforms: {
      // Product page URLs like https://www.imago-images.com/st/0805613303
      productPages: {
        pattern: /\/st\/(\d+)/,
        type: 'product'
      },
      // Search with querystring like https://www.imago-images.com/search?querystring=Banana
      searchUrls: {
        pattern: /search\?querystring=([^&]+)/,
        preserveQuery: true
      },
      // URLs with search ID like https://www.imago-images.com/st/0471164369?searchID=a2ec6868-de3f-4a16-b562-a62b973d65cf
      searchIdUrls: {
        pattern: /searchID=([a-f0-9-]+)/,
        preserveSearchId: true
      }
    }
  }
};

// Universal fallback selectors for unknown sites
const UNIVERSAL_SELECTORS = {
  imageContainer: [
    '[data-testid*="image"], [data-testid*="photo"], [data-testid*="gallery"]',
    '.gallery-item img, .search-result img, .thumbnail img',
    '.image-container img, .photo-container img, .media-item img',
    '.thumbnail, .thumb, .preview, .gallery-image',
    'figure img, .figure img, picture img',
    '.grid-item img, .tile img, .card img',
    'img[src*="thumb"], img[src*="preview"], img[alt*="photo"]',
    // MirrorPix-style patterns for historical archive sites
    '.offer-image img, .offer-gallery img, .offer-content img',
    'img[src*="offer"], img[src*="medium"], img[id*="medium"]',
    'img.medium-thumbnail, img[class*="thumbnail"]'
  ],
  nextPageButton: [
    '[aria-label*="next" i], [aria-label*="següent" i]',
    '.next, .next-page, .pagination-next',
    'a[rel="next"], [href*="page="]',
    '.pager-next, .nav-next',
    // MirrorPix-style pagination patterns
    '.pagination .next, .pagination-next',
    '[href*="offer/"], [href*="page="], [href*="p="]'
  ]
};

function detectSiteProfile(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const pathname = urlObj.pathname.toLowerCase();
    const searchParams = urlObj.search.substring(1); // Remove the '?' prefix
    
    // Remove www prefix for matching
    const cleanHostname = hostname.replace(/^www\./, '');
    
    // Direct domain matching
    for (const domain in SITE_PROFILES) {
      if (cleanHostname === domain || cleanHostname.endsWith(`.${  domain}`)) {
        const profile = resolvProfileChain(SITE_PROFILES[domain], domain);
        
        // Enhanced URL pattern detection for specific page types
        if (profile && profile.urlPatterns) {
          profile.detectedPageType = detectPageType(pathname, profile.urlPatterns, searchParams);
          profile.originalUrl = url;
          profile.detectedHostname = cleanHostname;
          
          // Apply URL transforms if available
          if (profile.urlTransforms) {
            profile.urlInfo = analyzeUrl(url, profile.urlTransforms);
          }
          
          // Apply page-type specific enhancements
          if (domain === 'mirrorpix.com' && profile.detectedPageType) {
            const enhanced = enhanceMirrorPixProfile(profile, profile.detectedPageType, pathname);
            Object.assign(profile, enhanced);
          } else if (domain === 'actionpress.de' && profile.detectedPageType) {
            const enhanced = enhanceActionPressProfile(profile, profile.detectedPageType, pathname);
            Object.assign(profile, enhanced);
          } else if (domain === 'imago-images.com' && profile.detectedPageType) {
            const enhanced = enhanceImagoProfile(profile, profile.detectedPageType, pathname, searchParams);
            Object.assign(profile, enhanced);
          }
        }
        
        return profile;
      }
    }
    
    // Subdomain matching for known patterns
    for (const domain in SITE_PROFILES) {
      if (cleanHostname.includes(domain.split('.')[0])) {
        const profile = resolvProfileChain(SITE_PROFILES[domain], domain);
        
        // Apply same page type detection for subdomains
        if (profile && profile.urlPatterns) {
          profile.detectedPageType = detectPageType(pathname, profile.urlPatterns, searchParams);
          profile.originalUrl = url;
          profile.detectedHostname = cleanHostname;
          
          if (profile.urlTransforms) {
            profile.urlInfo = analyzeUrl(url, profile.urlTransforms);
          }
          
          if (domain === 'mirrorpix.com' && profile.detectedPageType) {
            const enhanced = enhanceMirrorPixProfile(profile, profile.detectedPageType, pathname);
            Object.assign(profile, enhanced);
          } else if (domain === 'actionpress.de' && profile.detectedPageType) {
            const enhanced = enhanceActionPressProfile(profile, profile.detectedPageType, pathname);
            Object.assign(profile, enhanced);
          } else if (domain === 'imago-images.com' && profile.detectedPageType) {
            const enhanced = enhanceImagoProfile(profile, profile.detectedPageType, pathname, searchParams);
            Object.assign(profile, enhanced);
          }
        }
        
        return profile;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[STEPTWO] Profile detection error:', error);
    return null;
  }
}

function detectPageType(pathname, urlPatterns, searchParams = '') {
  const fullUrl = pathname + (searchParams ? `?${  searchParams}` : '');
  
  for (const [pageType, pattern] of Object.entries(urlPatterns)) {
    if (typeof pattern === 'string') {
      if (fullUrl.includes(pattern)) {
        return pageType;
      }
    } else if (pattern instanceof RegExp) {
      if (pattern.test(fullUrl)) {
        return pageType;
      }
    }
  }
  return 'default';
}

function analyzeUrl(url, urlTransforms) {
  const urlInfo = {
    originalUrl: url,
    type: 'default',
    metadata: {}
  };
  
  for (const [transformName, transform] of Object.entries(urlTransforms)) {
    if (transform.pattern && transform.pattern.test && transform.pattern.test(url)) {
      const match = url.match(transform.pattern);
      if (match) {
        urlInfo[transformName] = {
          matched: true,
          groups: match,
          type: transform.type || transformName
        };
        
        if (transform.type) {
          urlInfo.type = transform.type;
        }
        
        // Extract specific metadata based on transform type
        if (transformName === 'productPages') {
          urlInfo.metadata.productId = match[1];
        } else if (transformName === 'searchUrls') {
          urlInfo.metadata.searchQuery = match[1];
        } else if (transformName === 'paginationUrls') {
          urlInfo.metadata.pageNumber = match[1];
        }
      }
    }
  }
  
  return urlInfo;
}

function enhanceActionPressProfile(profile, pageType, pathname) {
  const enhanced = { ...profile };
  
  switch (pageType) {
    case 'dynamic':
      // Handle dynamic search URLs with session IDs
      enhanced.special = {
        ...enhanced.special,
        dynamicSessionDetected: true,
        requiresSpecialHandling: true
      };
      break;
      
    case 'paging':
      // Handle pagination with complex parameters
      enhanced.special = {
        ...enhanced.special,
        complexPagination: true,
        postBasedPagination: true
      };
      break;
      
    case 'product':
      // Product page enhancements
      enhanced.selectors = {
        ...enhanced.selectors,
        imageElement: `.product-image img, .detail-image img, ${  enhanced.selectors.imageElement}`
      };
      break;
  }
  
  return enhanced;
}

function enhanceImagoProfile(profile, pageType, pathname, searchParams) {
  const enhanced = { ...profile };
  
  switch (pageType) {
    case 'search':
      // Handle search pages with querystring parameter
      enhanced.special = {
        ...enhanced.special,
        searchPageDetected: true,
        preserveQueryString: true
      };
      break;
      
    case 'product':
      // Product page specific enhancements
      enhanced.selectors = {
        ...enhanced.selectors,
        imageElement: `.product-preview img, .large-image img, ${  enhanced.selectors.imageElement}`,
        linkElement: `.download-link, .high-res-link, ${  enhanced.selectors.linkElement}`
      };
      
      // Extract product ID from pathname
      const productMatch = pathname.match(/\/st\/(\d+)/);
      if (productMatch) {
        enhanced.metadata = {
          ...enhanced.metadata,
          productId: productMatch[1]
        };
      }
      break;
      
    case 'searchWithQuery':
      // Handle search URLs with preserved query parameters
      enhanced.special = {
        ...enhanced.special,
        queryStringSearch: true,
        preserveSearchQuery: true
      };
      break;
  }
  
  // Handle search ID preservation
  if (searchParams.includes('searchID=')) {
    enhanced.special = {
      ...enhanced.special,
      hasSearchId: true,
      preserveSearchId: true
    };
  }
  
  return enhanced;
}

function enhanceMirrorPixProfile(profile, pageType, pathname) {
  const enhanced = { ...profile };
  
  switch (pageType) {
    case 'offer':
      // Enhanced selectors for MirrorPix offer pages
      enhanced.selectors = {
        ...enhanced.selectors,
        imageContainer: `.offer-image img, .offer-gallery img, .offer-content img, img[src*="offer"], img[src*="medium"], img[src*="thumb"], ${  enhanced.selectors.imageContainer}`,
        imageElement: `.offer-image img, .offer-gallery img, .offer-content img, img[src*="offer"], img[src*="medium"], img[src*="thumb"], ${  enhanced.selectors.imageElement}`,
        linkElement: `a[href*="offer/"], .offer-link, .offer-image a, ${  enhanced.selectors.linkElement}`
      };
      
      // Longer wait times for offer pages as they may be more complex
      enhanced.waitSettings = {
        ...enhanced.waitSettings,
        pageLoad: enhanced.waitSettings.pageLoad + 3000,
        afterScroll: enhanced.waitSettings.afterScroll + 1000
      };
      
      enhanced.special = {
        ...enhanced.special,
        offerPageDetected: true,
        customWaitTime: true
      };
      break;
      
    case 'dynamic':
      // Handle dynamic search URLs with session IDs like ?17422710581083042885
      enhanced.special = {
        ...enhanced.special,
        dynamicSessionDetected: true,
        requiresSpecialHandling: true,
        preserveSessionId: true
      };
      break;
      
    case 'paging':
      // Handle pagination with PAGING_SCOPE_1 parameters
      enhanced.special = {
        ...enhanced.special,
        complexPagination: true,
        pagingScopeDetected: true
      };
      break;
      
    case 'id':
    case 'product':
      // Product page enhancements for URLs like /id/02004766
      enhanced.selectors = {
        ...enhanced.selectors,
        imageElement: `.product-image img, .detail-image img, .full-image img, ${  enhanced.selectors.imageElement}`,
        linkElement: `.download-link, .full-res-link, ${  enhanced.selectors.linkElement}`
      };
      
      // Extract product ID from pathname
      const productMatch = pathname.match(/\/id\/(\d+)/);
      if (productMatch) {
        enhanced.metadata = {
          ...enhanced.metadata,
          productId: productMatch[1]
        };
      }
      break;
      
    case 'search':
      // Standard search result handling
      enhanced.special = {
        ...enhanced.special,
        searchPageDetected: true
      };
      break;
      
    case 'gallery':
      // Gallery-specific enhancements
      enhanced.scrollBehavior = {
        ...enhanced.scrollBehavior,
        maxAttempts: enhanced.scrollBehavior.maxAttempts + 5
      };
      break;
  }
  
  return enhanced;
}

function resolvProfileChain(profile, domain) {
  if (!profile.extends) {
    return { ...profile, domain };
  }
  
  const parent = SITE_PROFILES[profile.extends];
  if (!parent) {
    console.warn(`[STEPTWO] Profile extends missing parent: ${profile.extends}`);
    return { ...profile, domain };
  }
  
  // Merge parent profile with current profile
  const resolved = {
    name: profile.name || parent.name,
    selectors: { ...parent.selectors, ...profile.selectors },
    waitSettings: { ...parent.waitSettings, ...profile.waitSettings },
    scrollBehavior: { ...parent.scrollBehavior, ...profile.scrollBehavior },
    special: { ...parent.special, ...profile.special },
    domain
  };
  
  return resolved;
}

function mergeWithUserSettings(profile, userSettings = {}) {
  if (!profile) {return userSettings;}
  
  return {
    selectors: {
      ...profile.selectors,
      ...userSettings.selectors
    },
    waitSettings: {
      ...profile.waitSettings,
      maxWait: userSettings.maxWait || profile.waitSettings.pageLoad,
      scrollDelay: userSettings.scrollDelay || profile.waitSettings.scrollDelay
    },
    scrollBehavior: {
      ...profile.scrollBehavior,
      ...userSettings.scrollBehavior
    },
    special: {
      ...profile.special,
      ...userSettings.special
    },
    profile: profile.name,
    autoDetected: true
  };
}

function getProfileList() {
  return Object.keys(SITE_PROFILES).map(domain => ({
    domain,
    name: SITE_PROFILES[domain].name,
    requiresAuth: SITE_PROFILES[domain].special?.requiresAuth || false,
    extends: SITE_PROFILES[domain].extends
  }));
}

// Support both ES modules and legacy importScripts
export { 
  SITE_PROFILES,
  UNIVERSAL_SELECTORS, 
  detectSiteProfile, 
  mergeWithUserSettings, 
  getProfileList 
};

// Export for importScripts compatibility
if (typeof self !== 'undefined') {
  self.SITE_PROFILES = SITE_PROFILES;
  self.UNIVERSAL_SELECTORS = UNIVERSAL_SELECTORS;
  self.detectSiteProfile = detectSiteProfile;
  self.mergeWithUserSettings = mergeWithUserSettings;
  self.getProfileList = getProfileList;
}