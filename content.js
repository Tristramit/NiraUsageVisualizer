/*
 * File: content.js
 * Description: Enhanced content script that directly modifies the existing Nira UI element
 * with improved event handling to prevent disappearing controls
 */

// Configuration constants
const PLAN_LIMITS = {
  individual: {
    triangles: 100, // million
    textures: 20, // gigapixels
    photos: 100, // gigapixels
    points: 100 // million
  },
  professional: {
    triangles: 400, // million
    textures: 50, // gigapixels
    photos: 200, // gigapixels
    points: 500 // million
  }
};

const ADDITIONAL_STORAGE_PRICING = {
  monthly: {
    triangles: 4, // $ per 100 million
    textures: 4, // $ per 10 gigapixels
    photos: 1, // $ per 20 gigapixels
    points: 4  // $ per 500 million
  },
  yearly: {
    triangles: 3, // $ per 100 million
    textures: 3, // $ per 10 gigapixels
    photos: 1, // $ per 20 gigapixels
    points: 3  // $ per 500 million
  }
};

const ADDITIONAL_STORAGE_UNITS = {
  triangles: 100, // million per unit
  textures: 10,   // gigapixels per unit
  photos: 20,     // gigapixels per unit
  points: 500     // million per unit
};

// State management
let state = {
  currentUsage: {
    triangles: 0,
    textures: 0,
    photos: 0,
    points: 0,
    assetCount: 0
  },
  selectedPlan: 'professional',
  billingCycle: 'monthly',
  additionalStorage: {
    triangles: 0,
    textures: 0,
    photos: 0,
    points: 0
  },
  additionalSectionExpanded: false,
  // Track if UI has been initialized
  uiInitialized: false
};

// Initialize the extension
function initializeExtension() {
  console.log('Nira Usage Visualizer initializing...');
  
  // First, load saved state
  loadState();
  
  // Check if we're on the usage page
  if (!window.location.href.includes('/usage')) {
    console.log('Not on usage page, extension idle');
    return;
  }
  
  // Look for the usage element on an interval since it might load dynamically
  const observer = new MutationObserver((mutations) => {
    const usageElement = document.querySelector('.MuiGrid-container .MuiTypography-body1');
    if (usageElement && !state.uiInitialized) {
      console.log('Found Nira usage element');
      extractUsageData();
      enhanceUsageDisplay();
      state.uiInitialized = true;
    }
  });
  
  // Start observing for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Also try immediately in case the element is already there
  if (document.querySelector('.MuiGrid-container .MuiTypography-body1') && !state.uiInitialized) {
    console.log('Found Nira usage element immediately');
    extractUsageData();
    enhanceUsageDisplay();
    state.uiInitialized = true;
  }
  
  // Set up event listeners at document level
  setupEventListeners();
}

// Extract usage data from the page
function extractUsageData() {
  // Find all Typography elements that contain usage data
  const usageElements = document.querySelectorAll('.MuiTypography-body1');
  
  if (usageElements.length) {
    usageElements.forEach(element => {
      const text = element.textContent.trim();
      
      if (text.includes('Triangles:')) {
        const match = text.match(/Triangles:\s+([\d.]+)\s+million/);
        if (match) state.currentUsage.triangles = parseFloat(match[1]);
      } 
      else if (text.includes('Textures:')) {
        const match = text.match(/Textures:\s+([\d.]+)\s+gigapixels/);
        if (match) state.currentUsage.textures = parseFloat(match[1]);
      }
      else if (text.includes('Photos:')) {
        const match = text.match(/Photos:\s+([\d.]+)\s+gigapixels/);
        if (match) state.currentUsage.photos = parseFloat(match[1]);
      }
      else if (text.includes('Points:')) {
        const match = text.match(/Points:\s+(\d+)/);
        if (match) state.currentUsage.points = parseFloat(match[1]);
      }
      else if (text.includes('Asset Count:')) {
        const match = text.match(/Asset Count:\s+(\d+)/);
        if (match) state.currentUsage.assetCount = parseInt(match[1]);
      }
    });
    
    console.log('Extracted usage data:', state.currentUsage);
  }
}

