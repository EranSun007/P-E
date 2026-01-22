/**
 * P&E Manager Web Capture - Generic Extractor Content Script
 *
 * Rule-based DOM extraction for any website matching a capture rule.
 * Dynamically injected via chrome.scripting API when URL matches a rule pattern.
 *
 * CRITICAL: Content scripts CANNOT use ES modules in Chrome.
 * This uses the IIFE pattern for isolation (matches content.js).
 */

(function() {
  'use strict';

  console.log('[PE-Capture] Generic extractor loaded for:', window.location.href);

  // ==========================================================================
  // RULE FETCHING
  // ==========================================================================

  /**
   * Request rule from service worker for current URL
   * @returns {Promise<Object|null>} The matching rule or null
   */
  async function getRuleForUrl() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_RULE_FOR_URL',
        url: window.location.href
      });

      if (response.success && response.rule) {
        return response.rule;
      }

      return null;
    } catch (error) {
      console.error('[PE-Capture] Error getting rule:', error);
      return null;
    }
  }

  // ==========================================================================
  // DATA EXTRACTION
  // ==========================================================================

  /**
   * Extract data from DOM using rule selectors
   * Supports extraction types: text, html, attribute, href, src
   *
   * @param {Array} selectors - Array of selector configurations
   * @returns {{ data: Object, errors: Array<string> }}
   */
  function extractBySelectors(selectors) {
    const data = {};
    const errors = [];

    for (const config of selectors) {
      const {
        field_name,
        selector,
        type = 'text',
        attribute,
        required = false
      } = config;

      try {
        const element = document.querySelector(selector);

        if (!element) {
          if (required) {
            errors.push(`Required field "${field_name}" not found: ${selector}`);
          }
          data[field_name] = null;
          continue;
        }

        // Extract value based on type
        switch (type) {
          case 'text':
            data[field_name] = element.textContent?.trim() || null;
            break;

          case 'html':
            data[field_name] = element.innerHTML?.trim() || null;
            break;

          case 'attribute':
            if (!attribute) {
              console.warn(`[PE-Capture] No attribute specified for "${field_name}"`);
              data[field_name] = null;
            } else {
              data[field_name] = element.getAttribute(attribute) || null;
            }
            break;

          case 'href':
            // Prefer the resolved href property, fall back to attribute
            data[field_name] = element.href || element.getAttribute('href') || null;
            break;

          case 'src':
            // Prefer the resolved src property, fall back to attribute
            data[field_name] = element.src || element.getAttribute('src') || null;
            break;

          default:
            // Default to text extraction for unknown types
            console.warn(`[PE-Capture] Unknown type "${type}" for "${field_name}", using text`);
            data[field_name] = element.textContent?.trim() || null;
        }
      } catch (error) {
        console.warn(`[PE-Capture] Selector error for "${field_name}":`, error);
        data[field_name] = null;

        if (required) {
          errors.push(`Error extracting "${field_name}": ${error.message}`);
        }
      }
    }

    return { data, errors };
  }

  // ==========================================================================
  // SOURCE IDENTIFIER
  // ==========================================================================

  /**
   * Build a unique source identifier from URL and extracted data
   * Used for deduplication in the inbox
   *
   * @param {string} url - The page URL
   * @param {Object} data - Extracted data
   * @param {Object} rule - The capture rule
   * @returns {string} Source identifier
   */
  function buildSourceIdentifier(url, data, rule) {
    // Allow rule to specify which field to use as identifier
    const identifierField = rule.metadata?.identifier_field;

    if (identifierField && data[identifierField]) {
      return `${rule.name}:${data[identifierField]}`;
    }

    // Default to URL (may cause duplicates on dynamic pages)
    return url;
  }

  // ==========================================================================
  // MAIN EXTRACTION FLOW
  // ==========================================================================

  /**
   * Main extraction function
   * Fetches rule, extracts data, sends to service worker
   *
   * @returns {Promise<{ success: boolean, reason?: string, errors?: Array }>}
   */
  async function extractAndSend() {
    try {
      // Get the matching rule for this URL
      const rule = await getRuleForUrl();

      if (!rule) {
        console.log('[PE-Capture] No rule found for URL');
        return { success: false, reason: 'no_rule' };
      }

      if (!rule.selectors || rule.selectors.length === 0) {
        console.log('[PE-Capture] Rule has no selectors:', rule.name);
        return { success: false, reason: 'no_selectors' };
      }

      console.log('[PE-Capture] Applying rule:', rule.name);

      // Extract data using rule selectors
      const { data, errors } = extractBySelectors(rule.selectors);

      // Check for required field errors
      if (errors.length > 0) {
        console.warn('[PE-Capture] Required fields missing:', errors);
        return { success: false, reason: 'missing_required', errors };
      }

      // Check if any data was extracted
      const hasData = Object.values(data).some(v => v !== null);
      if (!hasData) {
        console.log('[PE-Capture] No data extracted from page');
        return { success: false, reason: 'no_data' };
      }

      // Add extraction metadata
      data._extracted_at = new Date().toISOString();
      data._page_title = document.title;
      data._page_url = window.location.href;

      // Build payload for inbox
      const payload = {
        rule_id: rule.id,
        rule_name: rule.name,
        source_url: window.location.href,
        source_identifier: buildSourceIdentifier(window.location.href, data, rule),
        captured_data: data
      };

      console.log('[PE-Capture] Sending to inbox:', payload.source_identifier);

      // Send to service worker
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_DATA',
        payload
      });

      if (response.success) {
        console.log('[PE-Capture] Data captured successfully');
        return { success: true };
      } else {
        console.error('[PE-Capture] Capture failed:', response.error);
        return { success: false, reason: 'send_failed', error: response.error };
      }
    } catch (error) {
      console.error('[PE-Capture] Extraction error:', error);
      return { success: false, reason: 'error', error: error.message };
    }
  }

  // ==========================================================================
  // MESSAGE HANDLERS
  // ==========================================================================

  /**
   * Listen for messages from service worker/popup
   * Supports manual capture trigger
   */
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'MANUAL_CAPTURE') {
      console.log('[PE-Capture] Manual capture triggered');

      // Execute extraction and send response
      extractAndSend().then(result => {
        sendResponse(result);
      }).catch(error => {
        console.error('[PE-Capture] Manual capture error:', error);
        sendResponse({ success: false, reason: 'error', error: error.message });
      });

      return true; // Keep channel open for async response
    }

    // Unknown message type - don't respond
    return false;
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  // Note: Auto-extraction on page load is disabled for v1.1
  // Manual capture only (EXT-05 research decision) - auto-capture can be added as opt-in later
  // To enable auto-capture, uncomment: setTimeout(extractAndSend, 1000);

  console.log('[PE-Capture] Ready for manual capture');

})();
