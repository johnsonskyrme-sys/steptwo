// enterprise-integration.js - Integration layer for enterprise-grade enhancements
// Manages switching between basic and enhanced systems

export class EnterpriseIntegration {
  constructor() {
    this.enhancedMode = false;
    this.enhancedQueue = null;
    this.perceptualDetector = null;
    this.exportSystem = null;
    this.macroRecorder = null;
    this.enhancedSelector = null;

        
    this.settings = {
      enableEnhancedQueue: true,
      enablePerceptualDuplication: true,
      enableProfessionalExport: true,
      enableMacroRecording: false, // Disabled by default for performance
      enableEnhancedSelectors: true
    };
        
    this.loadSettings();
  }
    
  async initialize() {
    console.log('🚀 Initializing STEPTWO V2 Enterprise Features...');
        
    if (this.settings.enableEnhancedQueue) {
      await this.initializeEnhancedQueue();
    }
        
    if (this.settings.enablePerceptualDuplication) {
      await this.initializePerceptualDetector();
    }
        
    if (this.settings.enableProfessionalExport) {
      await this.initializeProfessionalExport();
    }
        
    if (this.settings.enableEnhancedSelectors) {
      await this.initializeEnhancedSelectors();
    }
        
    if (this.settings.enableMacroRecording) {
      await this.initializeMacroRecording();
    }

        
    this.enhancedMode = true;
    console.log('✅ Enterprise features initialized successfully');
  }
    
  async initializeEnhancedQueue() {
    try {
      const { EnhancedDownloadQueue } = await import('./enhanced-queue.js');
      this.enhancedQueue = new EnhancedDownloadQueue({
        concurrency: 5,
        retryLimit: 3,
        hostLimit: 3,
        enableSegmentation: true,
        persistState: true
      });
            
      console.log('📥 Enhanced download queue initialized');
    } catch (error) {
      console.warn('Failed to initialize enhanced queue:', error);
    }
  }
    
  async initializePerceptualDetector() {
    try {
      const { PerceptualDuplicateDetector } = await import('../content/perceptual-duplicate-detector.js');
      this.perceptualDetector = new PerceptualDuplicateDetector({
        threshold: 0.85,
        enableClustering: true,
        maxWorkers: 4
      });
            
      console.log('🔍 Perceptual duplicate detector initialized');
    } catch (error) {
      console.warn('Failed to initialize perceptual detector:', error);
    }
  }
    
  async initializeProfessionalExport() {
    try {
      const { ProfessionalExportSystem } = await import('./professional-export-system.js');
      this.exportSystem = new ProfessionalExportSystem({
        includeMetadata: true,
        includeThumbnails: true,
        exportFormats: ['csv', 'xlsx', 'json', 'html']
      });
            
      console.log('📊 Professional export system initialized');
    } catch (error) {
      console.warn('Failed to initialize export system:', error);
    }
  }
    
  async initializeEnhancedSelectors() {
    try {
      const { EnhancedSelectorGenerator } = await import('../content/enhanced-selector.js');
      this.enhancedSelector = new EnhancedSelectorGenerator();
            
      // Make available globally for other components
      if (typeof window !== 'undefined') {
        window.stepTwoEnhancedSelector = this.enhancedSelector;
      }
            
      console.log('🎯 Enhanced selector system initialized');
    } catch (error) {
      console.warn('Failed to initialize enhanced selectors:', error);
    }
  }
    
  async initializeMacroRecording() {
    try {
      const { MacroRecorder } = await import('../content/macro-recorder.js');
      this.macroRecorder = new MacroRecorder({
        maxActions: 1000,
        captureScreenshots: true,
        captureNetwork: true
      });
            
      console.log('🎬 Macro recording system initialized');
    } catch (error) {
      console.warn('Failed to initialize macro recorder:', error);
    }
  }
    

    
  getQueue() {
    return this.enhancedQueue || null;
  }
    
  getPerceptualDetector() {
    return this.perceptualDetector;
  }
    
  getExportSystem() {
    return this.exportSystem;
  }
    
  getMacroRecorder() {
    return this.macroRecorder;
  }
    
  getEnhancedSelector() {
    return this.enhancedSelector;
  }
    

    
  isEnhanced() {
    return this.enhancedMode;
  }
    
  getSettings() {
    return { ...this.settings };
  }
    