// Enhance the existing usage display
function enhanceUsageDisplay() {
  // Find the container div that holds all the typography elements
  const container = document.querySelector('.MuiGrid-container > div');
  if (!container) {
    console.error('Could not find the container element');
    return;
  }
  
  // Add a unique ID to the container for easier reference and to prevent duplicate enhancement
  container.id = 'nira-usage-container';
  
  // Get the original Active label (first element)
  const activeLabel = container.querySelector('.MuiTypography-body1');
  
  // Only proceed if we haven't already enhanced this container
  if (!container.querySelector('.nira-resource-container') && activeLabel) {
    console.log('Enhancing usage display');
    
    // Keep the "Active:" label unchanged
    const firstChild = activeLabel.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(firstChild);
    
    // For each usage metric, create an enhanced version with visualization
    const resources = [
      { name: 'Triangles', value: state.currentUsage.triangles, unit: 'million' },
      { name: 'Textures', value: state.currentUsage.textures, unit: 'gigapixels' },
      { name: 'Photos', value: state.currentUsage.photos, unit: 'gigapixels' },
      { name: 'Points', value: state.currentUsage.points, unit: 'million' }
    ];
    
    // Calculate effective limits with additional storage
    const baseLimits = PLAN_LIMITS[state.selectedPlan];
    const effectiveLimits = {
      triangles: baseLimits.triangles + (state.additionalStorage.triangles * ADDITIONAL_STORAGE_UNITS.triangles),
      textures: baseLimits.textures + (state.additionalStorage.textures * ADDITIONAL_STORAGE_UNITS.textures),
      photos: baseLimits.photos + (state.additionalStorage.photos * ADDITIONAL_STORAGE_UNITS.photos),
      points: baseLimits.points + (state.additionalStorage.points * ADDITIONAL_STORAGE_UNITS.points)
    };
    
    // Check if any resource exceeds limit
    const hasExceededLimit = 
      state.currentUsage.triangles > effectiveLimits.triangles ||
      state.currentUsage.textures > effectiveLimits.textures ||
      state.currentUsage.photos > effectiveLimits.photos ||
      state.currentUsage.points > effectiveLimits.points;
    
    // Create enhanced elements
    resources.forEach((resource) => {
      const baseLimit = baseLimits[resource.name.toLowerCase()];
      const effectiveLimit = effectiveLimits[resource.name.toLowerCase()];
      
      // Create enhanced element
      const enhancedElement = createEnhancedResourceElement(
        resource.name, 
        resource.value, 
        baseLimit, 
        effectiveLimit, 
        resource.unit
      );
      
      container.appendChild(enhancedElement);
    });
    
    // Keep the asset count
    const assetCountElement = document.createElement('p');
    assetCountElement.className = 'MuiTypography-root MuiTypography-body1';
    assetCountElement.textContent = `Asset Count: ${state.currentUsage.assetCount}`;
    container.appendChild(assetCountElement);
    
    // Add warning if limits exceeded
    if (hasExceededLimit) {
      const warningElement = document.createElement('div');
      warningElement.className = 'nira-limit-warning';
      warningElement.innerHTML = `
        <p class="nira-limit-warning-text">⚠️ Some resources exceed your ${state.selectedPlan} plan limits</p>
      `;
      container.appendChild(warningElement);
    }
    
    // Inject our additional UI
    injectControlsUI(container);
    
    // Inject custom styles
    injectStyles();
  } else {
    // If already enhanced, just update the UI
    updateUI();
  }
}

