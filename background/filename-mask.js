// filename-mask.js - Advanced mask parser with enhanced token support
// Tokens: *name*, *num*, *ext*, *date*, *time*, *host*, *subdirs*, *url*, *caption*, *id*, *resolution*
// Additional tokens: *timestamp*, *domain*, *path*, *query*, *hash*, *size*, *type*, *index*

let globalCounter = 0;
let siteCounters = {};
let sessionCounters = {};

function applyMask(mask, ctx) {
  if (!mask) {return ctx.name + (ctx.ext ? `.${  ctx.ext}` : '');}
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
  const timeStr = now.toTimeString().slice(0,8).replace(/:/g,''); // HHMMSS
  const timestamp = now.getTime().toString();
  
  // Get appropriate counter
  const siteKey = ctx.host || 'global';
  if (!siteCounters[siteKey]) {siteCounters[siteKey] = 0;}
  if (!sessionCounters[siteKey]) {sessionCounters[siteKey] = 0;}
  
  const counter = ctx.num || ++siteCounters[siteKey];
  const sessionCounter = ++sessionCounters[siteKey];
  globalCounter = Math.max(globalCounter, counter);
  
  let out = mask;
  const replace = (token, value) => { 
    out = out.replace(new RegExp(`\\*${token}\\*`,'gi'), sanitizeFilename(String(value || '')));
  };
  
  // Core tokens
  replace('name', ctx.name || 'untitled');
  replace('num', String(counter).padStart(3,'0'));
  replace('ext', ctx.ext || '');
  replace('date', dateStr);
  replace('time', timeStr);
  replace('timestamp', timestamp);
  replace('host', ctx.host || '');
  replace('domain', extractDomain(ctx.host || ctx.url || ''));
  replace('subdirs', parseSubdirs(ctx.subdirs || ctx.url || ''));
  
  // Enhanced URL parsing tokens
  if (ctx.url) {
    const urlParts = parseUrl(ctx.url);
    replace('url', ctx.url);
    replace('path', urlParts.path);
    replace('query', urlParts.query);
    replace('hash', urlParts.hash);
  } else {
    replace('url', '');
    replace('path', '');
    replace('query', '');
    replace('hash', '');
  }
  
  // Content-related tokens
  replace('caption', ctx.caption || ctx.alt || '');
  replace('id', ctx.id || ctx.productId || '');
  replace('resolution', ctx.resolution || ctx.dimensions || '');
  replace('size', ctx.size || ctx.fileSize || '');
  replace('type', ctx.type || ctx.fileType || '');
  replace('index', String(sessionCounter).padStart(3, '0'));
  
  // Date/time variants
  replace('yyyy', now.getFullYear());
  replace('mm', String(now.getMonth() + 1).padStart(2,'0'));
  replace('dd', String(now.getDate()).padStart(2,'0'));
  replace('hh', String(now.getHours()).padStart(2,'0'));
  replace('min', String(now.getMinutes()).padStart(2,'0'));
  replace('ss', String(now.getSeconds()).padStart(2,'0'));
  
  // Advanced date formats
  replace('monthname', now.toLocaleString('default', { month: 'long' }));
  replace('weekday', now.toLocaleString('default', { weekday: 'long' }));
  replace('quarter', Math.floor((now.getMonth() + 3) / 3));
  
  // Site-specific enhancements
  if (ctx.host) {
    const siteSpecific = getSiteSpecificTokens(ctx);
    Object.entries(siteSpecific).forEach(([token, value]) => {
      replace(token, value);
    });
  }
  
  return out;
}

function parseSubdirs(input) {
  if (!input) {return '';}
  
  try {
    let path;
    if (input.startsWith('http')) {
      const url = new URL(input);
      path = url.pathname;
    } else {
      path = input;
    }
    
    const segments = path.split('/').filter(s => s && s !== '.' && s !== '..');
    
    // Remove common segments that aren't useful
    const filtered = segments.filter(segment => 
      !segment.match(/^(images?|photos?|media|assets|static|content|gallery|thumb(nail)?s?)$/i)
    );
    
    // Limit to 3 most meaningful segments
    return filtered.slice(-3).join('_');
    
  } catch (_e) {
    return '';
  }
}

function extractDomain(hostOrUrl) {
  try {
    if (hostOrUrl.startsWith('http')) {
      return new URL(hostOrUrl).hostname;
    }
    return hostOrUrl.split('.').slice(-2).join('.');
  } catch (_e) {
    return hostOrUrl;
  }
}

