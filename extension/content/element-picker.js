/**
 * P&E Manager Web Capture - Visual Element Picker
 *
 * Allows users to visually select page elements to create capture rules.
 * Injected dynamically when user clicks "Create Rule for This Page".
 *
 * CRITICAL: Content scripts CANNOT use ES modules in Chrome.
 * Uses IIFE pattern for isolation.
 *
 * Note: This script uses innerHTML for static UI templates only (no user input).
 * All dynamic content is properly escaped via textContent or attribute setters.
 */

(function() {
  'use strict';

  // Prevent multiple injections
  if (window.__PE_PICKER_ACTIVE__) {
    console.log('[PE-Picker] Already active, ignoring');
    return;
  }
  window.__PE_PICKER_ACTIVE__ = true;

  console.log('[PE-Picker] Element picker loaded');

  // ==========================================================================
  // STATE
  // ==========================================================================

  const state = {
    hoveredElement: null,
    selectedFields: [],
    isActive: true
  };

  // ==========================================================================
  // STYLES (injected inline to avoid external CSS loading issues)
  // ==========================================================================

  const STYLES = `
    .pe-picker-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2147483646;
      pointer-events: none;
    }

    .pe-picker-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      padding: 12px 20px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      z-index: 2147483647;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      pointer-events: auto;
    }

    .pe-picker-banner-text {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .pe-picker-banner-icon {
      font-size: 20px;
    }

    .pe-picker-banner-buttons {
      display: flex;
      gap: 8px;
    }

    .pe-picker-btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: background 0.2s;
    }

    .pe-picker-btn-done {
      background: white;
      color: #4f46e5;
    }

    .pe-picker-btn-done:hover {
      background: #f0f0ff;
    }

    .pe-picker-btn-cancel {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .pe-picker-btn-cancel:hover {
      background: rgba(255,255,255,0.3);
    }

    .pe-picker-highlight {
      position: fixed;
      border: 2px solid #4f46e5;
      background: rgba(79, 70, 229, 0.1);
      pointer-events: none;
      z-index: 2147483645;
      transition: all 0.1s ease;
    }

    .pe-picker-tooltip {
      position: fixed;
      background: #1f2937;
      color: white;
      padding: 6px 10px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      z-index: 2147483647;
      pointer-events: none;
      max-width: 300px;
      word-break: break-all;
    }

    .pe-picker-dialog {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 24px;
      border-radius: 12px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      z-index: 2147483647;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-width: 320px;
    }

    .pe-picker-dialog h3 {
      margin: 0 0 16px 0;
      font-size: 18px;
      color: #1f2937;
    }

    .pe-picker-dialog label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
      color: #4b5563;
    }

    .pe-picker-dialog input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 12px;
      box-sizing: border-box;
    }

    .pe-picker-dialog input:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .pe-picker-dialog select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      margin-bottom: 16px;
      box-sizing: border-box;
    }

    .pe-picker-dialog-selector {
      background: #f3f4f6;
      padding: 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 16px;
      word-break: break-all;
    }

    .pe-picker-dialog-buttons {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }

    .pe-picker-dialog-btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
    }

    .pe-picker-dialog-btn-primary {
      background: #4f46e5;
      color: white;
    }

    .pe-picker-dialog-btn-secondary {
      background: #f3f4f6;
      color: #4b5563;
    }

    .pe-picker-selected-badge {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #10b981;
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
    }

    .pe-picker-fields-count {
      background: rgba(255,255,255,0.2);
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 13px;
    }

    .pe-picker-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 2147483646;
    }
  `;

  // ==========================================================================
  // SELECTOR GENERATION
  // ==========================================================================

  /**
   * Generate a unique CSS selector for an element
   * Tries multiple strategies from most to least specific
   */
  function generateSelector(element) {
    // Strategy 1: ID (most reliable)
    if (element.id && !element.id.match(/^\d/) && isUniqueSelector(`#${element.id}`)) {
      return `#${element.id}`;
    }

    // Strategy 2: data-testid or other data attributes (common in React/Vue)
    const testId = element.getAttribute('data-testid') ||
                   element.getAttribute('data-test') ||
                   element.getAttribute('data-cy');
    if (testId) {
      const selector = `[data-testid="${testId}"]`;
      if (isUniqueSelector(selector)) return selector;
    }

    // Strategy 3: Unique class combination
    if (element.classList.length > 0) {
      const classes = Array.from(element.classList)
        .filter(c => !c.match(/^(ng-|react-|vue-|css-|sc-)/)) // Filter framework classes
        .slice(0, 3); // Max 3 classes

      if (classes.length > 0) {
        const selector = element.tagName.toLowerCase() + '.' + classes.join('.');
        if (isUniqueSelector(selector)) return selector;
      }
    }

    // Strategy 4: Tag + attribute combo
    const meaningfulAttrs = ['name', 'role', 'aria-label', 'type', 'href', 'src'];
    for (const attr of meaningfulAttrs) {
      const value = element.getAttribute(attr);
      if (value && value.length < 50) {
        const selector = `${element.tagName.toLowerCase()}[${attr}="${value}"]`;
        if (isUniqueSelector(selector)) return selector;
      }
    }

    // Strategy 5: Build path from closest identifiable ancestor
    return buildPathSelector(element);
  }

  /**
   * Build a path-based selector from nearest identifiable ancestor
   */
  function buildPathSelector(element) {
    const path = [];
    let current = element;
    let foundAnchor = false;

    while (current && current !== document.body && path.length < 5) {
      let part = current.tagName.toLowerCase();

      // If element has ID, use it as anchor
      if (current.id && !current.id.match(/^\d/)) {
        part = `#${current.id}`;
        foundAnchor = true;
      } else if (current.classList.length > 0) {
        const goodClass = Array.from(current.classList)
          .find(c => !c.match(/^(ng-|react-|vue-|css-|sc-)/));
        if (goodClass) {
          part = `${part}.${goodClass}`;
        }
      }

      path.unshift(part);

      if (foundAnchor) break;
      current = current.parentElement;
    }

    // Add nth-child if still not unique
    let selector = path.join(' > ');
    if (!isUniqueSelector(selector)) {
      const parent = element.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(
          c => c.tagName === element.tagName
        );
        const index = siblings.indexOf(element) + 1;
        selector = selector.replace(/([^ >]+)$/, `$1:nth-child(${index})`);
      }
    }

    return selector;
  }

  /**
   * Check if selector matches exactly one element
   */
  function isUniqueSelector(selector) {
    try {
      return document.querySelectorAll(selector).length === 1;
    } catch {
      return false;
    }
  }

  // ==========================================================================
  // UI COMPONENTS
  // ==========================================================================

  let styleElement = null;
  let bannerElement = null;
  let highlightElement = null;
  let tooltipElement = null;
  let dialogElement = null;
  let backdropElement = null;

  function injectStyles() {
    styleElement = document.createElement('style');
    styleElement.textContent = STYLES;
    document.head.appendChild(styleElement);
  }

  function createBanner() {
    bannerElement = document.createElement('div');
    bannerElement.className = 'pe-picker-banner';

    // Build banner using DOM methods instead of innerHTML
    const textSection = document.createElement('div');
    textSection.className = 'pe-picker-banner-text';

    const icon = document.createElement('span');
    icon.className = 'pe-picker-banner-icon';
    icon.textContent = '🎯';

    const instruction = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = 'P&E Capture:';
    instruction.appendChild(strong);
    instruction.appendChild(document.createTextNode(' Click on elements to capture. Press ESC to cancel.'));

    const fieldsCount = document.createElement('span');
    fieldsCount.className = 'pe-picker-fields-count';
    fieldsCount.id = 'pe-fields-count';
    fieldsCount.textContent = '0 fields selected';

    textSection.appendChild(icon);
    textSection.appendChild(instruction);
    textSection.appendChild(fieldsCount);

    const buttonsSection = document.createElement('div');
    buttonsSection.className = 'pe-picker-banner-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'pe-picker-btn pe-picker-btn-cancel';
    cancelBtn.id = 'pe-cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', cleanup);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'pe-picker-btn pe-picker-btn-done';
    doneBtn.id = 'pe-done-btn';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', finishPicking);

    buttonsSection.appendChild(cancelBtn);
    buttonsSection.appendChild(doneBtn);

    bannerElement.appendChild(textSection);
    bannerElement.appendChild(buttonsSection);

    document.body.appendChild(bannerElement);
  }

  function createHighlight() {
    highlightElement = document.createElement('div');
    highlightElement.className = 'pe-picker-highlight';
    highlightElement.style.display = 'none';
    document.body.appendChild(highlightElement);
  }

  function createTooltip() {
    tooltipElement = document.createElement('div');
    tooltipElement.className = 'pe-picker-tooltip';
    tooltipElement.style.display = 'none';
    document.body.appendChild(tooltipElement);
  }

  function updateFieldsCount() {
    const countEl = document.getElementById('pe-fields-count');
    if (countEl) {
      const count = state.selectedFields.length;
      countEl.textContent = `${count} field${count !== 1 ? 's' : ''} selected`;
    }
  }

  // ==========================================================================
  // FIELD NAME DIALOG
  // ==========================================================================

  function showFieldDialog(_element, selector) {
    // Create backdrop
    backdropElement = document.createElement('div');
    backdropElement.className = 'pe-picker-backdrop';
    document.body.appendChild(backdropElement);

    // Create dialog using DOM methods
    dialogElement = document.createElement('div');
    dialogElement.className = 'pe-picker-dialog';

    const title = document.createElement('h3');
    title.textContent = 'Add Capture Field';

    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'pe-field-name');
    nameLabel.textContent = 'Field Name';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'pe-field-name';
    nameInput.placeholder = 'e.g., build_status, job_name';

    const typeLabel = document.createElement('label');
    typeLabel.setAttribute('for', 'pe-field-type');
    typeLabel.textContent = 'Extraction Type';

    const typeSelect = document.createElement('select');
    typeSelect.id = 'pe-field-type';
    const typeOptions = [
      { value: 'text', label: 'Text Content' },
      { value: 'html', label: 'HTML' },
      { value: 'attribute', label: 'Attribute' },
      { value: 'href', label: 'Link (href)' },
      { value: 'src', label: 'Source (src)' }
    ];
    typeOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      typeSelect.appendChild(option);
    });

    const selectorLabel = document.createElement('label');
    selectorLabel.textContent = 'Generated Selector';

    const selectorDisplay = document.createElement('div');
    selectorDisplay.className = 'pe-picker-dialog-selector';
    selectorDisplay.textContent = selector; // Safe: uses textContent

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'pe-picker-dialog-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'pe-picker-dialog-btn pe-picker-dialog-btn-secondary';
    cancelBtn.id = 'pe-dialog-cancel';
    cancelBtn.textContent = 'Cancel';

    const addBtn = document.createElement('button');
    addBtn.className = 'pe-picker-dialog-btn pe-picker-dialog-btn-primary';
    addBtn.id = 'pe-dialog-add';
    addBtn.textContent = 'Add Field';

    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(addBtn);

    dialogElement.appendChild(title);
    dialogElement.appendChild(nameLabel);
    dialogElement.appendChild(nameInput);
    dialogElement.appendChild(typeLabel);
    dialogElement.appendChild(typeSelect);
    dialogElement.appendChild(selectorLabel);
    dialogElement.appendChild(selectorDisplay);
    dialogElement.appendChild(buttonsDiv);

    document.body.appendChild(dialogElement);

    // Focus input
    setTimeout(() => nameInput.focus(), 50);

    // Event handlers
    const handleAdd = () => {
      const fieldName = nameInput.value.trim();
      const fieldType = typeSelect.value;

      if (!fieldName) {
        nameInput.style.borderColor = '#ef4444';
        return;
      }

      // Convert to snake_case
      const normalizedName = fieldName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

      state.selectedFields.push({
        field_name: normalizedName,
        selector: selector,
        type: fieldType,
        required: false
      });

      console.log('[PE-Picker] Added field:', normalizedName);
      updateFieldsCount();
      closeDialog();
    };

    const handleCancel = () => {
      closeDialog();
    };

    addBtn.addEventListener('click', handleAdd);
    cancelBtn.addEventListener('click', handleCancel);

    // Enter key to add
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleAdd();
      if (e.key === 'Escape') handleCancel();
    });

    backdropElement.addEventListener('click', handleCancel);
  }

  function closeDialog() {
    if (dialogElement) {
      dialogElement.remove();
      dialogElement = null;
    }
    if (backdropElement) {
      backdropElement.remove();
      backdropElement = null;
    }
  }

  // ==========================================================================
  // RULE NAME DIALOG
  // ==========================================================================

  function showRuleNameDialog() {
    // Suggest name from page title or URL
    const suggestedName = document.title.slice(0, 30) ||
                          window.location.hostname.replace('www.', '');

    // Build URL pattern from current URL
    const url = new URL(window.location.href);
    const suggestedPattern = `*${url.hostname}${url.pathname.replace(/\/[^/]*$/, '/*')}`;

    backdropElement = document.createElement('div');
    backdropElement.className = 'pe-picker-backdrop';
    document.body.appendChild(backdropElement);

    // Create dialog using DOM methods
    dialogElement = document.createElement('div');
    dialogElement.className = 'pe-picker-dialog';

    const title = document.createElement('h3');
    title.textContent = 'Save Capture Rule';

    const nameLabel = document.createElement('label');
    nameLabel.setAttribute('for', 'pe-rule-name');
    nameLabel.textContent = 'Rule Name';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.id = 'pe-rule-name';
    nameInput.value = suggestedName;

    const patternLabel = document.createElement('label');
    patternLabel.setAttribute('for', 'pe-url-pattern');
    patternLabel.textContent = 'URL Pattern (glob)';

    const patternInput = document.createElement('input');
    patternInput.type = 'text';
    patternInput.id = 'pe-url-pattern';
    patternInput.value = suggestedPattern;

    const fieldsLabel = document.createElement('label');
    fieldsLabel.textContent = `Selected Fields (${state.selectedFields.length})`;

    const fieldsDisplay = document.createElement('div');
    fieldsDisplay.className = 'pe-picker-dialog-selector';
    fieldsDisplay.textContent = state.selectedFields.map(f => f.field_name).join(', ');

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'pe-picker-dialog-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'pe-picker-dialog-btn pe-picker-dialog-btn-secondary';
    cancelBtn.id = 'pe-dialog-cancel';
    cancelBtn.textContent = 'Cancel';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'pe-picker-dialog-btn pe-picker-dialog-btn-primary';
    saveBtn.id = 'pe-dialog-save';
    saveBtn.textContent = 'Save Rule';

    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(saveBtn);

    dialogElement.appendChild(title);
    dialogElement.appendChild(nameLabel);
    dialogElement.appendChild(nameInput);
    dialogElement.appendChild(patternLabel);
    dialogElement.appendChild(patternInput);
    dialogElement.appendChild(fieldsLabel);
    dialogElement.appendChild(fieldsDisplay);
    dialogElement.appendChild(buttonsDiv);

    document.body.appendChild(dialogElement);

    setTimeout(() => nameInput.focus(), 50);

    const handleSave = async () => {
      const ruleName = nameInput.value.trim();
      const urlPattern = patternInput.value.trim();

      if (!ruleName || !urlPattern) {
        return;
      }

      const ruleData = {
        name: ruleName,
        url_pattern: urlPattern,
        enabled: true,
        selectors: state.selectedFields
      };

      console.log('[PE-Picker] Saving rule:', ruleData);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'CREATE_RULE',
          payload: ruleData
        });

        if (response.success) {
          console.log('[PE-Picker] Rule created successfully');
          alert(`Rule "${ruleName}" created successfully!\n\nRefresh rules in the extension to start capturing.`);
          cleanup();
        } else {
          alert('Failed to create rule: ' + (response.error || 'Unknown error'));
        }
      } catch (error) {
        console.error('[PE-Picker] Error creating rule:', error);
        alert('Failed to create rule: ' + error.message);
      }
    };

    saveBtn.addEventListener('click', handleSave);
    cancelBtn.addEventListener('click', closeDialog);

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') closeDialog();
    });
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  function handleMouseMove(e) {
    if (!state.isActive || dialogElement) return;

    // Ignore picker UI elements
    if (e.target.closest('.pe-picker-banner, .pe-picker-dialog, .pe-picker-backdrop')) {
      highlightElement.style.display = 'none';
      tooltipElement.style.display = 'none';
      return;
    }

    const element = e.target;
    if (element === state.hoveredElement) return;

    state.hoveredElement = element;

    // Update highlight position
    const rect = element.getBoundingClientRect();
    highlightElement.style.display = 'block';
    highlightElement.style.top = rect.top + 'px';
    highlightElement.style.left = rect.left + 'px';
    highlightElement.style.width = rect.width + 'px';
    highlightElement.style.height = rect.height + 'px';

    // Update tooltip using textContent (safe)
    const tagName = element.tagName.toLowerCase();
    const classes = element.className ? `.${element.className.split(' ').slice(0, 2).join('.')}` : '';
    const id = element.id ? `#${element.id}` : '';
    tooltipElement.textContent = `${tagName}${id}${classes}`;
    tooltipElement.style.display = 'block';
    tooltipElement.style.top = (rect.bottom + 8) + 'px';
    tooltipElement.style.left = rect.left + 'px';
  }

  function handleClick(e) {
    if (!state.isActive || dialogElement) return;

    // Ignore picker UI elements
    if (e.target.closest('.pe-picker-banner, .pe-picker-dialog, .pe-picker-backdrop')) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    const selector = generateSelector(element);

    console.log('[PE-Picker] Selected element:', element);
    console.log('[PE-Picker] Generated selector:', selector);

    // Hide highlight while dialog is open
    highlightElement.style.display = 'none';
    tooltipElement.style.display = 'none';

    showFieldDialog(element, selector);
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      if (dialogElement) {
        closeDialog();
      } else {
        cleanup();
      }
    }
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  function finishPicking() {
    if (state.selectedFields.length === 0) {
      alert('Please select at least one element to capture.');
      return;
    }

    // Hide highlight
    highlightElement.style.display = 'none';
    tooltipElement.style.display = 'none';

    // Show rule name dialog
    showRuleNameDialog();
  }

  function cleanup() {
    console.log('[PE-Picker] Cleaning up');
    state.isActive = false;
    window.__PE_PICKER_ACTIVE__ = false;

    // Remove event listeners
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('keydown', handleKeyDown, true);

    // Remove UI elements
    if (styleElement) styleElement.remove();
    if (bannerElement) bannerElement.remove();
    if (highlightElement) highlightElement.remove();
    if (tooltipElement) tooltipElement.remove();
    if (dialogElement) dialogElement.remove();
    if (backdropElement) backdropElement.remove();
  }

  function init() {
    console.log('[PE-Picker] Initializing');

    injectStyles();
    createBanner();
    createHighlight();
    createTooltip();

    // Add event listeners with capture phase
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleKeyDown, true);

    console.log('[PE-Picker] Ready - hover over elements and click to capture');
  }

  // Start picker
  init();

})();