// Create an enhanced resource element with visualization
function createEnhancedResourceElement(name, value, baseLimit, effectiveLimit, unit) {
  const percentage = Math.min(100, (value / effectiveLimit) * 100);
  const isOverLimit = value > effectiveLimit;
  const hasAdditional = effectiveLimit > baseLimit;
  
  // Determine color based on percentage
  let barColor;
  if (isOverLimit) {
    barColor = '#ef4444'; // Red
  } else if (percentage > 90) {
    barColor = '#f59e0b'; // Yellow/orange
  } else if (percentage > 70) {
    barColor = '#f59e0b'; // Yellow/orange
  } else {
    barColor = '#10b981'; // Green
  }
  
  // Create container div
  const container = document.createElement('div');
  container.className = 'nira-resource-container';
  container.style.marginBottom = '12px';
  
  // Resource info line (similar to original)
  const infoElement = document.createElement('p');
  infoElement.className = 'MuiTypography-root MuiTypography-body1';
  infoElement.innerHTML = `${name}: <strong>${value.toLocaleString()}</strong> ${unit} / <strong>${effectiveLimit.toLocaleString()}</strong> ${unit}`;
  container.appendChild(infoElement);
  
  // Progress bar container
  const progressContainer = document.createElement('div');
  progressContainer.className = 'nira-progress-container';
  progressContainer.style.width = '100%';
  progressContainer.style.height = '8px';
  progressContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  progressContainer.style.borderRadius = '4px';
  progressContainer.style.overflow = 'hidden';
  progressContainer.style.position = 'relative';
  progressContainer.style.marginTop = '4px';
  
  // Progress bar
  const progressBar = document.createElement('div');
  progressBar.className = 'nira-progress-bar';
  progressBar.style.height = '100%';
  progressBar.style.width = `${percentage}%`;
  progressBar.style.backgroundColor = barColor;
  progressBar.style.borderRadius = '4px';
  progressBar.style.transition = 'width 0.5s ease-in-out';
  progressContainer.appendChild(progressBar);
  
  // Base limit indicator (if additional storage exists)
  if (hasAdditional) {
    const baseIndicator = document.createElement('div');
    baseIndicator.className = 'nira-base-indicator';
    baseIndicator.style.position = 'absolute';
    baseIndicator.style.top = '0';
    baseIndicator.style.left = `${(baseLimit / effectiveLimit) * 100}%`;
    baseIndicator.style.height = '100%';
    baseIndicator.style.borderRight = '2px dashed rgba(255, 255, 255, 0.5)';
    progressContainer.appendChild(baseIndicator);
  }
  
  container.appendChild(progressContainer);
  
  // Progress info
  const progressInfo = document.createElement('div');
  progressInfo.className = 'nira-progress-info';
  progressInfo.style.display = 'flex';
  progressInfo.style.justifyContent = 'space-between';
  progressInfo.style.fontSize = '0.75rem';
  progressInfo.style.color = 'rgba(255, 255, 255, 0.7)';
  progressInfo.style.marginTop = '2px';
  
  // Percentage
  const percentageElement = document.createElement('span');
  percentageElement.className = 'nira-percentage';
  percentageElement.style.color = isOverLimit ? '#ef4444' : 'rgba(255, 255, 255, 0.7)';
  percentageElement.style.fontWeight = isOverLimit ? 'bold' : 'normal';
  percentageElement.textContent = `${percentage.toFixed(1)}%`;
  progressInfo.appendChild(percentageElement);
  
  // Additional info
  if (hasAdditional || isOverLimit) {
    const additionalInfo = document.createElement('span');
    additionalInfo.className = 'nira-additional-info';
    
    if (hasAdditional) {
      additionalInfo.textContent = `Base: ${baseLimit} + Add'l: ${effectiveLimit - baseLimit} ${unit}`;
    }
    
    if (isOverLimit) {
      const exceededInfo = document.createElement('span');
      exceededInfo.style.color = '#ef4444';
      exceededInfo.style.marginLeft = '8px';
      exceededInfo.textContent = `Exceeds by ${(value - effectiveLimit).toFixed(2)} ${unit}`;
      additionalInfo.appendChild(exceededInfo);
    }
    
    progressInfo.appendChild(additionalInfo);
  }
  
  container.appendChild(progressInfo);
  
  return container;
}

