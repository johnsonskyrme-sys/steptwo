// service-worker-modern.js - STEPTWO V2 Unified Service Worker
// Modern Manifest V3 architecture with proven importScripts approach

// Import dependencies using importScripts for reliable service worker compatibility
// Heavy libraries (xlsx, jszip) should be loaded in UI contexts, not service worker
importScripts('../lib/common-utils.js');
importScripts('./download-queue.js');
importScripts('./filename-mask.js');
importScripts('./site-profiles.js');
importScripts('./advanced-export-system.js');

// Load JSON data
let profilesData = {};
let changelogData = {};

// Enhanced async JSON loading with modern async/await
async function loadJSONData() {
  try {
    const [profilesResponse, changelogResponse] = await Promise.all([
      fetch(chrome.runtime.getURL('profiles.json')),
      fetch(chrome.runtime.getURL('changelog.json'))
    ]);
    
    profilesData = await profilesResponse.json();
    changelogData = await changelogResponse.json();
    
    console.log('📊 JSON data loaded successfully');
    // Update profiles reference after data is loaded
    profiles = profilesData;
  } catch (error) {
    console.error('❌ Failed to load JSON data:', error);
    profilesData = {};
    changelogData = {};
  }
}

let profiles = {}; // Will be updated when JSON loads
let autoDetect = true;

// Initialize queue and export system with enhanced error handling
const queue = new DownloadQueue({
  concurrency: 5, 
  retryLimit: 3, 
  hostLimit: 3, 
  maxConcurrency: 10, 
  maxHostLimit: 10
});

const exportSystem = new AdvancedExportSystem({
  enableCompression: true,
  includeMetadata: true
});

// Setup queue listeners and callbacks
queue.attachListeners();
queue.setProgressCallback(progress => {
  // Update badge based on queue progress
  if (progress.stats) {
    const activeDownloads = progress.stats.activeDownloads || 0;
    const totalItems = progress.stats.totalItems || 0;
    const isActive = activeDownloads > 0 || totalItems > 0;
    
    badgeManager.setActive(isActive);
    badgeManager.setActiveJobs(activeDownloads);
    
    // Update queue state for UI
    queueState.running = activeDownloads > 0;
    queueState.active = totalItems > 0;
  }
  
  // Show error badge on failures
  if (progress.state && progress.state.includes('error')) {
    badgeManager.showError();
  }
  
  chrome.runtime.sendMessage({type:'QUEUE_PROGRESS', progress}).catch(() => {});
});

// State management
let lastItems = [];
let dashboardStats = {
  totalItems: 0,
  completed: 0,
  failed: 0,
  duplicates: 0,
  sessionStartTime: Date.now()
};
let queueState = {
  running: false,
  active: false,
  canStart: false
};

// Extension badge management for status indication
class BadgeManager {
  constructor() {
    this.isActive = false;
    this.activeJobs = 0;
    this.lastBadgeUpdate = 0;
    this.updateThrottle = 500; // Throttle updates to avoid excessive badge changes
  }

  updateBadge() {
    const now = Date.now();
    if (now - this.lastBadgeUpdate < this.updateThrottle) {
      return; // Throttle updates
    }
    this.lastBadgeUpdate = now;

    try {
      if (this.isActive && this.activeJobs > 0) {
        // Show active job count
        const badgeText = this.activeJobs > 99 ? '99+' : this.activeJobs.toString();
        chrome.action.setBadgeText({ text: badgeText });
        chrome.action.setBadgeBackgroundColor({ color: '#667eea' });
        chrome.action.setTitle({ title: `STEPTWO V2 - ${this.activeJobs} active downloads` });
      } else if (this.isActive) {
        // Show "ON" status when active but no jobs
        chrome.action.setBadgeText({ text: 'ON' });
        chrome.action.setBadgeBackgroundColor({ color: '#27ae60' });
        chrome.action.setTitle({ title: 'STEPTWO V2 - Ready and active' });
      } else {
        // Clear badge when inactive
        chrome.action.setBadgeText({ text: '' });
        chrome.action.setTitle({ title: 'STEPTWO V2 - Professional Gallery Scraper' });
      }
    } catch (error) {
      console.warn('Failed to update extension badge:', error);
    }
  }

  setActive(active) {
    if (this.isActive !== active) {
      this.isActive = active;
      this.updateBadge();
    }
  }

