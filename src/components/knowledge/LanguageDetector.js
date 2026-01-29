// src/components/knowledge/LanguageDetector.js

/**
 * Detect programming language from MCP server response or file path
 * Priority: server language > file extension > plaintext fallback
 */
export function detectLanguage(serverLanguage, filePath) {
  // Trust server-provided language first
  if (serverLanguage && typeof serverLanguage === 'string') {
    return normalizeLanguageName(serverLanguage.toLowerCase());
  }

  // Fallback to file extension
  const extension = filePath?.split('.').pop()?.toLowerCase();
  if (extension) {
    return extensionToLanguage(extension);
  }

  return 'plaintext';
}

function normalizeLanguageName(lang) {
  const aliases = {
    'js': 'javascript',
    'ts': 'typescript',
    'py': 'python',
  };
  return aliases[lang] || lang;
}

function extensionToLanguage(ext) {
  const mapping = {
    'js': 'javascript',
    'jsx': 'javascript',
    'mjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'rb': 'ruby',
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'sql': 'sql',
    'md': 'markdown',
    'sh': 'bash',
    'bash': 'bash',
  };
  return mapping[ext] || 'plaintext';
}

export const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'go',
  'rust', 'html', 'css', 'json', 'yaml', 'markdown', 'bash'
];