// Inject UI for plan selection and additional storage
function injectControlsUI(container) {
  // Create container for controls
  const controlsContainer = document.createElement('div');
  controlsContainer.id = 'nira-controls-container';
  controlsContainer.className = 'nira-controls-container';
  controlsContainer.style.marginTop = '20px';
  controlsContainer.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
  controlsContainer.style.paddingTop = '12px';
  
  // Plan selection
  const planSelector = document.createElement('div');
  planSelector.className = 'nira-plan-selector';
  planSelector.style.marginBottom = '16px';
  
  const planLabel = document.createElement('label');
  planLabel.textContent = 'Plan:';
  planLabel.style.marginRight = '8px';
  planLabel.style.color = 'white';
  planSelector.appendChild(planLabel);
  
  const planSelect = document.createElement('select');
  planSelect.id = 'nira-plan-select';
  planSelect.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  planSelect.style.color = 'white';
  planSelect.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  planSelect.style.borderRadius = '4px';
  planSelect.style.padding = '4px 8px';
  
  const individualOption = document.createElement('option');
  individualOption.value = 'individual';
  individualOption.textContent = 'Individual Plan';
  individualOption.selected = state.selectedPlan === 'individual';
  planSelect.appendChild(individualOption);
  
  const professionalOption = document.createElement('option');
  professionalOption.value = 'professional';
  professionalOption.textContent = 'Professional Plan';
  professionalOption.selected = state.selectedPlan === 'professional';
  planSelect.appendChild(professionalOption);
  
  planSelector.appendChild(planSelect);
  controlsContainer.appendChild(planSelector);
  
  // Additional storage toggle
  const additionalStorageToggle = document.createElement('div');
  additionalStorageToggle.id = 'nira-additional-storage-toggle';
  additionalStorageToggle.className = 'nira-additional-storage-toggle';
  additionalStorageToggle.style.cursor = 'pointer';
  additionalStorageToggle.style.display = 'flex';
  additionalStorageToggle.style.justifyContent = 'space-between';
  additionalStorageToggle.style.alignItems = 'center';
  additionalStorageToggle.style.padding = '8px 0';
  additionalStorageToggle.style.borderTop = '1px solid rgba(255, 255, 255, 0.1)';
  
  const toggleLabel = document.createElement('span');
  toggleLabel.textContent = 'Additional Storage';
  toggleLabel.style.color = 'white';
  toggleLabel.style.fontWeight = 'bold';
  additionalStorageToggle.appendChild(toggleLabel);
  
  const toggleAction = document.createElement('span');
  toggleAction.textContent = state.additionalSectionExpanded ? 'Hide' : 'Show';
  toggleAction.style.color = 'rgba(255, 255, 255, 0.7)';
  additionalStorageToggle.appendChild(toggleAction);
  
  controlsContainer.appendChild(additionalStorageToggle);
  
  // Additional storage section
  const additionalStorageSection = document.createElement('div');
  additionalStorageSection.id = 'nira-additional-storage-section';
  additionalStorageSection.className = 'nira-additional-storage-section';
  additionalStorageSection.style.padding = '12px';
  additionalStorageSection.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
  additionalStorageSection.style.borderRadius = '4px';
  additionalStorageSection.style.marginTop = '8px';
  additionalStorageSection.style.display = state.additionalSectionExpanded ? 'block' : 'none';
  
  // Billing cycle
  const billingSection = document.createElement('div');
  billingSection.style.marginBottom = '12px';
  
  const billingLabel = document.createElement('label');
  billingLabel.textContent = 'Billing Cycle:';
  billingLabel.style.display = 'block';
  billingLabel.style.marginBottom = '4px';
  billingLabel.style.color = 'white';
  billingSection.appendChild(billingLabel);
  
  const billingSelect = document.createElement('select');
  billingSelect.id = 'nira-billing-select';
  billingSelect.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
  billingSelect.style.color = 'white';
  billingSelect.style.border = '1px solid rgba(255, 255, 255, 0.2)';
  billingSelect.style.borderRadius = '4px';
  billingSelect.style.padding = '4px 8px';
  billingSelect.style.width = '100%';
  
  const monthlyOption = document.createElement('option');
  monthlyOption.value = 'monthly';
  monthlyOption.textContent = 'Monthly Billing';
  monthlyOption.selected = state.billingCycle === 'monthly';
  billingSelect.appendChild(monthlyOption);
  
  const yearlyOption = document.createElement('option');
  yearlyOption.value = 'yearly';
  yearlyOption.textContent = 'Yearly Billing';
  yearlyOption.selected = state.billingCycle === 'yearly';
  billingSelect.appendChild(yearlyOption);
  
  billingSection.appendChild(billingSelect);
  additionalStorageSection.appendChild(billingSection);
  
  // Additional storage inputs
  const storageInputs = document.createElement('div');
  storageInputs.style.display = 'grid';
  storageInputs.style.gridGap = '12px';
  
  const resources = [
    { name: 'Triangles', key: 'triangles', unit: '100M', unitLong: 'million' },
    { name: 'Textures', key: 'textures', unit: '10GP', unitLong: 'gigapixels' },
    { name: 'Photos', key: 'photos', unit: '20GP', unitLong: 'gigapixels' },
    { name: 'Points', key: 'points', unit: '500M', unitLong: 'million' }
  ];
  
  resources.forEach(resource => {
    const inputRow = document.createElement('div');
    inputRow.style.display = 'flex';
    inputRow.style.alignItems = 'center';
    
    const inputLabel = document.createElement('label');
    inputLabel.style.width = '80px';
    inputLabel.style.color = 'white';
    inputLabel.textContent = resource.name;
    inputRow.appendChild(inputLabel);
    
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `nira-additional-${resource.key}`;
    input.className = 'nira-storage-input';
    input.min = 0;
    input.value = state.additionalStorage[resource.key];
    input.style.width = '60px';
    input.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    input.style.color = 'white';
    input.style.border = '1px solid rgba(255, 255, 255, 0.2)';
    input.style.borderRadius = '4px';
    input.style.padding = '4px 8px';
    inputRow.appendChild(input);
    
    const unitLabel = document.createElement('span');
    unitLabel.style.marginLeft = '8px';
    unitLabel.style.color = 'rgba(255, 255, 255, 0.7)';
    unitLabel.textContent = `× ${resource.unit}`;
    inputRow.appendChild(unitLabel);
    
    // Cost display
    const pricing = ADDITIONAL_STORAGE_PRICING[state.billingCycle];
    const cost = state.additionalStorage[resource.key] * pricing[resource.key];
    
    const costLabel = document.createElement('span');
    costLabel.id = `nira-${resource.key}-cost`;
    costLabel.style.marginLeft = 'auto';
    costLabel.style.color = 'rgba(255, 255, 255, 0.7)';
    if (cost > 0) {
      costLabel.textContent = `($${cost}/mo)`;
    }
    inputRow.appendChild(costLabel);
    
    storageInputs.appendChild(inputRow);
  });
  
  additionalStorageSection.appendChild(storageInputs);
  
  // Total cost
  const costs = calculateCosts();
  
  const totalCostContainer = document.createElement('div');
  totalCostContainer.style.marginTop = '16px';
  totalCostContainer.style.padding = '8px 12px';
  totalCostContainer.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
  totalCostContainer.style.borderRadius = '4px';
  totalCostContainer.style.display = 'flex';
  totalCostContainer.style.justifyContent = 'space-between';
  totalCostContainer.style.alignItems = 'center';
  
  const totalCostLabel = document.createElement('span');
  totalCostLabel.style.color = 'white';
  totalCostLabel.textContent = 'Total Additional Cost:';
  totalCostContainer.appendChild(totalCostLabel);
  
  const totalCostValue = document.createElement('span');
  totalCostValue.id = 'nira-total-cost';
  totalCostValue.style.color = 'white';
  totalCostValue.style.fontWeight = 'bold';
  totalCostValue.textContent = `$${costs.total.toFixed(2)}/${state.billingCycle === 'monthly' ? 'month' : 'month (yearly billing)'}`;
  totalCostContainer.appendChild(totalCostValue);
  
  additionalStorageSection.appendChild(totalCostContainer);
  
  controlsContainer.appendChild(additionalStorageSection);
  
  // Add controls to main container
  container.appendChild(controlsContainer);
}

