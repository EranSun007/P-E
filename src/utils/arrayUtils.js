// Array safety utilities to eliminate defensive programming duplication

/**
 * Safely converts a value to an array
 * @param {*} value - The value to convert
 * @returns {Array} - A safe array
 */
export const safeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
};

/**
 * Safely gets an array property from an object
 * @param {Object} obj - The object to get the property from
 * @param {string} prop - The property name
 * @returns {Array} - A safe array
 */
export const safeArrayProp = (obj, prop) => {
  if (!obj || typeof obj !== 'object') return [];
  return safeArray(obj[prop]);
};

/**
 * Creates a safe filter object with array properties
 * @param {Object} filters - The filters object
 * @returns {Object} - A safe filters object
 */
export const safeFilters = (filters = {}) => ({
  status: safeArray(filters.status),
  priority: safeArray(filters.priority),
  type: safeArray(filters.type),
  tags: safeArray(filters.tags),
  stakeholders: safeArray(filters.stakeholders),
  search: filters.search || '',
  strategic: filters.strategic || null,
  groupBy: filters.groupBy || 'none'
});

/**
 * Safely updates an array in immutable way
 * @param {Array} array - The array to update
 * @param {number} index - The index to update
 * @param {*} newValue - The new value
 * @returns {Array} - A new array with the updated value
 */
export const safeUpdateArray = (array, index, newValue) => {
  const safeArr = safeArray(array);
  if (index < 0 || index >= safeArr.length) return safeArr;
  
  const newArray = [...safeArr];
  newArray[index] = newValue;
  return newArray;
};

/**
 * Safely adds an item to an array
 * @param {Array} array - The array to add to
 * @param {*} item - The item to add
 * @returns {Array} - A new array with the item added
 */
export const safeAddToArray = (array, item) => {
  const safeArr = safeArray(array);
  return [...safeArr, item];
};

/**
 * Safely removes an item from an array by index
 * @param {Array} array - The array to remove from
 * @param {number} index - The index to remove
 * @returns {Array} - A new array with the item removed
 */
export const safeRemoveFromArray = (array, index) => {
  const safeArr = safeArray(array);
  if (index < 0 || index >= safeArr.length) return safeArr;
  
  return safeArr.filter((_, i) => i !== index);
};

/**
 * Safely removes an item from an array by value
 * @param {Array} array - The array to remove from
 * @param {*} value - The value to remove
 * @returns {Array} - A new array with the item removed
 */
export const safeRemoveFromArrayByValue = (array, value) => {
  const safeArr = safeArray(array);
  return safeArr.filter(item => item !== value);
};

/**
 * Safely toggles an item in an array
 * @param {Array} array - The array to toggle in
 * @param {*} item - The item to toggle
 * @returns {Array} - A new array with the item toggled
 */
export const safeToggleInArray = (array, item) => {
  const safeArr = safeArray(array);
  const index = safeArr.indexOf(item);
  
  if (index === -1) {
    return [...safeArr, item];
  } else {
    return safeArr.filter((_, i) => i !== index);
  }
};

/**
 * Safely chunks an array into smaller arrays
 * @param {Array} array - The array to chunk
 * @param {number} size - The chunk size
 * @returns {Array} - Array of chunks
 */
export const safeChunkArray = (array, size) => {
  const safeArr = safeArray(array);
  const chunks = [];
  
  for (let i = 0; i < safeArr.length; i += size) {
    chunks.push(safeArr.slice(i, i + size));
  }
  
  return chunks;
};

/**
 * Safely groups an array by a key function
 * @param {Array} array - The array to group
 * @param {Function} keyFn - Function to get the group key
 * @returns {Object} - Object with grouped items
 */
export const safeGroupBy = (array, keyFn) => {
  const safeArr = safeArray(array);
  
  return safeArr.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
};

/**
 * Safely filters an array with multiple filter functions
 * @param {Array} array - The array to filter
 * @param {Array} filters - Array of filter functions
 * @returns {Array} - Filtered array
 */
export const safeMultiFilter = (array, filters) => {
  const safeArr = safeArray(array);
  const safeFilters = safeArray(filters);
  
  return safeArr.filter(item => {
    return safeFilters.every(filterFn => filterFn(item));
  });
};

/**
 * Safely sorts an array without mutating the original
 * @param {Array} array - The array to sort
 * @param {Function} compareFn - Comparison function
 * @returns {Array} - Sorted array
 */
export const safeSortArray = (array, compareFn) => {
  const safeArr = safeArray(array);
  return [...safeArr].sort(compareFn);
};

/**
 * Safely finds unique items in an array
 * @param {Array} array - The array to deduplicate
 * @param {Function} keyFn - Function to get the unique key (optional)
 * @returns {Array} - Array with unique items
 */
export const safeUniqueArray = (array, keyFn) => {
  const safeArr = safeArray(array);
  
  if (!keyFn) {
    return [...new Set(safeArr)];
  }
  
  const seen = new Set();
  return safeArr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/**
 * Safely gets a paginated slice of an array
 * @param {Array} array - The array to paginate
 * @param {number} page - Page number (1-based)
 * @param {number} pageSize - Size of each page
 * @returns {Object} - Object with items, totalPages, currentPage
 */
export const safePaginateArray = (array, page = 1, pageSize = 10) => {
  const safeArr = safeArray(array);
  const totalPages = Math.ceil(safeArr.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    items: safeArr.slice(startIndex, endIndex),
    totalPages,
    currentPage,
    totalItems: safeArr.length,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  };
};