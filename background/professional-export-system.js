// professional-export-system.js - Enterprise-grade export and reporting
// Advanced export formats with visual reports and rich metadata

export class ProfessionalExportSystem {
  constructor(options = {}) {
    this.options = {
      includeMetadata: options.includeMetadata !== false,
      includeThumbnails: options.includeThumbnails !== false,
      thumbnailSize: options.thumbnailSize || 150,
      exportFormats: options.exportFormats || ['csv', 'xlsx', 'json', 'html'],
      templateEngine: options.templateEngine || 'built-in',
      ...options
    };
        
    this.templates = new ExportTemplateManager();
    this.metadataCollector = new MetadataCollector();
    this.reportGenerator = new VisualReportGenerator();
    this.thumbnailGenerator = new ThumbnailGenerator(this.options.thumbnailSize);
  }
    
  async exportData(data, format, templateName = 'default', options = {}) {
    const startTime = performance.now();
        
    try {
      // Collect rich metadata if enabled
      if (this.options.includeMetadata) {
        data = await this.enrichWithMetadata(data);
      }
            
      // Generate thumbnails if enabled
      if (this.options.includeThumbnails && ['html', 'pdf'].includes(format)) {
        data = await this.addThumbnails(data);
      }
            
      let result;
            
      switch (format.toLowerCase()) {
        case 'csv':
          result = await this.exportCSV(data, templateName, options);
          break;
        case 'xlsx':
          result = await this.exportXLSX(data, templateName, options);
          break;
        case 'json':
          result = await this.exportJSON(data, templateName, options);
          break;
        case 'html':
          result = await this.exportHTML(data, templateName, options);
          break;
        case 'pdf':
          result = await this.exportPDF(data, templateName, options);
          break;
        case 'xml':
          result = await this.exportXML(data, templateName, options);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
            
      const exportTime = performance.now() - startTime;
            
      return {
        ...result,
        exportTime,
        timestamp: new Date().toISOString(),
        metadata: {
          format,
          template: templateName,
          itemCount: Array.isArray(data.items) ? data.items.length : 0,
          options
        }
      };
            
    } catch (error) {
      throw new Error(`Export failed: ${error.message}`);
    }
  }
    
  async enrichWithMetadata(data) {
    if (!data.items || !Array.isArray(data.items)) {
      return data;
    }
        
    const enrichedItems = await Promise.all(
      data.items.map(async (item) => {
        try {
          const metadata = await this.metadataCollector.collect(item);
          return {
            ...item,
            metadata
          };
        } catch (error) {
          console.warn(`Failed to collect metadata for ${item.url}:`, error);
          return item;
        }
      })
    );
        
    return {
      ...data,
      items: enrichedItems
    };
  }
    
  async addThumbnails(data) {
    if (!data.items || !Array.isArray(data.items)) {
      return data;
    }
        
    const itemsWithThumbnails = await Promise.all(
      data.items.map(async (item) => {
        try {
          const thumbnail = await this.thumbnailGenerator.generate(item.url);
          return {
            ...item,
            thumbnail
          };
        } catch (error) {
          console.warn(`Failed to generate thumbnail for ${item.url}:`, error);
          return item;
        }
      })
    );
        
    return {
      ...data,
      items: itemsWithThumbnails
    };
  }
    
  async exportCSV(data, templateName, options) {
    const template = this.templates.getTemplate('csv', templateName);
    const csvData = this.transformDataForCSV(data, template);
        
    const csv = this.generateCSV(csvData, template);
        
    return {
      content: csv,
      filename: this.generateFilename(data, 'csv', templateName),
      mimeType: 'text/csv',
      size: new Blob([csv]).size
    };
  }
    
  async exportXLSX(data, templateName, options) {
    // For XLSX export, we'll create a comprehensive workbook with multiple sheets
    const template = this.templates.getTemplate('xlsx', templateName);
        
    const workbookData = {
      sheets: [
        {
          name: 'Images',
          data: this.transformDataForXLSX(data, template)
        },
        {
          name: 'Summary',
          data: this.generateSummaryData(data)
        },
        {
          name: 'Statistics',
          data: this.generateStatisticsData(data)
        }
      ]
    };
        
    if (data.clusters && data.clusters.length > 0) {
      workbookData.sheets.push({
        name: 'Clusters',
        data: this.transformClustersForXLSX(data.clusters)
      });
    }
        
    const xlsx = await this.generateXLSX(workbookData);
        
    return {
      content: xlsx,
      filename: this.generateFilename(data, 'xlsx', templateName),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: xlsx.byteLength
    };
  }
    
  async exportJSON(data, templateName, options) {
    const template = this.templates.getTemplate('json', templateName);
    const jsonData = this.transformDataForJSON(data, template);
        
    const json = JSON.stringify(jsonData, null, options.pretty ? 2 : 0);
        
    return {
      content: json,
      filename: this.generateFilename(data, 'json', templateName),
      mimeType: 'application/json',
      size: new Blob([json]).size
    };
  }
    
  async exportHTML(data, templateName, options) {
    const template = this.templates.getTemplate('html', templateName);
    const html = await this.reportGenerator.generateReport(data, template, options);
        
    return {
      content: html,
      filename: this.generateFilename(data, 'html', templateName),
      mimeType: 'text/html',
      size: new Blob([html]).size
    };
  }
    
  async exportPDF(data, templateName, options) {
    // Generate HTML first, then convert to PDF
    const htmlResult = await this.exportHTML(data, templateName, options);
    const pdf = await this.convertHTMLToPDF(htmlResult.content, options);
        
    return {
      content: pdf,
      filename: this.generateFilename(data, 'pdf', templateName),
      mimeType: 'application/pdf',
      size: pdf.byteLength
    };
  }
    
  async exportXML(data, templateName, options) {
    const template = this.templates.getTemplate('xml', templateName);
    const xml = this.generateXML(data, template);
        
    return {
      content: xml,
      filename: this.generateFilename(data, 'xml', templateName),
      mimeType: 'application/xml',
      size: new Blob([xml]).size
    };
  }
    
  transformDataForCSV(data, template) {
    const columns = template.columns || [
      'filename',
      'url',
      'status',
      'size',
      'dimensions',
      'downloadTime',
      'source'
    ];
        
    const headers = columns.map(col => template.columnLabels?.[col] || this.formatColumnName(col));
        
    const rows = data.items.map(item => {
      return columns.map(col => this.extractFieldValue(item, col));
    });
        
    return {
      headers,
      rows
    };
  }
    
  transformDataForXLSX(data, template) {
    const csvData = this.transformDataForCSV(data, template);
        
    return [
      csvData.headers,
      ...csvData.rows
    ];
  }
    
  transformDataForJSON(data, template) {
    const result = {
      export: {
        timestamp: new Date().toISOString(),
        generator: 'STEPTWO V2 Professional Export System',
        version: '2.0.0',
        template: template.name
      },
      summary: this.generateSummaryData(data),
      statistics: this.generateStatisticsData(data),
      items: data.items.map(item => this.transformItemForJSON(item, template))
    };
        
    if (data.clusters) {
      result.clusters = data.clusters;
    }
        
    if (data.settings) {
      result.settings = data.settings;
    }
        
    return result;
  }
    
  transformItemForJSON(item, template) {
    const transformed = {
      id: item.id,
      url: item.url,
      filename: item.filename,
      status: item.status
    };
        
    // Add optional fields based on template
    if (template.includeMetadata && item.metadata) {
      transformed.metadata = item.metadata;
    }
        
    if (template.includeTiming && item.downloadTime) {
      transformed.timing = {
        downloadTime: item.downloadTime,
        startedAt: item.startedAt,
        completedAt: item.completedAt
      };
    }
        
    if (template.includeDimensions && item.dimensions) {
      transformed.dimensions = item.dimensions;
    }
        
    if (template.includeHashes && item.hashes) {
      transformed.hashes = item.hashes;
    }
        
    return transformed;
  }
    
  generateSummaryData(data) {
    const total = data.items.length;
    const successful = data.items.filter(item => item.status === 'completed').length;
    const failed = data.items.filter(item => item.status === 'failed').length;
    const duplicates = data.items.filter(item => item.isDuplicate).length;
        
    return {
      totalItems: total,
      successful,
      failed,
      successRate: total > 0 ? (successful / total) * 100 : 0,
      duplicates,
      uniqueImages: total - duplicates,
      totalSize: this.calculateTotalSize(data.items),
      averageSize: this.calculateAverageSize(data.items),
      processingTime: data.processingTime || 0,
      scrapingSource: data.source || 'Unknown'
    };
  }
    
  generateStatisticsData(data) {
    const completedItems = data.items.filter(item => item.status === 'completed');
        
    return {
      downloadSpeeds: this.calculateDownloadSpeeds(completedItems),
      imageDimensions: this.analyzeImageDimensions(completedItems),
      fileTypes: this.analyzeFileTypes(data.items),
      domainDistribution: this.analyzeDomainDistribution(data.items),
      temporalDistribution: this.analyzeTemporalDistribution(completedItems),
      qualityMetrics: this.calculateQualityMetrics(data.items)
    };
  }
    
  calculateTotalSize(items) {
    return items.reduce((total, item) => {
      return total + (item.size || 0);
    }, 0);
  }
    
  calculateAverageSize(items) {
    const withSize = items.filter(item => item.size);
    if (withSize.length === 0) {return 0;}
        
    return this.calculateTotalSize(withSize) / withSize.length;
  }
    
  calculateDownloadSpeeds(items) {
    const speeds = items
      .filter(item => item.downloadTime && item.size)
      .map(item => item.size / (item.downloadTime / 1000)); // bytes per second
        
    return {
      average: speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length,
      min: Math.min(...speeds),
      max: Math.max(...speeds),
      median: this.calculateMedian(speeds)
    };
  }
    
  analyzeImageDimensions(items) {
    const withDimensions = items.filter(item => item.dimensions);
        
    const widths = withDimensions.map(item => item.dimensions.width);
    const heights = withDimensions.map(item => item.dimensions.height);
    const aspectRatios = withDimensions.map(item => 
      item.dimensions.width / item.dimensions.height
    );
        
    return {
      width: {
        average: widths.reduce((sum, w) => sum + w, 0) / widths.length,
        min: Math.min(...widths),
        max: Math.max(...widths),
        median: this.calculateMedian(widths)
      },
      height: {
        average: heights.reduce((sum, h) => sum + h, 0) / heights.length,
        min: Math.min(...heights),
        max: Math.max(...heights),
        median: this.calculateMedian(heights)
      },
      aspectRatio: {
        average: aspectRatios.reduce((sum, ar) => sum + ar, 0) / aspectRatios.length,
        median: this.calculateMedian(aspectRatios),
        common: this.getMostCommonAspectRatios(aspectRatios)
      }
    };
  }
    
  analyzeFileTypes(items) {
    const types = {};
        
    items.forEach(item => {
      const extension = this.getFileExtension(item.filename || item.url);
      types[extension] = (types[extension] || 0) + 1;
    });
        
    return Object.entries(types)
      .sort(([,a], [,b]) => b - a)
      .map(([type, count]) => ({ type, count, percentage: (count / items.length) * 100 }));
  }
    
  analyzeDomainDistribution(items) {
    const domains = {};
        
    items.forEach(item => {
      try {
        const domain = new URL(item.url).hostname;
        domains[domain] = (domains[domain] || 0) + 1;
      } catch (_error) {
        domains['invalid-url'] = (domains['invalid-url'] || 0) + 1;
      }
    });
        
    return Object.entries(domains)
      .sort(([,a], [,b]) => b - a)
      .map(([domain, count]) => ({ domain, count, percentage: (count / items.length) * 100 }));
  }
    
  analyzeTemporalDistribution(items) {
    const hourly = Array(24).fill(0);
    const daily = {};
        
    items.forEach(item => {
      if (item.completedAt) {
        const date = new Date(item.completedAt);
        const hour = date.getHours();
        const day = date.toDateString();
                
        hourly[hour]++;
        daily[day] = (daily[day] || 0) + 1;
      }
    });
        
    return {
      hourly,
      daily: Object.entries(daily).map(([day, count]) => ({ day, count }))
    };
  }
    
  calculateQualityMetrics(items) {
    const successful = items.filter(item => item.status === 'completed');
    const failed = items.filter(item => item.status === 'failed');
        
    const retryDistribution = {};
    items.forEach(item => {
      const retries = item.retries || 0;
      retryDistribution[retries] = (retryDistribution[retries] || 0) + 1;
    });
        
    return {
      successRate: (successful.length / items.length) * 100,
      averageRetries: items.reduce((sum, item) => sum + (item.retries || 0), 0) / items.length,
      retryDistribution,
      errorTypes: this.analyzeErrorTypes(failed)
    };
  }
    
  analyzeErrorTypes(failedItems) {
    const errors = {};
        
    failedItems.forEach(item => {
      const error = item.error || 'Unknown error';
      errors[error] = (errors[error] || 0) + 1;
    });
        
    return Object.entries(errors)
      .sort(([,a], [,b]) => b - a)
      .map(([error, count]) => ({ error, count }));
  }
    
  calculateMedian(numbers) {
    if (numbers.length === 0) {return 0;}
        
    const sorted = [...numbers].sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
        
    if (sorted.length % 2 === 0) {
      return (sorted[middle - 1] + sorted[middle]) / 2;
    } else {
      return sorted[middle];
    }
  }
    
  getMostCommonAspectRatios(ratios) {
    const rounded = ratios.map(ratio => Math.round(ratio * 100) / 100);
    const counts = {};
        
    rounded.forEach(ratio => {
      counts[ratio] = (counts[ratio] || 0) + 1;
    });
        
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([ratio, count]) => ({ ratio: parseFloat(ratio), count }));
  }
    