// Update the UI when state changes
function updateUI() {
  // Find the container div that holds all the typography elements
  const container = document.querySelector('.MuiGrid-container > div');
  if (!container) return;
  
  // If the container doesn't have our enhanced elements, reinitialize
  if (!container.querySelector('.nira-resource-container')) {
    state.uiInitialized = false;
    enhanceUsageDisplay();
    return;
  }
  
  // Calculate new effective limits
  const baseLimits = PLAN_LIMITS[state.selectedPlan];
  const effectiveLimits = {
    triangles: baseLimits.triangles + (state.additionalStorage.triangles * ADDITIONAL_STORAGE_UNITS.triangles),
    textures: baseLimits.textures + (state.additionalStorage.textures * ADDITIONAL_STORAGE_UNITS.textures),
    photos: baseLimits.photos + (state.additionalStorage.photos * ADDITIONAL_STORAGE_UNITS.photos),
    points: baseLimits.points + (state.additionalStorage.points * ADDITIONAL_STORAGE_UNITS.points)
  };
  
  // Update each resource display
  const resources = [
    { name: 'Triangles', value: state.currentUsage.triangles, unit: 'million' },
    { name: 'Textures', value: state.currentUsage.textures, unit: 'gigapixels' },
    { name: 'Photos', value: state.currentUsage.photos, unit: 'gigapixels' },
    { name: 'Points', value: state.currentUsage.points, unit: 'million' }
  ];
  
  resources.forEach((resource, index) => {
    const resourceName = resource.name.toLowerCase();
    const baseLimit = baseLimits[resourceName];
    const effectiveLimit = effectiveLimits[resourceName];
    
    // Find the existing container
    const containers = container.querySelectorAll('.nira-resource-container');
    if (containers.length <= index) return;
    
    const resourceContainer = containers[index];
    
    // Update the text
    const infoElement = resourceContainer.querySelector('.MuiTypography-body1');
    if (infoElement) {
      infoElement.innerHTML = `${resource.name}: <strong>${resource.value.toLocaleString()}</strong> ${resource.unit} / <strong>${effectiveLimit.toLocaleString()}</strong> ${resource.unit}`;
    }
    
    // Update the progress bar
    const percentage = Math.min(100, (resource.value / effectiveLimit) * 100);
    const isOverLimit = resource.value > effectiveLimit;
    const hasAdditional = effectiveLimit > baseLimit;
    
    // Determine color based on percentage
    let barColor;
    if (isOverLimit) {
      barColor = '#ef4444'; // Red
    } else if (percentage > 90) {
      barColor = '#f59e0b'; // Yellow/orange
    } else if (percentage > 70) {
      barColor = '#f59e0b'; // Yellow/orange
    } else {
      barColor = '#10b981'; // Green
    }
    
    const progressBar = resourceContainer.querySelector('.nira-progress-bar');
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.style.backgroundColor = barColor;
    }
    
    // Update or create base indicator
    let baseIndicator = resourceContainer.querySelector('.nira-base-indicator');
    if (hasAdditional) {
      if (!baseIndicator) {
        baseIndicator = document.createElement('div');
        baseIndicator.className = 'nira-base-indicator';
        baseIndicator.style.position = 'absolute';
        baseIndicator.style.top = '0';
        baseIndicator.style.height = '100%';
        baseIndicator.style.borderRight = '2px dashed rgba(255, 255, 255, 0.5)';
        const progressContainer = resourceContainer.querySelector('.nira-progress-container');
        if (progressContainer) {
          progressContainer.appendChild(baseIndicator);
        }
      }
      baseIndicator.style.left = `${(baseLimit / effectiveLimit) * 100}%`;
    } else if (baseIndicator) {
      baseIndicator.style.display = 'none';
    }
    
    // Update percentage and additional info
    const percentageElement = resourceContainer.querySelector('.nira-percentage');
    if (percentageElement) {
      percentageElement.textContent = `${percentage.toFixed(1)}%`;
      percentageElement.style.color = isOverLimit ? '#ef4444' : 'rgba(255, 255, 255, 0.7)';
      percentageElement.style.fontWeight = isOverLimit ? 'bold' : 'normal';
    }
    
    const additionalInfo = resourceContainer.querySelector('.nira-additional-info');
    if (additionalInfo) {
      if (hasAdditional || isOverLimit) {
        let text = '';
        if (hasAdditional) {
          text = `Base: ${baseLimit} + Add'l: ${effectiveLimit - baseLimit} ${resource.unit}`;
        }
        additionalInfo.innerHTML = text;
        
        if (isOverLimit) {
          const exceededInfo = document.createElement('span');
          exceededInfo.style.color = '#ef4444';
          exceededInfo.style.marginLeft = '8px';
          exceededInfo.textContent = `Exceeds by ${(resource.value - effectiveLimit).toFixed(2)} ${resource.unit}`;
          additionalInfo.appendChild(exceededInfo);
        }
      } else {
        additionalInfo.innerHTML = '';
      }
    }
  });
  
  // Check if any resource exceeds limit
  const hasExceededLimit = 
    state.currentUsage.triangles > effectiveLimits.triangles ||
    state.currentUsage.textures > effectiveLimits.textures ||
    state.currentUsage.photos > effectiveLimits.photos ||
    state.currentUsage.points > effectiveLimits.points;
  
  // Update warning message
  let warningElement = container.querySelector('.nira-limit-warning');
  if (hasExceededLimit) {
    if (!warningElement) {
      warningElement = document.createElement('div');
      warningElement.className = 'nira-limit-warning';
      warningElement.innerHTML = `
        <p class="nira-limit-warning-text">⚠️ Some resources exceed your ${state.selectedPlan} plan limits</p>
      `;
      // Insert before controls
      const controlsContainer = container.querySelector('#nira-controls-container');
      if (controlsContainer) {
        container.insertBefore(warningElement, controlsContainer);
      } else {
        container.appendChild(warningElement);
      }
    } else {
      const warningText = warningElement.querySelector('.nira-limit-warning-text');
      if (warningText) {
        warningText.innerHTML = `⚠️ Some resources exceed your ${state.selectedPlan} plan limits`;
      }
    }
  } else if (warningElement) {
    warningElement.remove();
  }
  
  // Update costs
  updateCosts();
  
  // Make sure the additional storage section visibility reflects the state
  const additionalStorageSection = document.getElementById('nira-additional-storage-section');
  if (additionalStorageSection) {
    additionalStorageSection.style.display = state.additionalSectionExpanded ? 'block' : 'none';
  }
  
  // Update the toggle text
  const toggleAction = document.querySelector('#nira-additional-storage-toggle span:last-child');
  if (toggleAction) {
    toggleAction.textContent = state.additionalSectionExpanded ? 'Hide' : 'Show';
  }
}

