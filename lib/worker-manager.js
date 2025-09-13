// worker-manager.js - Manages web workers for heavy operations
// Provides a clean interface to offload CPU-intensive tasks

class WorkerManager {
  constructor() {
    this.workers = new Map();
    this.taskQueue = [];
    this.currentTasks = new Map();
    this.taskIdCounter = 0;
    this.maxWorkers = Math.min(navigator.hardwareConcurrency || 2, 4);
    this.isInitialized = false;
  }
  
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      // Create initial worker pool
      for (let i = 0; i < this.maxWorkers; i++) {
        await this.createWorker(`worker-${i}`);
      }
      
      this.isInitialized = true;
      console.log(`✅ Worker pool initialized with ${this.workers.size} workers`);
    } catch (error) {
      console.error('❌ Failed to initialize worker pool:', error);
      throw error;
    }
  }
  
  async createWorker(id) {
    try {
      const workerUrl = chrome.runtime.getURL('workers/heavy-operations-worker.js');
      const worker = new Worker(workerUrl);
      
      worker.onmessage = (event) => this.handleWorkerMessage(id, event);
      worker.onerror = (error) => this.handleWorkerError(id, error);
      
      this.workers.set(id, {
        worker,
        busy: false,
        tasks: new Set()
      });
      
      // Wait for worker to be ready
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Worker initialization timeout'));
        }, 5000);
        
        const messageHandler = (event) => {
          if (event.data.type === 'ready') {
            clearTimeout(timeout);
            worker.removeEventListener('message', messageHandler);
            resolve();
          }
        };
        
        worker.addEventListener('message', messageHandler);
      });
    } catch (error) {
      console.error(`Failed to create worker ${id}:`, error);
      throw error;
    }
  }
  
  async executeTask(task, data, options = {}) {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const taskId = `task-${++this.taskIdCounter}`;
    
    return new Promise((resolve, reject) => {
      const taskInfo = {
        id: taskId,
        task,
        data,
        options,
        resolve,
        reject,
        timestamp: Date.now()
      };
      
      this.currentTasks.set(taskId, taskInfo);
      
      // Try to assign to available worker immediately
      const availableWorker = this.getAvailableWorker();
      if (availableWorker) {
        this.assignTaskToWorker(availableWorker, taskInfo);
      } else {
        // Queue the task
        this.taskQueue.push(taskInfo);
      }
      
      // Set timeout for task execution
      const timeout = options.timeout || 30000;
      setTimeout(() => {
        if (this.currentTasks.has(taskId)) {
          this.currentTasks.delete(taskId);
          reject(new Error(`Task timeout after ${timeout}ms`));
        }
      }, timeout);
    });
  }
  
  getAvailableWorker() {
    for (const [id, workerInfo] of this.workers) {
      if (!workerInfo.busy) {
        return { id, ...workerInfo };
      }
    }
    return null;
  }
  
  assignTaskToWorker(workerInfo, taskInfo) {
    workerInfo.busy = true;
    workerInfo.tasks.add(taskInfo.id);
    
    workerInfo.worker.postMessage({
      id: taskInfo.id,
      task: taskInfo.task,
      data: taskInfo.data,
      options: taskInfo.options
    });
  }
  
  handleWorkerMessage(workerId, event) {
    const { id, success, result, error } = event.data;
    
    if (!id || !this.currentTasks.has(id)) {
      return; // Ignore unknown or completed tasks
    }
    
    const taskInfo = this.currentTasks.get(id);
    this.currentTasks.delete(id);
    
    // Mark worker as available
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      workerInfo.busy = false;
      workerInfo.tasks.delete(id);
      
      // Process next queued task if any
      if (this.taskQueue.length > 0) {
        const nextTask = this.taskQueue.shift();
        this.assignTaskToWorker(workerInfo, nextTask);
      }
    }
    
    // Resolve or reject the task promise
    if (success) {
      taskInfo.resolve(result);
    } else {
      taskInfo.reject(new Error(error || 'Worker task failed'));
    }
  }
  
  handleWorkerError(workerId, error) {
    console.error(`Worker ${workerId} error:`, error);
    
    // Mark all tasks from this worker as failed
    const workerInfo = this.workers.get(workerId);
    if (workerInfo) {
      for (const taskId of workerInfo.tasks) {
        if (this.currentTasks.has(taskId)) {
          const taskInfo = this.currentTasks.get(taskId);
          taskInfo.reject(new Error(`Worker error: ${error.message}`));
          this.currentTasks.delete(taskId);
        }
      }
      
      // Try to recreate the worker
      this.recreateWorker(workerId);
    }
  }
  
  async recreateWorker(workerId) {
    try {
      console.log(`🔄 Recreating worker ${workerId}`);
      
      // Terminate the old worker
      const oldWorkerInfo = this.workers.get(workerId);
      if (oldWorkerInfo) {
        oldWorkerInfo.worker.terminate();
      }
      
      // Create a new worker
      await this.createWorker(workerId);
      console.log(`✅ Worker ${workerId} recreated successfully`);
    } catch (error) {
      console.error(`❌ Failed to recreate worker ${workerId}:`, error);
    }
  }
  
  // Convenience methods for common tasks
  async computeImageHash(imageData, options = {}) {
    return this.executeTask('computeImageHash', imageData, options);
  }
  
  async compressData(data, options = {}) {
    return this.executeTask('compressData', data, options);
  }
  
  async processBatchImages(imageUrls, options = {}) {
    return this.executeTask('processBatchImages', imageUrls, options);
  }
  
  // Get worker statistics
  getStats() {
    const stats = {
      totalWorkers: this.workers.size,
      busyWorkers: 0,
      queuedTasks: this.taskQueue.length,
      activeTasks: this.currentTasks.size,
      initialized: this.isInitialized
    };
    
    for (const workerInfo of this.workers.values()) {
      if (workerInfo.busy) {
        stats.busyWorkers++;
      }
    }
    
    return stats;
  }
  
  // Cleanup
  terminate() {
    for (const workerInfo of this.workers.values()) {
      workerInfo.worker.terminate();
    }
    
    // Reject all pending tasks
    for (const taskInfo of this.currentTasks.values()) {
      taskInfo.reject(new Error('Worker manager terminated'));
    }
    
    this.workers.clear();
    this.currentTasks.clear();
    this.taskQueue.length = 0;
    this.isInitialized = false;
    
    console.log('🛑 Worker manager terminated');
  }
}

// Create singleton instance
const workerManager = new WorkerManager();

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.WorkerManager = WorkerManager;
  window.workerManager = workerManager;
} else if (typeof self !== 'undefined') {
  self.WorkerManager = WorkerManager;
  self.workerManager = workerManager;
}

export { WorkerManager, workerManager };