  setActiveJobs(count) {
    if (this.activeJobs !== count) {
      this.activeJobs = Math.max(0, count);
      this.updateBadge();
    }
  }

  showError() {
    try {
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#e74c3c' });
      chrome.action.setTitle({ title: 'STEPTWO V2 - Error occurred, click to open' });
      
      // Clear error badge after 10 seconds
      setTimeout(() => {
        this.updateBadge();
      }, 10000);
    } catch (error) {
      console.warn('Failed to show error badge:', error);
    }
  }
}

const badgeManager = new BadgeManager();

// Service Worker Load Balancer - optimized for Manifest V3
class ServiceWorkerLoadBalancer {
  constructor() {
    this.taskQueue = [];
    this.isProcessing = false;
    this.maxContinuousTime = 50; // Max 50ms continuous processing
    this.yieldTime = 10; // Yield for 10ms
    this.processedTasks = 0;
    this.maxTasksPerSlice = 10; // Process max 10 tasks per time slice
  }

  enqueueTask(task, priority = 'normal') {
    const taskWrapper = {
      task,
      priority,
      timestamp: Date.now(),
      id: Math.random().toString(36).substr(2, 9)
    };
    
    if (priority === 'high') {
      this.taskQueue.unshift(taskWrapper);
    } else {
      this.taskQueue.push(taskWrapper);
    }
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) {return;}
    
    this.isProcessing = true;
    const startTime = Date.now();
    
    try {
      while (
        this.taskQueue.length > 0 && 
        (Date.now() - startTime) < this.maxContinuousTime &&
        this.processedTasks < this.maxTasksPerSlice
      ) {
        const taskWrapper = this.taskQueue.shift();
        
        try {
          await taskWrapper.task(); // eslint-disable-line no-await-in-loop
          this.processedTasks++;
        } catch (error) {
          console.error('Task processing error:', error);
        }
      }
      
      // Yield control if we have more tasks or have processed many tasks
      if (this.taskQueue.length > 0 || this.processedTasks >= this.maxTasksPerSlice) {
        this.processedTasks = 0;
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, this.yieldTime);
      } else {
        this.isProcessing = false;
      }
      
    } catch (error) {
      console.error('Queue processing error:', error);
      this.isProcessing = false;
    }
  }

  getStats() {
    return {
      queueLength: this.taskQueue.length,
      isProcessing: this.isProcessing,
      processedTasks: this.processedTasks
    };
  }
}

// Initialize load balancer
const loadBalancer = new ServiceWorkerLoadBalancer();

// Dashboard management
let dashboardTabId = null;

// Handle extension icon click to open windowed dashboard
chrome.action.onClicked.addListener(async (tab) => {
  try {
    // Check if dashboard is already open
    const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL('ui/windowed-dashboard.html') });
    
    if (tabs.length > 0) {
      // Focus existing dashboard
      await chrome.tabs.update(tabs[0].id, { active: true });
      await chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      // Open new windowed dashboard
      await chrome.tabs.create({
        url: chrome.runtime.getURL('ui/windowed-dashboard.html'),
        active: true
      });
    }
  } catch (error) {
    console.error('Failed to open dashboard:', error);
  }
});

// Content script injection with enhanced error handling
async function injectContentScriptIfNeeded(tabId, url) {
  try {
    // Skip injection for extension pages, chrome://, and other special URLs
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('moz-extension://')) {
      return false;
    }
    
    // Check if content script is already injected
    try {
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        function: () => window.StepTwoInjected === true
      });
      
      if (results?.[0]?.result) {
        return true; // Already injected
      }
    } catch {
      // Tab might not be ready, continue with injection
    }
    
    // Inject the content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content/injector.js']
    });
    
    console.log(`📄 Content script injected into tab ${tabId}: ${url}`);
    return true;
    
  } catch (error) {
    console.warn(`Failed to inject content script into tab ${tabId}:`, error);
    return false;
  }
}

// Smart injection on tab updates
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const galleryPatterns = [
      /gallery|portfolio|photos|images|album|collection/i,
      /shop|store|products|catalog/i,
      /instagram|pinterest|flickr|unsplash|deviantart/i,
      /reddit\.com\/r\/[^\/]*pics/i,
      /behance|dribbble|artstation/i
    ];
    
    const isPotentialGallery = galleryPatterns.some(pattern => pattern.test(tab.url));
    
    if (isPotentialGallery) {
      console.log(`🎯 Potential gallery detected: ${tab.url}`);
      await injectContentScriptIfNeeded(tabId, tab.url);
    }
  }
});