  async updateSettings(newSettings) {
    const oldSettings = { ...this.settings };
    this.settings = { ...this.settings, ...newSettings };
        
    // Reinitialize components if settings changed
    if (oldSettings.enableEnhancedQueue !== this.settings.enableEnhancedQueue) {
      if (this.settings.enableEnhancedQueue) {
        await this.initializeEnhancedQueue();
      } else {
        this.enhancedQueue = null;
      }
    }
        
    if (oldSettings.enablePerceptualDuplication !== this.settings.enablePerceptualDuplication) {
      if (this.settings.enablePerceptualDuplication) {
        await this.initializePerceptualDetector();
      } else {
        if (this.perceptualDetector) {
          this.perceptualDetector.destroy();
          this.perceptualDetector = null;
        }
      }
    }
        
    if (oldSettings.enableMacroRecording !== this.settings.enableMacroRecording) {
      if (this.settings.enableMacroRecording) {
        await this.initializeMacroRecording();
      } else {
        if (this.macroRecorder) {
          this.macroRecorder.destroy();
          this.macroRecorder = null;
        }
      }
    }
        
    await this.saveSettings();
  }
    
  async processImages(images, options = {}) {
    if (!this.enhancedMode) {
      return { processedImages: images, duplicates: [], clusters: [] };
    }
        
    const results = {
      processedImages: [...images],
      duplicates: [],
      clusters: [],
      metadata: {}
    };
        
    // Perceptual duplicate detection
    if (this.perceptualDetector && options.checkDuplicates) {
      try {
        console.log('🔍 Analyzing images for duplicates...');
                
        // Find duplicates
        for (let i = 0; i < images.length; i++) {
          const targetImage = images[i];
          const candidates = images.slice(i + 1);
                    
          if (candidates.length > 0) {
            const similarityResults = await this.perceptualDetector.findSimilarImages(
              targetImage,
              candidates,
              { threshold: options.duplicateThreshold || 0.85 }
            );
                        
            results.duplicates.push(...similarityResults.duplicates);
          }
        }
                
        // Create clusters
        if (options.createClusters) {
          results.clusters = await this.perceptualDetector.createClusters(
            images,
            { threshold: options.clusterThreshold || 0.75 }
          );
        }
                
        console.log(`✅ Found ${results.duplicates.length} duplicates, ${results.clusters.length} clusters`);
      } catch (error) {
        console.warn('Duplicate detection failed:', error);
      }
    }
        
    return results;
  }
    
  async exportData(data, format, templateName, options = {}) {
    if (!this.exportSystem) {
      throw new Error('Professional export system not available');
    }
        
    return await this.exportSystem.exportData(data, format, templateName, options);
  }
    
  async generateEnhancedSelector(element, options = {}) {
    if (!this.enhancedSelector) {
      return null;
    }
        
    return this.enhancedSelector.generate(element, options);
  }
    
  async testSelector(selector, type = 'css') {
    if (!this.enhancedSelector) {
      return null;
    }
        
    return this.enhancedSelector.testSelector(selector, type);
  }
    
  startMacroRecording(macroName, options = {}) {
    if (!this.macroRecorder) {
      throw new Error('Macro recording not enabled');
    }
        
    return this.macroRecorder.startRecording(macroName, options);
  }
    
  stopMacroRecording() {
    if (!this.macroRecorder) {
      throw new Error('Macro recording not enabled');
    }
        
    return this.macroRecorder.stopRecording();
  }
    
  async playMacro(macroId, options = {}) {
    if (!this.macroRecorder) {
      throw new Error('Macro recording not enabled');
    }
        
    return await this.macroRecorder.playMacro(macroId, options);
  }
    
  getEnterpriseStats() {
    return {
      enhancedMode: this.enhancedMode,
      settings: this.settings,
      components: {
        enhancedQueue: !!this.enhancedQueue,
        perceptualDetector: !!this.perceptualDetector,
        exportSystem: !!this.exportSystem,
        macroRecorder: !!this.macroRecorder,
        enhancedSelector: !!this.enhancedSelector
      },
      stats: {
        duplicateDetector: this.perceptualDetector?.getStats(),
        macroLibrary: this.macroRecorder?.getMacroLibrary().list().length || 0
      }
    };
  }
    
  async loadSettings() {
    try {
      const result = await chrome.storage.local.get('steptwo_enterprise_settings');
      if (result.steptwo_enterprise_settings) {
        const saved = JSON.parse(result.steptwo_enterprise_settings);
        this.settings = { ...this.settings, ...saved };
      }
    } catch (error) {
      console.warn('Failed to load enterprise settings:', error);
    }
  }
    
  async saveSettings() {
    try {
      await chrome.storage.local.set({
        steptwo_enterprise_settings: JSON.stringify(this.settings)
      });
    } catch (error) {
      console.warn('Failed to save enterprise settings:', error);
    }
  }
    
  destroy() {
    if (this.perceptualDetector) {
      this.perceptualDetector.destroy();
    }
        
    if (this.macroRecorder) {
      this.macroRecorder.destroy();
    }
        
    this.enhancedMode = false;
  }
}

// Global instance
export const enterpriseIntegration = new EnterpriseIntegration();