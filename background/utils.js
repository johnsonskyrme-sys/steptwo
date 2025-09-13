// utils.js - Common utilities as ES module

// Utility class for common operations
class StepTwoUtils {
  // URL validation and parsing
  static isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  static getHostname(url) {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }
  
  static getFileExtension(url) {
    try {
      const pathname = new URL(url).pathname;
      const ext = pathname.split('.').pop().toLowerCase();
      return ext && ext.length <= 4 ? ext : '';
    } catch {
      return '';
    }
  }
  
  // Image validation
  static isImageUrl(url) {
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'ico'];
    const ext = this.getFileExtension(url);
    return imageExts.includes(ext);
  }
  
  static isValidImageSize(width, height, minWidth = 0, minHeight = 0) {
    return width >= minWidth && height >= minHeight;
  }
  
  // Filter utilities
  static createDefaultFilters() {
    return {
      minWidth: 0,
      minHeight: 0,
      maxSize: 0, // 0 means no limit
      allowedTypes: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'],
      skipDuplicates: false,
      maxResults: 1000
    };
  }
  
  // Version comparison utility
  static compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    const maxLength = Math.max(parts1.length, parts2.length);
    
    for (let i = 0; i < maxLength; i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 < part2) {return -1;}
      if (part1 > part2) {return 1;}
    }
    
    return 0;
  }
}

export { StepTwoUtils };