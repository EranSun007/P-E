// SafeArray utility component and function
export function safeArray(possibleArray) {
  if (!possibleArray) return [];
  if (Array.isArray(possibleArray)) return possibleArray;
  return [];
}

// Export a dummy component to make it a valid React component file
export default function SafeArray() {
  return null;
}