// Update costs display
function updateCosts() {
  const costs = calculateCosts();
  
  // Update individual costs
  ['triangles', 'textures', 'photos', 'points'].forEach(resource => {
    const costElement = document.getElementById(`nira-${resource}-cost`);
    if (costElement) {
      costElement.textContent = costs[resource] > 0 ? `($${costs[resource]}/mo)` : '';
    }
  });
  
  // Update total cost
  const totalCostElement = document.getElementById('nira-total-cost');
  if (totalCostElement) {
    totalCostElement.textContent = `$${costs.total.toFixed(2)}/${state.billingCycle === 'monthly' ? 'month' : 'month (yearly billing)'}`;
  }
}

// Calculate costs based on additional storage and billing cycle
function calculateCosts() {
  const pricing = ADDITIONAL_STORAGE_PRICING[state.billingCycle];
  
  const costs = {
    triangles: state.additionalStorage.triangles * pricing.triangles,
    textures: state.additionalStorage.textures * pricing.textures,
    photos: state.additionalStorage.photos * pricing.photos,
    points: state.additionalStorage.points * pricing.points
  };
  
  const total = costs.triangles + costs.textures + costs.photos + costs.points;
  
  return {
    ...costs,
    total: total
  };
}

// Inject custom styles
function injectStyles() {
  if (document.getElementById('nira-visualizer-styles')) return;
  
  const styleElement = document.createElement('style');
  styleElement.id = 'nira-visualizer-styles';
  styleElement.textContent = `
    .nira-limit-warning {
      margin-top: 12px;
      padding: 8px 12px;
      background-color: rgba(239, 68, 68, 0.1);
      border-left: 3px solid #ef4444;
      border-radius: 4px;
    }
    
    .nira-limit-warning-text {
      color: #ef4444;
      margin: 0;
    }
    
    .nira-progress-container:hover .nira-progress-bar {
      filter: brightness(1.2);
    }
    
    .nira-storage-input:focus {
      outline: none;
      border-color: rgba(59, 130, 246, 0.5) !important;
      box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }
    
    #nira-additional-storage-toggle:hover {
      background-color: rgba(255, 255, 255, 0.05);
    }
    
    /* Prevent Mui overrides */
    #nira-usage-container .MuiTypography-body1 {
      margin-bottom: 4px;
    }
  `;
  
  document.head.appendChild(styleElement);
}

