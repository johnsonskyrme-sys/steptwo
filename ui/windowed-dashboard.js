// STEPTWO V2 - Windowed Dashboard
// Combines dashboard, popup, and options functionality with self-scraping prevention

class WindowedDashboard {
  constructor() {
    this.activeTabId = null;
    this.activeTabUrl = null;
    this.isExtensionPage = false;
    this.currentTab = 'dashboard';
    this.stats = {
      totalItems: 0,
      completedItems: 0,
      duplicates: 0,
      progressPercent: 0,
      downloadRate: 0,
      queueSize: 0,
      errorCount: 0
    };
    this.recipes = [];
    this.settings = this.getDefaultSettings();
    this.init();
  }

  async init() {
    try {
      await this.detectActiveTab();
      this.initializeEventListeners();
      this.initializeTabSwitching();
      this.loadSettings();
      this.loadRecipes();
      this.setupBackgroundCommunication();
      this.checkSelfScraping();
      this.updateUI();
      console.log('Windowed Dashboard initialized');
    } catch (error) {
      console.error('Dashboard initialization failed:', error);
    }
  }

  // Self-Scraping Prevention
  async detectActiveTab() {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        this.activeTabId = tabs[0].id;
        this.activeTabUrl = tabs[0].url;
        this.updateActiveTabInfo(tabs[0]);
      }
    } catch (error) {
      console.error('Failed to detect active tab:', error);
    }
  }

  checkSelfScraping() {
    const warning = document.getElementById('selfScrapingWarning');
    if (!this.activeTabUrl) return;

    // Check if current tab is extension page
    this.isExtensionPage = this.activeTabUrl.startsWith('chrome-extension://') ||
                          this.activeTabUrl.includes('dashboard.html') ||
                          this.activeTabUrl.includes('windowed-dashboard.html') ||
                          this.activeTabUrl.includes('popup.html') ||
                          this.activeTabUrl.includes('options.html');

    if (this.isExtensionPage) {
      warning.classList.add('show');
      this.disableScrapingActions();
    } else {
      warning.classList.remove('show');
      this.enableScrapingActions();
    }
  }

  disableScrapingActions() {
    const buttons = [
      'quickStart', 'smartDetection', 'startSelection', 'autoDetect'
    ];
    buttons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = true;
        btn.title = 'Switch to a website tab to start scraping';
      }
    });

    // Update controls badge
    const badge = document.getElementById('controlsBadge');
    if (badge) {
      badge.style.display = 'inline';
      badge.textContent = '!';
      badge.className = 'badge';
    }
  }

  enableScrapingActions() {
    const buttons = [
      'quickStart', 'smartDetection', 'startSelection', 'autoDetect'
    ];
    buttons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = false;
        btn.title = '';
      }
    });

    // Hide controls badge
    const badge = document.getElementById('controlsBadge');
    if (badge) {
      badge.style.display = 'none';
    }
  }

  updateActiveTabInfo(tab) {
    const info = document.getElementById('activeTabInfo');
    if (info && tab) {
      const url = new URL(tab.url);
      const domain = url.hostname.replace('www.', '');
      info.textContent = `Active: ${domain}`;
      
      if (tab.favIconUrl) {
        info.style.backgroundImage = `url(${tab.favIconUrl})`;
        info.style.backgroundSize = '12px 12px';
        info.style.backgroundRepeat = 'no-repeat';
        info.style.backgroundPosition = 'left center';
        info.style.paddingLeft = '18px';
      }
    }
  }

  // Tab Switching
  initializeTabSwitching() {
    const tabs = document.querySelectorAll('.nav-tab');
    const contents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetTab = tab.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  }

  switchTab(tabName) {
    // Update active tab
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    this.currentTab = tabName;
    this.onTabSwitch(tabName);
  }

  onTabSwitch(tabName) {
    switch (tabName) {
      case 'recipes':
        this.loadRecipes();
        break;
      case 'settings':
        this.loadSettings();
        break;
      case 'dashboard':
        this.updateStats();
        break;
    }
  }

  // Event Listeners
  initializeEventListeners() {
    // Primary Actions
    this.addClickListener('quickStart', () => this.startSelection());
    this.addClickListener('smartDetection', () => this.smartDetection());
    this.addClickListener('startSelection', () => this.startSelection());
    this.addClickListener('autoDetect', () => this.smartDetection());
    
    // Control Actions
    this.addClickListener('pauseBtn', () => this.pauseDownloads());
    this.addClickListener('stopBtn', () => this.stopAll());
    this.addClickListener('pauseDownloads', () => this.pauseDownloads());
    this.addClickListener('cancelAll', () => this.stopAll());
    this.addClickListener('resumeDownloads', () => this.resumeDownloads());
    this.addClickListener('clearQueue', () => this.clearQueue());

    // Export Actions
    this.addClickListener('exportCsv', () => this.exportData('csv'));
    this.addClickListener('exportXlsx', () => this.exportData('xlsx'));
    this.addClickListener('exportPdf', () => this.exportData('pdf'));

    // Settings
    this.addClickListener('saveSettings', () => this.saveSettings());
    this.addClickListener('resetSettings', () => this.resetSettings());

    // Recipes
    this.addClickListener('saveRecipe', () => this.saveRecipe());
    this.addClickListener('exportRecipes', () => this.exportRecipes());
    this.addClickListener('importRecipes', () => this.importRecipes());

    // Input listeners for live preview
    this.addInputListener('filenameMask', () => this.updateFilenamePreview());
    this.addInputListener('recipeMask', () => this.updateRecipeMaskPreview());

    // Tab monitoring
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      this.activeTabId = activeInfo.tabId;
      await this.detectActiveTab();
      this.checkSelfScraping();
    });

    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (tabId === this.activeTabId && changeInfo.url) {
        this.activeTabUrl = changeInfo.url;
        this.updateActiveTabInfo(tab);
        this.checkSelfScraping();
      }
    });
  }

  addClickListener(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('click', handler);
    }
  }

  addInputListener(id, handler) {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('input', handler);
    }
  }

  // Background Communication
  setupBackgroundCommunication() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleBackgroundMessage(message);
    });

    // Periodic stats update
    setInterval(() => this.updateStats(), 1000);
  }

  handleBackgroundMessage(message) {
    switch (message.type) {
      case 'stats_update':
        this.updateStatsFromMessage(message.data);
        break;
      case 'queue_update':
        this.updateQueueDisplay(message.data);
        break;
      case 'activity_log':
        this.addActivityLog(message.data);
        break;
      case 'error':
        this.handleError(message.data);
        break;
    }
  }

  // Scraping Actions
  async startSelection() {
    if (this.isExtensionPage) {
      this.showToast('Switch to a website tab to start scraping', 'warning');
      return;
    }

    try {
      await chrome.tabs.sendMessage(this.activeTabId, {
        type: 'start_selection_mode'
      });
      this.addActivityLog('Selection mode activated - click any image to detect gallery');
    } catch (error) {
      console.error('Failed to start selection:', error);
      this.showToast('Failed to start selection mode', 'error');
    }
  }

  async smartDetection() {
    if (this.isExtensionPage) {
      this.showToast('Switch to a website tab to start scraping', 'warning');
      return;
    }

    try {
      await chrome.tabs.sendMessage(this.activeTabId, {
        type: 'smart_detection'
      });
      this.addActivityLog('Smart detection started - analyzing page for galleries');
    } catch (error) {
      console.error('Failed to start smart detection:', error);
      this.showToast('Failed to start smart detection', 'error');
    }
  }

  async pauseDownloads() {
    try {
      await chrome.runtime.sendMessage({
        type: 'pause_downloads'
      });
      this.addActivityLog('Downloads paused');
    } catch (error) {
      console.error('Failed to pause downloads:', error);
    }
  }

  async resumeDownloads() {
    try {
      await chrome.runtime.sendMessage({
        type: 'resume_downloads'
      });
      this.addActivityLog('Downloads resumed');
    } catch (error) {
      console.error('Failed to resume downloads:', error);
    }
  }

  async stopAll() {
    try {
      await chrome.runtime.sendMessage({
        type: 'stop_all'
      });
      this.addActivityLog('All operations stopped');
    } catch (error) {
      console.error('Failed to stop operations:', error);
    }
  }

  async clearQueue() {
    try {
      await chrome.runtime.sendMessage({
        type: 'clear_queue'
      });
      this.addActivityLog('Download queue cleared');
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }

  // Stats and UI Updates
  updateStatsFromMessage(data) {
    this.stats = { ...this.stats, ...data };
    this.updateStatsDisplay();
  }

  updateStatsDisplay() {
    const elements = {
      totalItems: this.stats.totalItems,
      completedItems: this.stats.completedItems,
      duplicates: this.stats.duplicates,
      progressPercent: `${this.stats.progressPercent}%`,
      downloadRate: `${this.stats.downloadRate}/min`,
      queueSize: this.stats.queueSize,
      errorCount: this.stats.errorCount,
      estimatedTime: this.calculateETA()
    };

    Object.entries(elements).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = value;
      }
    });

    // Update badges
    this.updateBadges();
  }

  updateBadges() {
    const dashboardBadge = document.getElementById('dashboardBadge');
    const recipesBadge = document.getElementById('recipesBadge');

    if (dashboardBadge) {
      dashboardBadge.textContent = this.stats.totalItems;
    }

    if (recipesBadge) {
      recipesBadge.textContent = this.recipes.length;
    }
  }

  calculateETA() {
    if (this.stats.downloadRate === 0 || this.stats.queueSize === 0) {
      return '--';
    }
    const minutes = Math.ceil(this.stats.queueSize / this.stats.downloadRate);
    return minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  }

  updateQueueDisplay(queueData) {
    const container = document.getElementById('queueContainer');
    if (!container) return;

    if (!queueData || queueData.length === 0) {
      container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No active downloads</p>';
      return;
    }

    const queueHTML = queueData.map(item => `
      <div class="queue-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-bottom: 1px solid #eee;">
        <div>
          <strong>${item.filename}</strong><br>
          <small style="color: #666;">${item.url}</small>
        </div>
        <div style="text-align: right;">
          <span class="status-badge status-${item.status}">${item.status}</span><br>
          <small>${item.progress || '0'}%</small>
        </div>
      </div>
    `).join('');

    container.innerHTML = queueHTML;
  }

  addActivityLog(message) {
    const log = document.getElementById('activityLog');
    if (!log) return;

    const timestamp = new Date().toLocaleTimeString();
    const item = document.createElement('div');
    item.className = 'progress-item';
    item.textContent = `${timestamp} - ${message}`;

    log.insertBefore(item, log.firstChild);

    // Keep only last 100 items
    while (log.children.length > 100) {
      log.removeChild(log.lastChild);
    }
  }

  // Settings Management
  getDefaultSettings() {
    return {
      downloadFolder: '',
      filenameMask: '*name* - *num*.*ext*',
      minWidth: 100,
      minHeight: 100,
      formats: { jpeg: true, png: true, webp: true, gif: true },
      skipDuplicates: true,
      autoSiteProfiles: true,
      concurrencyLimit: 3,
      retryAttempts: 2,
      downloadDelay: 100
    };
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get('settings');
      this.settings = { ...this.getDefaultSettings(), ...result.settings };
      this.applySettingsToUI();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  applySettingsToUI() {
    const mappings = {
      downloadFolder: 'downloadFolder',
      filenameMask: 'filenameMask',
      minWidth: 'minWidth',
      minHeight: 'minHeight',
      formatJpeg: () => this.settings.formats.jpeg,
      formatPng: () => this.settings.formats.png,
      formatWebp: () => this.settings.formats.webp,
      formatGif: () => this.settings.formats.gif,
      skipDuplicates: 'skipDuplicates',
      autoSiteProfiles: 'autoSiteProfiles',
      concurrencyLimit: 'concurrencyLimit',
      retryAttempts: 'retryAttempts',
      downloadDelay: 'downloadDelay'
    };

    Object.entries(mappings).forEach(([id, setting]) => {
      const element = document.getElementById(id);
      if (!element) return;

      const value = typeof setting === 'function' ? setting() : this.settings[setting];
      
      if (element.type === 'checkbox') {
        element.checked = value;
      } else {
        element.value = value;
      }
    });

    this.updateFilenamePreview();
  }

  async saveSettings() {
    try {
      this.settings = {
        downloadFolder: document.getElementById('downloadFolder').value,
        filenameMask: document.getElementById('filenameMask').value,
        minWidth: parseInt(document.getElementById('minWidth').value) || 100,
        minHeight: parseInt(document.getElementById('minHeight').value) || 100,
        formats: {
          jpeg: document.getElementById('formatJpeg').checked,
          png: document.getElementById('formatPng').checked,
          webp: document.getElementById('formatWebp').checked,
          gif: document.getElementById('formatGif').checked
        },
        skipDuplicates: document.getElementById('skipDuplicates').checked,
        autoSiteProfiles: document.getElementById('autoSiteProfiles').checked,
        concurrencyLimit: parseInt(document.getElementById('concurrencyLimit').value) || 3,
        retryAttempts: parseInt(document.getElementById('retryAttempts').value) || 2,
        downloadDelay: parseInt(document.getElementById('downloadDelay').value) || 100
      };

      await chrome.storage.sync.set({ settings: this.settings });
      this.showToast('Settings saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.showToast('Failed to save settings', 'error');
    }
  }

  resetSettings() {
    this.settings = this.getDefaultSettings();
    this.applySettingsToUI();
    this.showToast('Settings reset to defaults', 'info');
  }

  updateFilenamePreview() {
    const mask = document.getElementById('filenameMask')?.value || '*name* - *num*.*ext*';
    const preview = this.generateFilenamePreview(mask);
    const previewEl = document.getElementById('filenamePreview');
    if (previewEl) {
      previewEl.textContent = `Preview: ${preview}`;
    }
  }

  // Recipe Management
  async loadRecipes() {
    try {
      const result = await chrome.storage.sync.get('recipes');
      this.recipes = result.recipes || [];
      this.updateRecipesDisplay();
      this.updateBadges();
    } catch (error) {
      console.error('Failed to load recipes:', error);
    }
  }

  updateRecipesDisplay() {
    const container = document.getElementById('recipesList');
    if (!container) return;

    if (this.recipes.length === 0) {
      container.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">No recipes saved yet</p>';
      return;
    }

    const recipesHTML = this.recipes.map((recipe, index) => `
      <div class="recipe-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8f9fa; border-radius: 8px; margin-bottom: 8px; border: 1px solid #e9ecef;">
        <div class="recipe-info">
          <h4 style="margin: 0 0 4px 0; color: #333; font-size: 14px; font-weight: 600;">${recipe.name}</h4>
          <p style="margin: 0; color: #666; font-size: 12px; font-family: monospace;">${recipe.selector}</p>
          ${recipe.description ? `<small style="color: #888; font-size: 11px;">${recipe.description}</small>` : ''}
        </div>
        <div class="recipe-actions" style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" onclick="dashboard.loadRecipe(${index})" style="padding: 6px 10px; font-size: 12px;">📥 Load</button>
          <button class="btn btn-danger" onclick="dashboard.deleteRecipe(${index})" style="padding: 6px 10px; font-size: 12px;">🗑️ Delete</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = recipesHTML;
  }

  async saveRecipe() {
    const recipe = {
      name: document.getElementById('recipeName').value,
      selector: document.getElementById('cssSelector').value,
      description: document.getElementById('recipeDescription').value,
      concurrency: parseInt(document.getElementById('recipeConcurrency').value) || 3,
      retryLimit: parseInt(document.getElementById('recipeRetryLimit').value) || 2,
      mask: document.getElementById('recipeMask').value || '*name* - *num*.*ext*'
    };

    if (!recipe.name || !recipe.selector) {
      this.showToast('Please provide both name and CSS selector', 'warning');
      return;
    }

    try {
      this.recipes.push(recipe);
      await chrome.storage.sync.set({ recipes: this.recipes });
      this.updateRecipesDisplay();
      this.clearRecipeForm();
      this.showToast('Recipe saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save recipe:', error);
      this.showToast('Failed to save recipe', 'error');
    }
  }

  loadRecipe(index) {
    const recipe = this.recipes[index];
    if (!recipe) return;

    document.getElementById('cssSelector').value = recipe.selector;
    document.getElementById('concurrencyLimit').value = recipe.concurrency;
    document.getElementById('retryAttempts').value = recipe.retryLimit;
    document.getElementById('filenameMask').value = recipe.mask;

    this.switchTab('controls');
    this.showToast(`Recipe "${recipe.name}" loaded`, 'success');
  }

  async deleteRecipe(index) {
    try {
      this.recipes.splice(index, 1);
      await chrome.storage.sync.set({ recipes: this.recipes });
      this.updateRecipesDisplay();
      this.showToast('Recipe deleted', 'info');
    } catch (error) {
      console.error('Failed to delete recipe:', error);
      this.showToast('Failed to delete recipe', 'error');
    }
  }

  clearRecipeForm() {
    ['recipeName', 'cssSelector', 'recipeDescription'].forEach(id => {
      const element = document.getElementById(id);
      if (element) element.value = '';
    });
  }

  updateRecipeMaskPreview() {
    const mask = document.getElementById('recipeMask')?.value || '*name* - *num*.*ext*';
    const preview = this.generateFilenamePreview(mask);
    const previewEl = document.getElementById('recipeMaskPreview');
    if (previewEl) {
      previewEl.textContent = `Preview: ${preview}`;
    }
  }

  generateFilenamePreview(mask) {
    return mask
      .replace(/\*name\*/g, 'image')
      .replace(/\*num\*/g, '001')
      .replace(/\*ext\*/g, 'jpg')
      .replace(/\*date\*/g, '2024-01-15')
      .replace(/\*host\*/g, 'example.com')
      .replace(/\*subdirs\*/g, 'gallery')
      .replace(/\*time\*/g, '14-30-45');
  }

  // Export/Import
  exportRecipes() {
    const data = JSON.stringify(this.recipes, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'steptwo-recipes.json';
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Recipes exported', 'success');
  }

  importRecipes() {
    const input = document.getElementById('fileInput');
    input.click();
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const text = await file.text();
        const importedRecipes = JSON.parse(text);
        this.recipes = [...this.recipes, ...importedRecipes];
        await chrome.storage.sync.set({ recipes: this.recipes });
        this.updateRecipesDisplay();
        this.showToast(`Imported ${importedRecipes.length} recipes`, 'success');
      } catch (error) {
        console.error('Import failed:', error);
        this.showToast('Failed to import recipes', 'error');
      }
    };
  }

  // Export Data
  async exportData(format) {
    try {
      await chrome.runtime.sendMessage({
        type: 'export_data',
        format: format
      });
      this.showToast(`Export started (${format.toUpperCase()})`, 'info');
    } catch (error) {
      console.error('Failed to export data:', error);
      this.showToast('Failed to export data', 'error');
    }
  }

  // Stats Update
  async updateStats() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'get_stats'
      });
      if (response && response.stats) {
        this.updateStatsFromMessage(response.stats);
      }
    } catch (error) {
      // Silently fail - background script might not be ready
    }
  }

  // UI Helpers
  updateUI() {
    this.updateStatsDisplay();
    this.updateFilenamePreview();
    this.updateRecipeMaskPreview();
  }

  showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#e74c3c' : type === 'warning' ? '#f39c12' : type === 'success' ? '#27ae60' : '#3498db'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      z-index: 10000;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  handleError(error) {
    console.error('Dashboard error:', error);
    this.showToast(error.message || 'An error occurred', 'error');
  }
}

// Initialize dashboard when DOM is ready
let dashboard;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    dashboard = new WindowedDashboard();
  });
} else {
  dashboard = new WindowedDashboard();
}

// Add animation styles
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(style);