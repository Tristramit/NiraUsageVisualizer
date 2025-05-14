/*
 * File: injected.js
 * Description: Script that gets injected into the page to build and manage the visualizer UI
 */

(function() {
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
      currentUsage: window.niraVisualizerData || {
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
      additionalSectionExpanded: false
    };
  
    // Initialize the UI
    function initialize() {
      // Load saved state from localStorage
      loadState();
      
      // Render the initial UI
      renderUI();
      
      // Set up event listeners
      setupEventListeners();
    }
  
    // Save state to localStorage
    function saveState() {
      const stateToSave = {
        selectedPlan: state.selectedPlan,
        billingCycle: state.billingCycle,
        additionalStorage: state.additionalStorage,
        additionalSectionExpanded: state.additionalSectionExpanded
      };
      
      localStorage.setItem('niraVisualizerState', JSON.stringify(stateToSave));
    }
  
    // Load state from localStorage
    function loadState() {
      const savedState = localStorage.getItem('niraVisualizerState');
      
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        
        state.selectedPlan = parsedState.selectedPlan || state.selectedPlan;
        state.billingCycle = parsedState.billingCycle || state.billingCycle;
        state.additionalStorage = parsedState.additionalStorage || state.additionalStorage;
        state.additionalSectionExpanded = parsedState.additionalSectionExpanded || state.additionalSectionExpanded;
      }
    }
  
    // Render the complete UI
    function renderUI() {
      const container = document.getElementById('nira-usage-visualizer');
      if (!container) return;
      
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
      
      // Calculate costs
      const costs = calculateCosts();
      
      // Build HTML content
      let html = `
        <div class="nira-visualizer-header">
          <h2 class="nira-visualizer-title">Plan Usage Visualization</h2>
          <select id="nira-plan-selector" class="nira-visualizer-select">
            <option value="individual" ${state.selectedPlan === 'individual' ? 'selected' : ''}>Individual Plan</option>
            <option value="professional" ${state.selectedPlan === 'professional' ? 'selected' : ''}>Professional Plan</option>
          </select>
        </div>
      `;
      
      // Warning banner if exceeding limits
      if (hasExceededLimit) {
        html += `
          <div class="nira-visualizer-warning">
            <p class="nira-visualizer-warning-title">Usage Limit Exceeded</p>
            <p class="nira-visualizer-warning-text">Some resources exceed your plan limits plus additional storage.</p>
          </div>
        `;
      }
      
      // Resource bars
      html += `
        <div class="nira-visualizer-bars">
          ${createResourceBar('Triangles', state.currentUsage.triangles, baseLimits.triangles, effectiveLimits.triangles, 'million')}
          ${createResourceBar('Textures', state.currentUsage.textures, baseLimits.textures, effectiveLimits.textures, 'gigapixels')}
          ${createResourceBar('Photos', state.currentUsage.photos, baseLimits.photos, effectiveLimits.photos, 'gigapixels')}
          ${createResourceBar('Points', state.currentUsage.points, baseLimits.points, effectiveLimits.points, 'million')}
        </div>
        
        <hr class="nira-visualizer-divider">
        
        <div class="nira-visualizer-asset-count">
          Asset Count: ${state.currentUsage.assetCount}
        </div>
      `;
      
      // Additional storage section
      html += `
        <div class="nira-visualizer-section-toggle" id="nira-additional-storage-toggle">
          <h3 class="nira-visualizer-section-title">Additional Storage</h3>
          <span class="nira-visualizer-section-action">
            ${state.additionalSectionExpanded ? 'Click to collapse' : 'Click to expand'}
          </span>
        </div>
        
        <div id="nira-additional-storage-section" class="nira-visualizer-additional-storage" 
             style="${state.additionalSectionExpanded ? '' : 'display: none;'}">
          <div class="nira-visualizer-billing-section">
            <label class="nira-visualizer-billing-label">Billing Cycle</label>
            <select id="nira-billing-cycle-selector" class="nira-visualizer-billing-select">
              <option value="monthly" ${state.billingCycle === 'monthly' ? 'selected' : ''}>Monthly Billing</option>
              <option value="yearly" ${state.billingCycle === 'yearly' ? 'selected' : ''}>Yearly Billing</option>
            </select>
          </div>
          
          <div class="nira-visualizer-storage-grid">
            <div class="nira-visualizer-storage-row">
              <label class="nira-visualizer-storage-label">Triangles</label>
              <input type="number" id="nira-additional-triangles" class="nira-visualizer-storage-input" 
                     min="0" value="${state.additionalStorage.triangles}">
              <span class="nira-visualizer-storage-unit">× 100M</span>
              <span id="nira-triangles-cost" class="nira-visualizer-storage-cost">
                ${costs.triangles > 0 ? `($${costs.triangles}/mo)` : ''}
              </span>
            </div>
            
            <div class="nira-visualizer-storage-row">
              <label class="nira-visualizer-storage-label">Textures</label>
              <input type="number" id="nira-additional-textures" class="nira-visualizer-storage-input" 
                     min="0" value="${state.additionalStorage.textures}">
              <span class="nira-visualizer-storage-unit">× 10GP</span>
              <span id="nira-textures-cost" class="nira-visualizer-storage-cost">
                ${costs.textures > 0 ? `($${costs.textures}/mo)` : ''}
              </span>
            </div>
            
            <div class="nira-visualizer-storage-row">
              <label class="nira-visualizer-storage-label">Photos</label>
              <input type="number" id="nira-additional-photos" class="nira-visualizer-storage-input" 
                     min="0" value="${state.additionalStorage.photos}">
              <span class="nira-visualizer-storage-unit">× 20GP</span>
              <span id="nira-photos-cost" class="nira-visualizer-storage-cost">
                ${costs.photos > 0 ? `($${costs.photos}/mo)` : ''}
              </span>
            </div>
            
            <div class="nira-visualizer-storage-row">
              <label class="nira-visualizer-storage-label">Points</label>
              <input type="number" id="nira-additional-points" class="nira-visualizer-storage-input" 
                     min="0" value="${state.additionalStorage.points}">
              <span class="nira-visualizer-storage-unit">× 500M</span>
              <span id="nira-points-cost" class="nira-visualizer-storage-cost">
                ${costs.points > 0 ? `($${costs.points}/mo)` : ''}
              </span>
            </div>
          </div>
          
          <div class="nira-visualizer-total-cost">
            <span class="nira-visualizer-total-cost-label">Total Additional Cost:</span>
            <span id="nira-total-cost" class="nira-visualizer-total-cost-value">
              $${costs.total.toFixed(2)}/${state.billingCycle === 'monthly' ? 'month' : 'month (yearly billing)'}
            </span>
          </div>
        </div>
      `;
      
      // Set the HTML
      container.innerHTML = html;
    }
  
    // Helper function to create an HTML string for a resource bar
    function createResourceBar(label, usage, baseLimit, effectiveLimit, unit) {
      const percentage = Math.min(100, (usage / effectiveLimit) * 100);
      const isOverLimit = usage > effectiveLimit;
      const hasAdditional = effectiveLimit > baseLimit;
      
      let barColorClass;
      if (isOverLimit) {
        barColorClass = 'nira-visualizer-progress-bar-red';
      } else if (percentage > 90) {
        barColorClass = 'nira-visualizer-progress-bar-yellow';
      } else if (percentage > 70) {
        barColorClass = 'nira-visualizer-progress-bar-yellow';
      } else {
        barColorClass = 'nira-visualizer-progress-bar-green';
      }
      
      return `
        <div class="nira-visualizer-bar-container">
          <div class="nira-visualizer-bar-header">
            <div class="nira-visualizer-bar-label">${label}</div>
            <div class="nira-visualizer-bar-value">
              ${usage.toLocaleString()} / ${effectiveLimit.toLocaleString()} ${unit}
            </div>
          </div>
          <div class="nira-visualizer-progress-container">
            <div class="nira-visualizer-progress-bar ${barColorClass}" style="width: ${percentage}%"></div>
            ${hasAdditional ? 
              `<div class="nira-visualizer-base-limit-indicator" style="left: ${(baseLimit / effectiveLimit) * 100}%"></div>` : 
              ''}
          </div>
          <div class="nira-visualizer-bar-footer">
            <div class="${isOverLimit ? 'nira-visualizer-percentage-exceeded' : 'nira-visualizer-percentage'}">
              ${percentage.toFixed(1)}%
            </div>
            <div class="nira-visualizer-limit-info">
              ${hasAdditional ? 
                `Base: ${baseLimit} + Add'l: ${effectiveLimit - baseLimit} ${unit}` : 
                ''}
              ${isOverLimit ? 
                `<span class="nira-visualizer-exceeded-text">Exceeds by ${(usage - effectiveLimit).toFixed(2)} ${unit}</span>` : 
                ''}
            </div>
          </div>
        </div>
      `;
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
        triangles: costs.triangles,
        textures: costs.textures,
        photos: costs.photos,
        points: costs.points,
        total: total
      };
    }
  
    // Set up event listeners for the UI
    function setupEventListeners() {
      const container = document.getElementById('nira-usage-visualizer');
      if (!container) return;
      
      // Plan selector change
      container.addEventListener('change', function(event) {
        if (event.target.id === 'nira-plan-selector') {
          state.selectedPlan = event.target.value;
          saveState();
          renderUI();
        }
        else if (event.target.id === 'nira-billing-cycle-selector') {
          state.billingCycle = event.target.value;
          saveState();
          renderUI();
        }
        else if (event.target.id === 'nira-additional-triangles') {
          state.additionalStorage.triangles = parseInt(event.target.value) || 0;
          saveState();
          renderUI();
        }
        else if (event.target.id === 'nira-additional-textures') {
          state.additionalStorage.textures = parseInt(event.target.value) || 0;
          saveState();
          renderUI();
        }
        else if (event.target.id === 'nira-additional-photos') {
          state.additionalStorage.photos = parseInt(event.target.value) || 0;
          saveState();
          renderUI();
        }
        else if (event.target.id === 'nira-additional-points') {
          state.additionalStorage.points = parseInt(event.target.value) || 0;
          saveState();
          renderUI();
        }
      });
      
      // Toggle additional storage section
      container.addEventListener('click', function(event) {
        if (event.target.closest('#nira-additional-storage-toggle')) {
          state.additionalSectionExpanded = !state.additionalSectionExpanded;
          saveState();
          renderUI();
        }
      });
    }
  
    // Start the application
    initialize();
  })();