async function openDashboard() {
  try {
    if (dashboardTabId) {
      try {
        const tab = await chrome.tabs.get(dashboardTabId);
        if (tab) {
          await chrome.tabs.update(dashboardTabId, { active: true });
          await chrome.windows.update(tab.windowId, { focused: true });
          return;
        }
      } catch {
        dashboardTabId = null;
      }
    }
    
    const tab = await chrome.tabs.create({
      url: chrome.runtime.getURL('ui/windowed-dashboard.html'),
      active: true
    });
    
    dashboardTabId = tab.id;
  } catch (error) {
    console.error('Failed to open dashboard:', error);
  }
}

// Track when dashboard tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === dashboardTabId) {
    dashboardTabId = null;
  }
});

// Settings management
let savedConcurrency = 5;
let retryLimit = 3;
let hostLimit = 3;

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'concurrency', 'retryLimit', 'hostLimit'
    ]);
    
    if (settings.concurrency) { savedConcurrency = settings.concurrency; }
    if (settings.retryLimit !== undefined) { 
      retryLimit = settings.retryLimit; 
      queue.setRetryLimit(retryLimit);
    } 
    if (settings.hostLimit !== undefined) { 
      hostLimit = settings.hostLimit; 
      queue.setHostLimit(hostLimit);
    } 
    
    queue.setConcurrency(savedConcurrency);
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Storage change listener
chrome.storage.onChanged.addListener(changes => {
  if (changes.concurrency) {
    queue.setConcurrency(changes.concurrency.newValue);
  }
  if (changes.retryLimit) {
    retryLimit = changes.retryLimit.newValue;
    queue.setRetryLimit(retryLimit);
  }
  if (changes.hostLimit) { 
    hostLimit = changes.hostLimit.newValue; 
    queue.setHostLimit(hostLimit);
  } 
});