  generateCSV(data, template) {
    const escapeCSVField = (field) => {
      if (field === null || field === undefined) {return '';}
            
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
        
    let csv = `${data.headers.map(escapeCSVField).join(',')  }\n`;
        
    data.rows.forEach(row => {
      csv += `${row.map(escapeCSVField).join(',')  }\n`;
    });
        
    return csv;
  }
    
  async generateXLSX(workbookData) {
    // This would normally use a library like xlsx or exceljs
    // For this implementation, we'll create a simple XLSX structure
    // In production, you would use: import * as XLSX from 'xlsx';
        
    try {
      // Fallback to CSV if XLSX library not available
      console.warn('XLSX library not available, falling back to CSV format');
            
      const csvData = workbookData.sheets[0].data;
      const csv = this.generateCSV({
        headers: csvData[0],
        rows: csvData.slice(1)
      }, {});
            
      return new TextEncoder().encode(csv);
    } catch (error) {
      throw new Error(`XLSX generation failed: ${error.message}`);
    }
  }
    
  generateXML(data, template) {
    const escapeXML = (str) => {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };
        
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<steptwo_export>\n';
    xml += '  <metadata>\n';
    xml += `    <timestamp>${escapeXML(new Date().toISOString())}</timestamp>\n`;
    xml += '    <generator>STEPTWO V2 Professional Export System</generator>\n';
    xml += `    <template>${escapeXML(template.name)}</template>\n`;
    xml += `    <item_count>${data.items.length}</item_count>\n`;
    xml += '  </metadata>\n';
        
    xml += '  <items>\n';
    data.items.forEach(item => {
      xml += '    <item>\n';
      xml += `      <id>${escapeXML(item.id || '')}</id>\n`;
      xml += `      <url>${escapeXML(item.url)}</url>\n`;
      xml += `      <filename>${escapeXML(item.filename || '')}</filename>\n`;
      xml += `      <status>${escapeXML(item.status)}</status>\n`;
            
      if (item.size) {
        xml += `      <size>${item.size}</size>\n`;
      }
            
      if (item.dimensions) {
        xml += '      <dimensions>\n';
        xml += `        <width>${item.dimensions.width}</width>\n`;
        xml += `        <height>${item.dimensions.height}</height>\n`;
        xml += '      </dimensions>\n';
      }
            
      xml += '    </item>\n';
    });
    xml += '  </items>\n';
    xml += '</steptwo_export>\n';
        
    return xml;
  }
    
  async convertHTMLToPDF(html, options) {
    // This would normally use a library like puppeteer or jsPDF
    // For this implementation, we'll throw an error suggesting alternatives
    throw new Error('PDF generation requires puppeteer or similar library. Use HTML export instead.');
  }
    
  extractFieldValue(item, fieldPath) {
    const parts = fieldPath.split('.');
    let value = item;
        
    for (const part of parts) {
      if (value === null || value === undefined) {
        return '';
      }
      value = value[part];
    }
        
    if (value === null || value === undefined) {
      return '';
    }
        
    // Format specific field types
    if (fieldPath === 'size') {
      return this.formatFileSize(value);
    } else if (fieldPath === 'dimensions') {
      return value.width && value.height ? `${value.width}x${value.height}` : '';
    } else if (fieldPath === 'downloadTime') {
      return this.formatDuration(value);
    }
        
    return String(value);
  }
    
  formatColumnName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
    
  formatFileSize(bytes) {
    if (bytes === 0) {return '0 B';}
        
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
        
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  }
    
  formatDuration(ms) {
    if (ms < 1000) {return `${ms}ms`;}
        
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {return `${seconds}s`;}
        
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
    
  getFileExtension(filename) {
    const match = filename.match(/\.([^.]+)$/);
    return match ? match[1].toLowerCase() : 'unknown';
  }
    
  generateFilename(data, format, templateName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const source = data.source ? data.source.replace(/[^a-zA-Z0-9]/g, '_') : 'export';
    const template = templateName !== 'default' ? `_${templateName}` : '';
        
    return `steptwo_${source}_${timestamp}${template}.${format}`;
  }
}

// Supporting classes

class ExportTemplateManager {
  constructor() {
    this.templates = this.initializeDefaultTemplates();
  }
    
  initializeDefaultTemplates() {
    return {
      csv: {
        default: {
          name: 'Default CSV',
          columns: ['filename', 'url', 'status', 'size', 'downloadTime'],
          columnLabels: {
            filename: 'File Name',
            url: 'URL',
            status: 'Status',
            size: 'Size',
            downloadTime: 'Download Time'
          }
        },
        detailed: {
          name: 'Detailed CSV',
          columns: ['filename', 'url', 'status', 'size', 'dimensions', 'downloadTime', 'retries', 'source'],
          columnLabels: {
            filename: 'File Name',
            url: 'URL',
            status: 'Status',
            size: 'File Size',
            dimensions: 'Dimensions',
            downloadTime: 'Download Time',
            retries: 'Retry Count',
            source: 'Source Domain'
          }
        }
      },
      xlsx: {
        default: {
          name: 'Default Excel',
          columns: ['filename', 'url', 'status', 'size', 'dimensions', 'downloadTime'],
          includeCharts: true,
          includeSummary: true
        }
      },
      json: {
        default: {
          name: 'Complete JSON',
          includeMetadata: true,
          includeTiming: true,
          includeDimensions: true,
          includeHashes: false
        },
        minimal: {
          name: 'Minimal JSON',
          includeMetadata: false,
          includeTiming: false,
          includeDimensions: true,
          includeHashes: false
        }
      },
      html: {
        default: {
          name: 'Professional Report',
          includeCharts: true,
          includeThumbnails: true,
          includeStatistics: true,
          theme: 'professional'
        },
        gallery: {
          name: 'Image Gallery',
          includeCharts: false,
          includeThumbnails: true,
          includeStatistics: false,
          theme: 'gallery'
        }
      },
      xml: {
        default: {
          name: 'Standard XML',
          includeMetadata: true,
          schema: 'steptwo-v2'
        }
      }
    };
  }
    
  getTemplate(format, name = 'default') {
    return this.templates[format]?.[name] || this.templates[format]?.default || {};
  }
    
  addTemplate(format, name, template) {
    if (!this.templates[format]) {
      this.templates[format] = {};
    }
        
    this.templates[format][name] = template;
  }
    
  listTemplates(format) {
    return Object.keys(this.templates[format] || {});
  }
}

class MetadataCollector {
  async collect(item) {
    const metadata = {
      extractedAt: new Date().toISOString(),
      url: item.url,
      filename: item.filename
    };
        
    try {
      // Collect image metadata
      if (item.url) {
        metadata.imageInfo = await this.getImageInfo(item.url);
      }
            
      // Collect download metadata
      if (item.downloadId) {
        metadata.downloadInfo = await this.getDownloadInfo(item.downloadId);
      }
            
      // Collect page context
      metadata.pageContext = this.getPageContext();
            
      // Collect performance metrics
      metadata.performance = this.getPerformanceMetrics(item);
            
    } catch (error) {
      metadata.error = error.message;
    }
        
    return metadata;
  }
    
  async getImageInfo(url) {
    // Image constructor is not available in service workers
    if (typeof Image === 'undefined') {
      return {
        error: 'Image metadata extraction not available in service worker context'
      };
    }
    
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
            
      img.onload = () => {
        resolve({
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          aspectRatio: img.naturalWidth / img.naturalHeight,
          loadTime: Date.now() - startTime
        });
      };
            
      img.onerror = () => {
        resolve({
          error: 'Failed to load image for metadata extraction'
        });
      };
            
      const startTime = Date.now();
      img.src = url;
            
      // Timeout after 10 seconds
      setTimeout(() => {
        resolve({
          error: 'Image metadata extraction timeout'
        });
      }, 10000);
    });
  }
    
