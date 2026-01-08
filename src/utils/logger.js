// Simple structured logger with levels and environment-aware verbosity
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };

class Logger {
  constructor() {
    const isProd = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'production';
    this.level = isProd ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;
  }

  setLevel(level) {
    if (typeof level === 'number') this.level = level;
  }

  debug(message, context = {}) {
    if (this.level <= LOG_LEVELS.DEBUG) {
      // eslint-disable-next-line no-console
      console.debug('[DEBUG]', message, context);
    }
  }

  info(message, context = {}) {
    if (this.level <= LOG_LEVELS.INFO) {
      // eslint-disable-next-line no-console
      console.info('[INFO]', message, context);
    }
  }

  warn(message, context = {}) {
    if (this.level <= LOG_LEVELS.WARN) {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', message, context);
    }
  }

  error(message, context = {}) {
    if (this.level <= LOG_LEVELS.ERROR) {
      // eslint-disable-next-line no-console
      console.error('[ERROR]', message, context);
      this.reportError(message, context);
    }
  }

  reportError(message, context) {
    try {
      // Placeholder: store last 10 errors locally for debugging
      const key = 'pe_manager_error_log';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift({ message, context, ts: new Date().toISOString() });
      localStorage.setItem(key, JSON.stringify(existing.slice(0, 10)));
    } catch (_) {
      // Swallow logging errors
    }
  }
}

export const logger = new Logger();
export { LOG_LEVELS };


