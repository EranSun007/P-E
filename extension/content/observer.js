/**
 * P&E Manager Jira Sync - Content Observer
 *
 * MutationObserver wrapper for detecting DOM changes in Jira pages.
 * Debounces rapid changes to prevent excessive extraction calls.
 *
 * NOTE: Content scripts cannot use ES modules.
 */

/**
 * ContentObserver class - wraps MutationObserver with debouncing
 */
class ContentObserver {
  /**
   * @param {Function} onContentReady - Callback when content changes detected
   */
  constructor(onContentReady) {
    this.onContentReady = onContentReady;
    this.observer = null;
    this.debounceTimer = null;
    this.DEBOUNCE_MS = 500; // Wait for DOM to settle
  }

  /**
   * Start observing a target element for changes
   * @param {string} targetSelector - CSS selector for element to observe
   * @returns {boolean} True if observation started, false if target not found
   */
  observe(targetSelector) {
    // Find the container that holds issue cards
    const target = document.querySelector(targetSelector);
    if (!target) {
      console.log('[PE-Jira] Observer target not found:', targetSelector);
      return false;
    }

    // Create mutation observer with debounced callback
    this.observer = new MutationObserver((mutations) => {
      // Debounce rapid changes - Jira can trigger many mutations
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        console.log('[PE-Jira] DOM mutation detected, triggering extraction');
        this.onContentReady();
      }, this.DEBOUNCE_MS);
    });

    // Configure what to observe
    this.observer.observe(target, {
      childList: true,   // Watch for added/removed nodes
      subtree: true,     // Watch entire subtree
      attributes: false  // Don't need attribute changes (performance)
    });

    console.log('[PE-Jira] Observer started on:', targetSelector);
    return true;
  }

  /**
   * Stop observing and clean up resources
   */
  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      console.log('[PE-Jira] Observer disconnected');
    }

    // Clear any pending debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Check if currently observing
   * @returns {boolean}
   */
  isObserving() {
    return this.observer !== null;
  }
}