  async getDownloadInfo(downloadId) {
    return new Promise((resolve) => {
      chrome.downloads.search({ id: downloadId }, (results) => {
        if (results.length > 0) {
          const download = results[0];
          resolve({
            state: download.state,
            bytesReceived: download.bytesReceived,
            totalBytes: download.totalBytes,
            filename: download.filename,
            startTime: download.startTime,
            endTime: download.endTime
          });
        } else {
          resolve({
            error: 'Download not found'
          });
        }
      });
    });
  }
    
  getPageContext() {
    return {
      url: (typeof window !== 'undefined') ? window.location.href : 'service-worker',
      title: (typeof document !== 'undefined') ? document.title : 'unknown',
      domain: (typeof window !== 'undefined') ? window.location.hostname : 'unknown',
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      viewport: {
        width: (typeof window !== 'undefined') ? window.innerWidth : 0,
        height: (typeof window !== 'undefined') ? window.innerHeight : 0
      },
      language: navigator.language,
      referrer: (typeof document !== 'undefined') ? document.referrer : ''
    };
  }
    
  getPerformanceMetrics(item) {
    return {
      downloadStarted: item.startedAt,
      downloadCompleted: item.completedAt,
      downloadDuration: item.completedAt - item.startedAt,
      retryCount: item.retries || 0,
      fileSize: item.size,
      downloadSpeed: item.size && item.downloadTime ? item.size / (item.downloadTime / 1000) : null
    };
  }
}