// Set up event listeners for the UI
function setupEventListeners() {
  // Use event delegation for all controls
  document.addEventListener('change', function(event) {
    // Plan selector
    if (event.target.id === 'nira-plan-select') {
      state.selectedPlan = event.target.value;
      saveState();
      updateUI();
    }
    // Billing cycle
    else if (event.target.id === 'nira-billing-select') {
      state.billingCycle = event.target.value;
      saveState();
      updateCosts();
    }
    // Storage inputs
    else if (event.target.id.startsWith('nira-additional-')) {
      const resourceKey = event.target.id.replace('nira-additional-', '');
      state.additionalStorage[resourceKey] = parseInt(event.target.value) || 0;
      saveState();
      updateUI();
    }
  });
  
  // Toggle additional storage section with event delegation
  document.addEventListener('click', function(event) {
    const toggle = event.target.closest('#nira-additional-storage-toggle');
    if (toggle) {
      state.additionalSectionExpanded = !state.additionalSectionExpanded;
      const section = document.getElementById('nira-additional-storage-section');
      if (section) {
        section.style.display = state.additionalSectionExpanded ? 'block' : 'none';
      }
      const toggleAction = toggle.querySelector('span:last-child');
      if (toggleAction) {
        toggleAction.textContent = state.additionalSectionExpanded ? 'Hide' : 'Show';
      }
      saveState();
    }
  });
}

