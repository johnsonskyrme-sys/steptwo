// crop-selector.js - Visual crop region selection tool for filtering
// Allows users to drag-select a region on the page for contextual filtering

let cropOverlay = null;
let cropStartPos = null;
let cropEndPos = null;
let isSelecting = false;
let selectionBox = null;

export function startCropSelection() {
  if (cropOverlay) {return;}
  
  createCropOverlay();
  attachEventListeners();
  showInstructions();
}

export function stopCropSelection() {
  if (cropOverlay) {
    cleanup();
  }
}

function createCropOverlay() {
  // Create main overlay
  cropOverlay = document.createElement('div');
  cropOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.3);
    cursor: crosshair;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  `;
  
  // Create instruction panel
  const instructions = document.createElement('div');
  instructions.style.cssText = `
    position: absolute;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    font-size: 14px;
    text-align: center;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  `;
  instructions.innerHTML = `
    <div style="font-weight: 600; margin-bottom: 4px;">🎯 Crop Region Selection</div>
    <div style="font-size: 12px; opacity: 0.9;">
      Click and drag to select a filtering region • Press ESC to cancel
    </div>
  `;
  
  cropOverlay.appendChild(instructions);
  document.body.appendChild(cropOverlay);
}

function attachEventListeners() {
  cropOverlay.addEventListener('mousedown', handleMouseDown);
  cropOverlay.addEventListener('mousemove', handleMouseMove);
  cropOverlay.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('keydown', handleKeyDown);
}

function handleMouseDown(e) {
  e.preventDefault();
  e.stopPropagation();
  
  cropStartPos = {
    x: e.clientX,
    y: e.clientY
  };
  
  isSelecting = true;
  
  // Create selection box
  selectionBox = document.createElement('div');
  selectionBox.style.cssText = `
    position: fixed;
    border: 2px solid #007acc;
    background: rgba(0, 122, 204, 0.2);
    z-index: 2147483648;
    pointer-events: none;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.5);
  `;
  
  document.body.appendChild(selectionBox);
}

function handleMouseMove(e) {
  if (!isSelecting || !selectionBox) {return;}
  
  cropEndPos = {
    x: e.clientX,
    y: e.clientY
  };
  
  updateSelectionBox();
}

function handleMouseUp(e) {
  if (!isSelecting || !cropStartPos || !cropEndPos) {return;}
  
  e.preventDefault();
  e.stopPropagation();
  
  const coordinates = calculateCoordinates();
  
  // Only complete selection if the region has meaningful size
  if (coordinates.width >= 20 && coordinates.height >= 20) {
    completeSelection(coordinates);
  } else {
    showMessage('Selection too small. Please select a larger region.');
    resetSelection();
  }
}

function handleKeyDown(e) {
  if (e.key === 'Escape') {
    e.preventDefault();
    cancelSelection();
  }
}

function updateSelectionBox() {
  if (!selectionBox || !cropStartPos || !cropEndPos) {return;}
  
  const left = Math.min(cropStartPos.x, cropEndPos.x);
  const top = Math.min(cropStartPos.y, cropEndPos.y);
  const width = Math.abs(cropEndPos.x - cropStartPos.x);
  const height = Math.abs(cropEndPos.y - cropStartPos.y);
  
  selectionBox.style.left = `${left  }px`;
  selectionBox.style.top = `${top  }px`;
  selectionBox.style.width = `${width  }px`;
  selectionBox.style.height = `${height  }px`;
}

function calculateCoordinates() {
  const left = Math.min(cropStartPos.x, cropEndPos.x);
  const top = Math.min(cropStartPos.y, cropEndPos.y);
  const width = Math.abs(cropEndPos.x - cropStartPos.x);
  const height = Math.abs(cropEndPos.y - cropStartPos.y);
  
  return {
    x: left,
    y: top,
    width: width,
    height: height,
    right: left + width,
    bottom: top + height
  };
}

function completeSelection(coordinates) {
  // Send coordinates back to dashboard
  chrome.runtime.sendMessage({
    type: 'CROP_SELECTION_COMPLETE',
    coordinates: coordinates
  });
  
  showMessage('Crop region selected successfully!', 'success');
  
  setTimeout(() => {
    cleanup();
  }, 1500);
}

function cancelSelection() {
  showMessage('Crop selection cancelled', 'info');
  setTimeout(() => {
    cleanup();
  }, 1000);
}

function resetSelection() {
  isSelecting = false;
  cropStartPos = null;
  cropEndPos = null;
  
  if (selectionBox) {
    selectionBox.remove();
    selectionBox = null;
  }
}

function showMessage(text, type = 'info') {
  const message = document.createElement('div');
  const bgColor = type === 'success' ? 'rgba(39, 174, 96, 0.9)' : 
    type === 'error' ? 'rgba(231, 76, 60, 0.9)' : 
      'rgba(52, 152, 219, 0.9)';
  
  message.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: ${bgColor};
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    z-index: 2147483649;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
  `;
  message.textContent = text;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    if (message.parentNode) {
      message.remove();
    }
  }, 2000);
}

function showInstructions() {
  // Instructions are already shown in the overlay
}

function cleanup() {
  resetSelection();
  
  if (cropOverlay) {
    cropOverlay.remove();
    cropOverlay = null;
  }
  
  document.removeEventListener('keydown', handleKeyDown);
}

// Message listener for content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_CROP_SELECTION') {
    startCropSelection();
    sendResponse({ success: true });
  } else if (message.type === 'STOP_CROP_SELECTION') {
    stopCropSelection();
    sendResponse({ success: true });
  }
});

// Cleanup on page unload
window.addEventListener('beforeunload', cleanup);