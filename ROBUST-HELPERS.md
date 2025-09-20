# Robust Helpers Documentation

The `RobustHelpers` class provides a comprehensive set of utility functions for reliable web scraping operations. These helpers are designed to handle the complexities and inconsistencies of modern web pages.

## Core Features

### Enhanced Element Selection
- **waitForSelector**: Robust element waiting with multiple fallback strategies
- **Element visibility detection**: Comprehensive visibility checking
- **Element interaction validation**: Ensures elements are clickable/interactive

### Advanced Image Gathering
- **Multi-source detection**: Finds images from various sources (src, data-src, background-image)
- **URL normalization**: Handles relative URLs, protocol conversion, and validation
- **Metadata extraction**: Captures image dimensions, alt text, and custom attributes
- **Deduplication**: Removes duplicate images based on normalized URLs

### URL Processing
- **Protocol normalization**: Converts HTTP to HTTPS when requested
- **Relative URL resolution**: Properly resolves relative paths
- **Query parameter handling**: Options for sorting, removing parameters
- **Fragment management**: Control over URL fragments

### Utility Functions
- **Performance monitoring**: Built-in timing for operations
- **Click simulation**: Multiple click strategies with retry logic
- **Text extraction**: Robust text content extraction with fallbacks
- **Sleep utilities**: Promise-based delays

## API Reference

### waitForSelector(selectors, options)

Enhanced element waiting with multiple strategies.

```javascript
// Single selector
const element = await RobustHelpers.waitForSelector('#my-element', {
  timeout: 5000,
  visible: true,
  retries: 3
});

// Multiple selectors (fallback)
const element = await RobustHelpers.waitForSelector([
  '#primary-selector',
  '.fallback-selector',
  'div[data-role="target"]'
], {
  timeout: 10000,
  throwOnTimeout: true
});
```

**Options:**
- `timeout` (default: 10000): Maximum wait time in milliseconds
- `interval` (default: 100): Check interval in milliseconds
- `visible` (default: true): Require element to be visible
- `enabled` (default: true): Require element to be enabled
- `multiple` (default: false): Return all matching elements
- `retries` (default: 3): Number of retry attempts
- `throwOnTimeout` (default: true): Throw error on timeout
- `context` (default: document): Search context

### gatherImages(options)

Comprehensive image gathering from the current page.

```javascript
const images = await RobustHelpers.gatherImages({
  minWidth: 200,
  minHeight: 150,
  formats: ['jpg', 'png', 'webp'],
  includeMetadata: true,
  deduplicateUrls: true
});
```

**Options:**
- `selectors`: Array of CSS selectors to search
- `minWidth/minHeight`: Minimum image dimensions
- `formats`: Allowed image formats
- `includeThumbnails`: Include thumbnail URLs
- `includeMetadata`: Extract image metadata
- `deduplicateUrls`: Remove duplicate URLs
- `resolveUrls`: Normalize and resolve URLs
- `validateImages`: Validate image URLs

### normalizeUrl(url, options)

Comprehensive URL normalization and validation.

```javascript
const normalized = RobustHelpers.normalizeUrl('//example.com/image.jpg', {
  forceHttps: true,
  removeQueryParams: false,
  removeFragment: true
});
```

**Options:**
- `forceHttps`: Convert HTTP to HTTPS
- `removeQueryParams`: Remove all query parameters
- `sortQueryParams`: Sort query parameters alphabetically
- `removeFragment`: Remove URL fragment
- `removeTrailingSlash`: Remove trailing slash from paths
- `allowDataUrls`: Allow data: URLs

### clickElement(element, options)

Robust element clicking with multiple strategies.

```javascript
const success = await RobustHelpers.clickElement(element, {
  retries: 3,
  scrollIntoView: true,
  waitAfterScroll: 300,
  clickStrategies: ['click', 'dispatchEvent', 'mouseEvents']
});
```

### extractText(element, options)

Enhanced text extraction with fallbacks.

```javascript
const text = RobustHelpers.extractText(element, {
  trim: true,
  maxLength: 100,
  preserveLineBreaks: false,
  fallbackToTitle: true,
  fallbackToAlt: true
});
```

### monitorPerformance(operation, function)

Performance monitoring for operations.

```javascript
const result = await RobustHelpers.monitorPerformance('Image Processing', async () => {
  // Your operation here
  return processImages();
});
```

## Utility Functions

### isElementVisible(element)
Checks if an element is visible on the page.

### isElementEnabled(element)
Checks if an element is enabled and interactive.

### isValidImageUrl(url, formats)
Validates if a URL points to an image.

### extractUrlsFromCssValue(cssValue)
Extracts URLs from CSS property values.

### getImageDimensions(url)
Gets natural dimensions of an image.

### sleep(ms)
Promise-based sleep utility.

## Integration

The RobustHelpers are automatically integrated into existing extension modules:

- **scraper.js**: Uses enhanced image gathering and URL normalization
- **macro-system.js**: Uses robust waitForSelector for element detection
- **background-utilities.js**: Includes URL normalization utilities

All integration maintains backward compatibility while providing enhanced functionality when RobustHelpers is available.

## Error Handling

All methods include comprehensive error handling:
- Graceful fallbacks for unsupported features
- Detailed error messages for debugging
- Non-blocking failures where appropriate
- Performance monitoring for optimization

## Browser Compatibility

- Chrome Extension Manifest V3 compatible
- Works in content script and web page contexts
- No external dependencies
- Modern JavaScript features with fallbacks