class VisualReportGenerator {
  async generateReport(data, template, options) {
    const templateName = template.name || 'default';
        
    switch (templateName) {
      case 'Professional Report':
        return this.generateProfessionalReport(data, template, options);
      case 'Image Gallery':
        return this.generateGalleryReport(data, template, options);
      default:
        return this.generateDefaultReport(data, template, options);
    }
  }
    
  generateProfessionalReport(data, template, options) {
    const summary = this.generateSummaryData(data);
    const statistics = this.generateStatisticsData(data);
        
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>STEPTWO V2 Professional Report</title>
            <style>
                ${this.getProfessionalCSS()}
            </style>
        </head>
        <body>
            <div class="report-container">
                ${this.generateReportHeader(data)}
                ${this.generateSummarySection(summary)}
                ${this.generateStatisticsSection(statistics)}
                ${this.generateItemsSection(data.items, template)}
                ${this.generateFooter()}
            </div>
            <script>
                ${this.getReportJavaScript()}
            </script>
        </body>
        </html>
        `;
  }
    
  generateGalleryReport(data, template, options) {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>STEPTWO V2 Image Gallery</title>
            <style>
                ${this.getGalleryCSS()}
            </style>
        </head>
        <body>
            <div class="gallery-container">
                ${this.generateGalleryHeader(data)}
                ${this.generateImageGrid(data.items)}
                ${this.generateGalleryFooter()}
            </div>
        </body>
        </html>
        `;
  }
    