// Save state to localStorage
function saveState() {
  try {
    localStorage.setItem('niraVisualizerState', JSON.stringify({
      selectedPlan: state.selectedPlan,
      billingCycle: state.billingCycle,
      additionalStorage: state.additionalStorage,
      additionalSectionExpanded: state.additionalSectionExpanded
    }));
    console.log('State saved:', state);
  } catch (error) {
    console.error('Error saving state:', error);
  }
}

// Load state from localStorage
function loadState() {
  try {
    const savedState = localStorage.getItem('niraVisualizerState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      
      state.selectedPlan = parsedState.selectedPlan || state.selectedPlan;
      state.billingCycle = parsedState.billingCycle || state.billingCycle;
      state.additionalStorage = parsedState.additionalStorage || state.additionalStorage;
      state.additionalSectionExpanded = parsedState.additionalSectionExpanded || state.additionalSectionExpanded;
      
      console.log('State loaded:', state);
    }
  } catch (error) {
    console.error('Error loading state:', error);
  }
}

// Start the extension
initializeExtension();

// Add event listener for page changes (SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('URL changed, checking for usage page');
    
    // If we navigate to a usage page, initialize the UI
    if (url.includes('/usage')) {
      console.log('Navigation detected to usage page');
      state.uiInitialized = false;
      setTimeout(function() {
        if (!state.uiInitialized) {
          initializeExtension();
        }
      }, 500);
    }
  }
}).observe(document, { subtree: true, childList: true });