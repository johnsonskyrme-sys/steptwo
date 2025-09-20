# RobustHelpers Integration Guide

This guide explains how to integrate the RobustHelpers utilities into existing modules and new development.

## Quick Start

The RobustHelpers class is automatically loaded as a content script and available globally:

```javascript
// Check if RobustHelpers is available
if (window.RobustHelpers) {
  // Use enhanced functionality
  const element = await RobustHelpers.waitForSelector('#my-element');
} else {
  // Fallback to basic functionality
  const element = document.querySelector('#my-element');
}
```

## Integration Patterns

### 1. Enhanced Element Selection

Replace basic `querySelector` with robust waiting:

**Before:**
```javascript
const element = document.querySelector('#target');
if (element) {
  element.click();
}
```

**After:**
```javascript
if (window.RobustHelpers) {
  try {
    const element = await RobustHelpers.waitForSelector('#target', {
      timeout: 5000,
      visible: true,
      retries: 3
    });
    await RobustHelpers.clickElement(element);
  } catch (error) {
    console.warn('Enhanced selection failed:', error);
  }
} else {
  // Fallback to original implementation
  const element = document.querySelector('#target');
  if (element) {
    element.click();
  }
}
```

### 2. Image Gathering Enhancement

Replace manual image detection with comprehensive gathering:

**Before:**
```javascript
const images = Array.from(document.querySelectorAll('img[src]')).map(img => ({
  url: img.src,
  alt: img.alt
}));
```

**After:**
```javascript
let images = [];
if (window.RobustHelpers) {
  images = await RobustHelpers.gatherImages({
    minWidth: 100,
    minHeight: 100,
    includeMetadata: true,
    deduplicateUrls: true
  });
} else {
  // Fallback to basic implementation
  images = Array.from(document.querySelectorAll('img[src]')).map(img => ({
    url: img.src,
    alt: img.alt
  }));
}
```

### 3. URL Processing

Replace manual URL handling with robust normalization:

**Before:**
```javascript
function resolveUrl(url) {
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return null;
  }
}
```

**After:**
```javascript
function resolveUrl(url) {
  if (window.RobustHelpers) {
    return RobustHelpers.normalizeUrl(url, {
      forceHttps: true,
      removeQueryParams: false
    });
  } else {
    // Fallback to basic implementation
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return null;
    }
  }
}
```

## Advanced Integration Examples

### Multiple Element Detection

```javascript
// Search for pagination elements with fallbacks
const paginationElements = await RobustHelpers.waitForMultipleElements({
  nextButton: ['.next-page', '.btn-next', 'a[aria-label*="next"]'],
  loadMore: ['.load-more', '.show-more', 'button[data-action="load"]'],
  pagination: ['.pagination', '.pager', '.page-nav']
}, {
  timeout: 5000,
  simultaneousSearch: true
});

if (paginationElements.nextButton) {
  await RobustHelpers.clickElement(paginationElements.nextButton);
} else if (paginationElements.loadMore) {
  await RobustHelpers.clickElement(paginationElements.loadMore);
}
```

### Smart Content Detection

```javascript
// Detect image gallery elements intelligently
const galleryElements = await RobustHelpers.smartElementDetection({
  minScore: 0.8,
  contentAnalysis: true,
  includeInvisible: false
});

const bestCandidates = galleryElements.slice(0, 5); // Top 5 matches
for (const candidate of bestCandidates) {
  console.log(`Found element with score ${candidate.score}:`, candidate.element);
}
```

### Form Automation

```javascript
// Fill and submit forms robustly
const formResult = await RobustHelpers.fillForm({
  username: 'myuser',
  password: 'mypass',
  email: 'user@example.com'
}, {
  validateAfterFill: true,
  submitAfterFill: true,
  waitBetweenFields: 200
});

if (formResult.success) {
  console.log(`Successfully filled ${formResult.filledFields.length} fields`);
} else {
  console.error('Form filling errors:', formResult.errors);
}
```

