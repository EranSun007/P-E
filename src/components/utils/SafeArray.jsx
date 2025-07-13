// Re-export array utilities from the proper utils directory
export { safeArray, safeArrayProp, safeFilters } from '../../utils/arrayUtils.js';

// This file is deprecated - use import from @/utils/arrayUtils.js instead
export default function SafeArray() {
  console.warn('SafeArray component is deprecated. Use import { safeArray } from "@/utils/arrayUtils.js" instead');
  return null;
}