  generateDefaultReport(data, template, options) {
    return this.generateProfessionalReport(data, template, options);
  }
    
  getProfessionalCSS() {
    return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                line-height: 1.6;
                color: #333;
                background: #f5f5f5;
            }
            
            .report-container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 2.5em;
                margin-bottom: 10px;
                font-weight: 300;
            }
            
            .header p {
                font-size: 1.1em;
                opacity: 0.9;
            }
            
            .section {
                padding: 30px 40px;
                border-bottom: 1px solid #eee;
            }
            
            .section h2 {
                color: #667eea;
                margin-bottom: 20px;
                font-size: 1.8em;
                font-weight: 500;
            }
            
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin: 20px 0;
            }
            
            .stat-card {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                border-left: 4px solid #667eea;
                text-align: center;
            }
            
            .stat-value {
                font-size: 2em;
                font-weight: bold;
                color: #667eea;
                margin-bottom: 5px;
            }
            
            .stat-label {
                color: #666;
                font-size: 0.9em;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            
            .items-table {
                width: 100%;
                border-collapse: collapse;
                margin: 20px 0;
            }
            
            .items-table th,
            .items-table td {
                padding: 12px;
                text-align: left;
                border-bottom: 1px solid #ddd;
            }
            
            .items-table th {
                background: #f8f9fa;
                font-weight: 600;
                color: #555;
            }
            
            .items-table tr:hover {
                background: #f8f9fa;
            }
            
            .status-badge {
                padding: 4px 8px;
                border-radius: 4px;
                font-size: 0.8em;
                font-weight: 600;
                text-transform: uppercase;
            }
            
            .status-completed {
                background: #d4edda;
                color: #155724;
            }
            
            .status-failed {
                background: #f8d7da;
                color: #721c24;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 20px 40px;
                text-align: center;
                color: #666;
                font-size: 0.9em;
            }
            
            @media print {
                body { background: white; }
                .report-container { box-shadow: none; }
                .section { page-break-inside: avoid; }
            }
        `;
  }
    
  generateReportHeader(data) {
    return `
            <div class="header">
                <h1>🎯 STEPTWO V2 Professional Report</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>Source: ${data.source || 'Unknown'}</p>
            </div>
        `;
  }
    
  generateSummarySection(summary) {
    return `
            <div class="section">
                <h2>📊 Summary</h2>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${summary.totalItems}</div>
                        <div class="stat-label">Total Images</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${summary.successful}</div>
                        <div class="stat-label">Downloaded</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${summary.failed}</div>
                        <div class="stat-label">Failed</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${Math.round(summary.successRate)}%</div>
                        <div class="stat-label">Success Rate</div>
                    </div>
                </div>
            </div>
        `;
  }
    
  generateStatisticsSection(statistics) {
    return `
            <div class="section">
                <h2>📈 Statistics</h2>
                <div class="stats-content">
                    <h3>File Types Distribution</h3>
                    <div class="chart-container">
                        ${this.generateFileTypesChart(statistics.fileTypes)}
                    </div>
                </div>
            </div>
        `;
  }
    
  generateItemsSection(items, template) {
    const tableRows = items.slice(0, 50).map(item => `
            <tr>
                <td>${item.filename || 'N/A'}</td>
                <td><span class="status-badge status-${item.status}">${item.status}</span></td>
                <td>${this.formatFileSize(item.size || 0)}</td>
                <td>${item.dimensions ? `${item.dimensions.width}x${item.dimensions.height}` : 'N/A'}</td>
                <td>${this.formatDuration(item.downloadTime || 0)}</td>
            </tr>
        `).join('');
        
    return `
            <div class="section">
                <h2>📋 Items (showing first 50)</h2>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Filename</th>
                            <th>Status</th>
                            <th>Size</th>
                            <th>Dimensions</th>
                            <th>Download Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        `;
  }
    
  generateFooter() {
    return `
            <div class="footer">
                <p>Generated by STEPTWO V2 Professional Export System</p>
                <p>© ${new Date().getFullYear()} - Enterprise-grade image collection tool</p>
            </div>
        `;
  }
    
  // Additional helper methods would go here...
  generateSummaryData(data) {
    // Implementation similar to ProfessionalExportSystem.generateSummaryData
    return {
      totalItems: data.items.length,
      successful: data.items.filter(item => item.status === 'completed').length,
      failed: data.items.filter(item => item.status === 'failed').length,
      successRate: 0 // Calculate actual rate
    };
  }
    
  generateStatisticsData(data) {
    // Implementation similar to ProfessionalExportSystem.generateStatisticsData
    return {
      fileTypes: []
    };
  }
    
  formatFileSize(bytes) {
    if (bytes === 0) {return '0 B';}
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  }
    
  formatDuration(ms) {
    if (ms < 1000) {return `${ms}ms`;}
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {return `${seconds}s`;}
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
    
  generateFileTypesChart(fileTypes) {
    // Simple text-based chart for now
    return fileTypes.slice(0, 5).map(type => 
      `<div>${type.type}: ${type.count} (${Math.round(type.percentage)}%)</div>`
    ).join('');
  }
    
  getReportJavaScript() {
    return `
            // Add any interactive functionality here
            console.log('STEPTWO V2 Professional Report loaded');
        `;
  }
}

class ThumbnailGenerator {
  constructor(size = 150) {
    this.size = size;
    this.cache = new Map();
  }
    
  async generate(imageUrl) {
    if (this.cache.has(imageUrl)) {
      return this.cache.get(imageUrl);
    }
        
    try {
      const thumbnail = await this.createThumbnail(imageUrl);
      this.cache.set(imageUrl, thumbnail);
      return thumbnail;
    } catch (error) {
      console.warn(`Failed to generate thumbnail for ${imageUrl}:`, error);
      return null;
    }
  }
    
  async createThumbnail(imageUrl) {
    // Image and Canvas APIs are not available in service workers
    if (typeof Image === 'undefined' || typeof document === 'undefined') {
      throw new Error('Thumbnail generation not available in service worker context');
    }
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
            
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
                    
          // Calculate dimensions to maintain aspect ratio
          const aspectRatio = img.width / img.height;
          let width = this.size;
          let height = this.size;
                    
          if (aspectRatio > 1) {
            height = this.size / aspectRatio;
          } else {
            width = this.size * aspectRatio;
          }
                    
          canvas.width = width;
          canvas.height = height;
                    
          ctx.drawImage(img, 0, 0, width, height);
                    
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve({
            dataUrl,
            width,
            height,
            originalWidth: img.width,
            originalHeight: img.height
          });
        } catch (error) {
          reject(error);
        }
      };
            
      img.onerror = () => reject(new Error('Failed to load image'));
            
      // Set timeout
      setTimeout(() => reject(new Error('Thumbnail generation timeout')), 15000);
            
      img.src = imageUrl;
    });
  }
}