// Enhanced message processing with load balancing
async function processMessage(message, priority = 'normal') {
  return new Promise((resolve, reject) => {
    loadBalancer.enqueueTask(async () => {
      try {
        const result = await handleMessage(message);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }, priority);
  });
}

// Main message handler
// Enhanced message handler with error boundaries
async function handleMessage(msg) {
  try {
    // Validate message structure
    if (!msg || typeof msg !== 'object') {
      return {ok: false, error: 'Invalid message format'};
    }

    // Handle version/update messages first (high priority)
    if (msg?.type === 'UPDATE_PROFILES') {
      return {ok: true, updated: false, message: 'Extension uses local profiles only'};
    }
    if (msg?.type === 'CHECK_UPDATE') {
      return {
        ok: true,
        currentVersion: chrome.runtime.getManifest().version,
        remoteVersionInfo: null,
        changelog: changelogData,
        message: 'Extension runs offline - no update checking'
      };
    }

    // Handle main functionality messages with error boundaries
    switch (msg?.type) {
      case 'GET_PROFILES':
        try {
          return {profiles: getProfiles(), autoDetect};
        } catch (error) {
          console.error('Failed to get profiles:', error);
          return {ok: false, error: 'Failed to retrieve profiles'};
        }
        
      case 'DETECT_SITE_PROFILE': {
        try {
          const profile = detectSiteProfile(msg.url);
          const merged = profile ? mergeWithUserSettings(profile, msg.userSettings) : null;
          return {
            profile: merged,
            siteName: profile?.name,
            detected: !!profile
          };
        } catch (error) {
          console.error('Failed to detect site profile:', error);
          return {ok: false, error: 'Failed to detect site profile'};
        }
      }
      
    case 'GET_SITE_PROFILE_LIST':
      return {profiles: getProfileList()};
      
    case 'GET_UNIVERSAL_SELECTORS':
      return {selectors: UNIVERSAL_SELECTORS};

    case 'PREVIEW_FILENAME_MASK':
      const preview = previewMask(msg.mask, msg.context);
      return {preview, tokens: getAvailableTokens()};
      
    case 'QUEUE_ADD_ITEMS': {
      try {
        const promises = (msg.items || []).map(async item => {
          const added = await queue.add(item);
          return {url: item.url, added};
        });
        const results = await Promise.all(promises);
        return {success: true, results};
      } catch (error) {
        console.error('Error adding items to queue:', error);
        return {success: false, error: error.message};
      }
    }
      
    case 'QUEUE_PAUSE':
      queue.pause();
      queueState.running = false;
      badgeManager.setActive(queueState.active);
      return {success: true, queueState};
      
    case 'QUEUE_RESUME':
      queue.resume();
      queueState.running = true;
      badgeManager.setActive(true);
      return {success: true, queueState};
      
    case 'QUEUE_CLEAR':
      queue.clear();
      lastItems = [];
      queueState = {running: false, active: false, canStart: false};
      badgeManager.setActive(false);
      badgeManager.setActiveJobs(0);
      return {success: true, queueState};
      
    case 'QUEUE_STATS':
      return {
        stats: queue.getStats(),
        dashboardStats,
        queueState,
        loadBalancer: loadBalancer.getStats()
      };
      
    case 'CLEAR_SESSION_STATS':
      clearSessionStats();
      return {success: true};
    
    case 'PERFORM_ENHANCED_EXPORT': {
      try {
        if (!lastItems.length) {
          return { success: false, error: 'No items to export' };
        }
        
        const exportData = {
          items: lastItems,
          stats: dashboardStats,
          exportType: msg.exportType || 'comprehensive'
        };
        
        const result = await exportSystem.exportData(exportData, msg.format, msg.filename, msg.options);
        return { success: true, result };
        
      } catch (error) {
        console.error('Enhanced export failed:', error);
        return { success: false, error: error.message };
      }
    }
    
    case 'INJECT_CONTENT_SCRIPT': {
      try {
        const success = await ensureContentScriptInjected(msg.tabId);
        return {success, injected: success};
      } catch (error) {
        return {success: false, error: error.message};
      }
    }
    
    case 'START_SCRAPING': {
      try {
        if (msg.tabId) {
          const injected = await ensureContentScriptInjected(msg.tabId);
          if (!injected) {
            return {success: false, error: 'Failed to inject content script'};
          }
        }
        
        queueState.canStart = true;
        queueState.active = true;
        return {success: true, queueState};
      } catch (error) {
        return {success: false, error: error.message};
      }
    }
    
    default:
      return {error: 'Unknown message type', type: msg?.type};
  }
  } catch (error) {
    console.error('Message handling error:', error);
    return {ok: false, error: 'Internal message processing error'};
  }
}

// Enhanced message listener with load balancing
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const highPriorityTypes = ['CHECK_UPDATE', 'GET_VERSION_INFO', 'GET_CHANGELOG'];
  const priority = highPriorityTypes.includes(msg?.type) ? 'high' : 'normal';
  
  const syncMessageTypes = ['GET_PROFILES', 'GET_CHANGELOG', 'GET_VERSION_INFO', 'UPDATE_PROFILES', 'CHECK_UPDATE'];
  if (syncMessageTypes.includes(msg?.type)) {
    handleMessage(msg, sender).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({error: error.message});
    });
    return true;
  }
  
  processMessage(msg, priority).then(response => {
    sendResponse(response);
  }).catch(error => {
    sendResponse({error: error.message});
  });
  
  return true;
});

// Helper functions
function getProfiles() {
  return profiles;
}

async function ensureContentScriptInjected(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    return await injectContentScriptIfNeeded(tabId, tab.url);
  } catch (error) {
    console.error('Failed to ensure content script injection:', error);
    return false;
  }
}

function clearSessionStats() {
  console.log('🧹 Clearing session stats and resetting memory...');
  
  dashboardStats = {
    totalItems: 0,
    completed: 0,
    failed: 0,
    duplicates: 0,
    sessionStartTime: Date.now()
  };
  
  lastItems = [];
  console.log('✅ Session stats cleared and memory reset');
}

// Initialize extension
async function initializeExtension() {
  try {
    await loadJSONData();
    await loadSettings();
    
    const {autoDetectProfiles} = await chrome.storage.sync.get('autoDetectProfiles');
    if (typeof autoDetectProfiles === 'boolean') {
      autoDetect = autoDetectProfiles;
    }
    
    console.log('🚀 STEPTWO V2 Modern Service Worker loaded with ES modules');
  } catch (error) {
    console.error('❌ Failed to initialize extension:', error);
  }
}

// Start initialization
initializeExtension();

console.log('🚀 STEPTWO V2 Unified Service Worker loaded with proven compatibility');
initializeExtension();