### Batch Processing

```javascript
// Process multiple images in batches
const allImages = document.querySelectorAll('img');
const processedImages = await RobustHelpers.batchProcess(
  Array.from(allImages),
  async (img, index) => {
    const dimensions = await RobustHelpers.getImageDimensions(img.src);
    return {
      index,
      src: img.src,
      dimensions,
      metadata: await RobustHelpers.extractImageMetadata(img, img.src)
    };
  },
  {
    batchSize: 3,
    delayBetweenBatches: 500,
    continueOnError: true
  }
);
```

## Performance Monitoring

Wrap operations with performance monitoring:

```javascript
const result = await RobustHelpers.monitorPerformance('Image Processing', async () => {
  const images = await RobustHelpers.gatherImages({
    minWidth: 200,
    includeMetadata: true
  });
  
  return await RobustHelpers.batchProcess(images, async (img) => {
    return await processImage(img);
  });
});
```

## Error Handling Best Practices

### 1. Graceful Degradation

Always provide fallbacks when RobustHelpers is not available:

```javascript
async function robustOperation() {
  if (window.RobustHelpers) {
    try {
      return await enhancedOperation();
    } catch (error) {
      console.warn('Enhanced operation failed, falling back:', error);
      return await basicOperation();
    }
  } else {
    return await basicOperation();
  }
}
```

### 2. Timeout Handling

Configure appropriate timeouts for different scenarios:

```javascript
// Quick check - short timeout
const quickElement = await RobustHelpers.waitForSelector('.quick-element', {
  timeout: 1000,
  throwOnTimeout: false
});

// Critical element - longer timeout with retries
const criticalElement = await RobustHelpers.waitForSelector('.critical-element', {
  timeout: 10000,
  retries: 5,
  throwOnTimeout: true
});
```

### 3. Validation

Validate results before proceeding:

```javascript
const images = await RobustHelpers.gatherImages();
const validImages = images.filter(img => 
  RobustHelpers.validateImageData(img, {
    minWidth: 100,
    minHeight: 100,
    formats: ['jpg', 'png', 'webp']
  })
);
```

## Module Integration Checklist

When integrating RobustHelpers into a new module:

- [ ] Add availability check: `if (window.RobustHelpers)`
- [ ] Implement fallback for when RobustHelpers is not available
- [ ] Use appropriate timeouts for the use case
- [ ] Add error handling with graceful degradation
- [ ] Use performance monitoring for critical operations
- [ ] Test both enhanced and fallback modes
- [ ] Update documentation with new capabilities

## Testing Integration

Test your integration with and without RobustHelpers:

```javascript
// Test enhanced mode
if (window.RobustHelpers) {
  console.log('Testing with RobustHelpers...');
  await testEnhancedFunctionality();
}

// Test fallback mode
const originalRobustHelpers = window.RobustHelpers;
window.RobustHelpers = null;
console.log('Testing fallback mode...');
await testBasicFunctionality();
window.RobustHelpers = originalRobustHelpers;
```

## Common Patterns

### Pagination Handler Integration
```javascript
// In pagination detection
const paginationStrategy = await this.detectPaginationStrategy();
if (window.RobustHelpers && paginationStrategy.elements.length === 0) {
  // Use smart detection as fallback
  const candidates = await RobustHelpers.smartElementDetection({
    minScore: 0.6,
    contentAnalysis: true
  });
  // Process candidates...
}
```

### Selector System Integration
```javascript
// In adaptive selector system
testSelector(selector, context = document) {
  if (window.RobustHelpers) {
    // Enhanced testing with visibility validation
    const elements = Array.from(context.querySelectorAll(selector));
    return elements.filter(el => RobustHelpers.isElementVisible(el));
  } else {
    // Basic testing
    return Array.from(context.querySelectorAll(selector));
  }
}
```

This integration guide ensures that all modules can benefit from RobustHelpers while maintaining compatibility with systems that don't have it loaded.