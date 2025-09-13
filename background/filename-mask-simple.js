// filename-mask-simple.js - Simplified filename mask for ES modules

function previewMask(mask, context = {}) {
  if (!mask) {
    return context.name || 'download';
  }
  
  const now = new Date();
  const dateStr = now.toISOString().slice(0,10).replace(/-/g,''); // YYYYMMDD
  const timeStr = now.toTimeString().slice(0,8).replace(/:/g,''); // HHMMSS
  
  let preview = mask;
  
  // Replace common tokens
  preview = preview.replace(/\*name\*/g, context.name || 'image');
  preview = preview.replace(/\*num\*/g, context.num || '001');
  preview = preview.replace(/\*ext\*/g, context.ext || 'jpg');
  preview = preview.replace(/\*date\*/g, dateStr);
  preview = preview.replace(/\*time\*/g, timeStr);
  preview = preview.replace(/\*host\*/g, context.host || 'example.com');
  
  return preview;
}

function getAvailableTokens() {
  return [
    { token: '*name*', description: 'Original filename or caption' },
    { token: '*num*', description: 'Sequential number' },
    { token: '*ext*', description: 'File extension' },
    { token: '*date*', description: 'Current date (YYYYMMDD)' },
    { token: '*time*', description: 'Current time (HHMMSS)' },
    { token: '*host*', description: 'Website hostname' }
  ];
}

function applyMask(mask, context) {
  return previewMask(mask, context);
}

function validateMask(mask) {
  if (!mask || typeof mask !== 'string') {
    return { valid: false, error: 'Mask must be a non-empty string' };
  }
  
  if (mask.length > 200) {
    return { valid: false, error: 'Mask too long (max 200 characters)' };
  }
  
  // Check for invalid filename characters
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
  if (invalidChars.test(mask.replace(/\*\w+\*/g, 'token'))) {
    return { valid: false, error: 'Mask contains invalid filename characters' };
  }
  
  return { valid: true };
}

function buildFilenameMask(options = {}) {
  const parts = [];
  
  if (options.includeOriginalName !== false) {
    parts.push('*name*');
  }
  
  if (options.includeNumber !== false) {
    parts.push('*num*');
  }
  
  const separator = options.separator || '-';
  const extension = '*ext*';
  
  return `${parts.join(separator)}.${extension}`;
}

function parseFilenameMask(mask) {
  const tokens = [];
  const tokenRegex = /\*(\w+)\*/g;
  let match;
  
  while ((match = tokenRegex.exec(mask)) !== null) {
    tokens.push(match[1]);
  }
  
  return {
    tokens,
    template: mask
  };
}

export { 
  previewMask, 
  getAvailableTokens, 
  applyMask, 
  validateMask, 
  buildFilenameMask, 
  parseFilenameMask 
};