function parseUrl(url) {
  try {
    const urlObj = new URL(url);
    return {
      path: urlObj.pathname.substring(1), // Remove leading slash
      query: urlObj.search.substring(1), // Remove leading ?
      hash: urlObj.hash.substring(1) // Remove leading #
    };
  } catch (_e) {
    return { path: '', query: '', hash: '' };
  }
}

function getSiteSpecificTokens(ctx) {
  const tokens = {};
  const host = ctx.host || '';
  
  // Getty Images specific
  if (host.includes('gettyimages')) {
    tokens.agency = 'getty';
    tokens.license = ctx.license || 'rf';
    if (ctx.id && ctx.id.match(/^\d+$/)) {
      tokens.stockid = ctx.id;
    }
  } else if (host.includes('shutterstock')) {
    tokens.agency = 'shutterstock';
    if (ctx.id && ctx.id.match(/^\d+$/)) {
      tokens.stockid = ctx.id;
    }
  } else if (host.includes('mirrorpix')) {
    tokens.agency = 'mirrorpix';
    tokens.archive = 'historical';
    if (ctx.id && ctx.id.match(/^\d+$/)) {
      tokens.archiveid = ctx.id;
    }
  } else if (host.includes('actionpress')) {
    tokens.agency = 'actionpress';
    tokens.country = 'de';
    if (ctx.id) {
      tokens.stockid = ctx.id.replace(/\./g, '_');
    }
  } else if (host.includes('imago-images')) {
    tokens.agency = 'imago';
    tokens.country = 'de';
    if (ctx.id && ctx.id.match(/^\d+$/)) {
      tokens.stockid = ctx.id;
    }
  }
  
  return tokens;
}

function sanitizeFilename(filename) {
  if (!filename) {return '';}
  
  // Replace problematic characters
  return filename
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 200); // Limit length
}

// Reset counters for new session (kept for API compatibility)
function _resetCounters() {
  sessionCounters = {};
}

// Get current counter values (kept for API compatibility)
function _getCounters() {
  return {
    global: globalCounter,
    sites: { ...siteCounters },
    session: { ...sessionCounters }
  };
}

// Set custom counter values (kept for API compatibility)
function _setCounters(counters) {
  if (counters.global !== undefined) {globalCounter = counters.global;}
  if (counters.sites) {siteCounters = { ...counters.sites };}
  if (counters.session) {sessionCounters = { ...counters.session };}
}

// Preview mask with sample data
function previewMask(mask, sampleCtx = {}) {
  const defaultCtx = {
    name: 'sample_image',
    ext: 'jpg',
    host: 'example.com',
    url: 'https://example.com/gallery/photos/sample_image.jpg',
    id: '12345',
    caption: 'Sample photo caption',
    resolution: '1920x1080',
    size: '2.5MB',
    type: 'JPEG',
    ...sampleCtx
  };
  
  return applyMask(mask, defaultCtx);
}

// Validate mask syntax (kept for API compatibility)
function _validateMask(mask) {
  const errors = [];
  const warnings = [];
  
  if (!mask) {
    errors.push('Mask cannot be empty');
    return { valid: false, errors, warnings };
  }
  
  // Check for valid tokens
  const tokens = mask.match(/\*\w+\*/g) || [];
  const validTokens = [
    'name', 'num', 'ext', 'date', 'time', 'timestamp', 'host', 'domain', 'subdirs',
    'url', 'path', 'query', 'hash', 'caption', 'id', 'resolution', 'size', 'type',
    'index', 'yyyy', 'mm', 'dd', 'hh', 'min', 'ss', 'monthname', 'weekday', 'quarter',
    'agency', 'license', 'stockid', 'archiveid', 'country'
  ];
  
  tokens.forEach(token => {
    const tokenName = token.slice(1, -1);
    if (!validTokens.includes(tokenName)) {
      warnings.push(`Unknown token: ${token}`);
    }
  });
  
  // Check for problematic characters
  const problematic = mask.match(/[<>:"/\\|?*]/g);
  if (problematic) {
    warnings.push(`Contains characters that may cause issues: ${[...new Set(problematic)].join(', ')}`);
  }
  
  // Check if extension token is used properly
  if (mask.includes('*ext*') && !mask.includes('.*ext*') && !mask.endsWith('*ext*')) {
    warnings.push('Extension token should typically be preceded by a dot or at the end');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    tokens: tokens.length,
    preview: errors.length === 0 ? previewMask(mask) : null
  };
}

