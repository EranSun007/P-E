// Color utilities for consistent styling across the application

// Available color palette
export const COLORS = {
  indigo: 'indigo',
  blue: 'blue',
  green: 'green',
  amber: 'amber',
  red: 'red',
  purple: 'purple',
  pink: 'pink',
  teal: 'teal',
  orange: 'orange',
  yellow: 'yellow',
  gray: 'gray'
};

// Background color classes
export const BG_COLORS = {
  [COLORS.indigo]: 'bg-indigo-500',
  [COLORS.blue]: 'bg-blue-500',
  [COLORS.green]: 'bg-green-500',
  [COLORS.amber]: 'bg-amber-500',
  [COLORS.red]: 'bg-red-500',
  [COLORS.purple]: 'bg-purple-500',
  [COLORS.pink]: 'bg-pink-500',
  [COLORS.teal]: 'bg-teal-500',
  [COLORS.orange]: 'bg-orange-500',
  [COLORS.yellow]: 'bg-yellow-500',
  [COLORS.gray]: 'bg-gray-500'
};

// Avatar color classes (lighter variations)
export const AVATAR_COLORS = [
  'bg-blue-100 text-blue-800',
  'bg-green-100 text-green-800',
  'bg-purple-100 text-purple-800',
  'bg-pink-100 text-pink-800',
  'bg-yellow-100 text-yellow-800',
  'bg-indigo-100 text-indigo-800',
  'bg-red-100 text-red-800',
  'bg-orange-100 text-orange-800',
  'bg-teal-100 text-teal-800',
  'bg-amber-100 text-amber-800'
];

// Tag color classes
export const TAG_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-green-50 text-green-700 border-green-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-pink-50 text-pink-700 border-pink-200',
  'bg-yellow-50 text-yellow-700 border-yellow-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-red-50 text-red-700 border-red-200',
  'bg-orange-50 text-orange-700 border-orange-200',
  'bg-teal-50 text-teal-700 border-teal-200',
  'bg-amber-50 text-amber-700 border-amber-200'
];

// Utility functions
export const getRandomColor = () => {
  const colorKeys = Object.keys(COLORS);
  const randomIndex = Math.floor(Math.random() * colorKeys.length);
  return colorKeys[randomIndex];
};

export const getDeterministicColor = (text, colorArray = AVATAR_COLORS) => {
  if (!text || typeof text !== 'string') {
    return colorArray[0];
  }
  
  // Generate a hash from the text
  const hash = text.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  const index = hash % colorArray.length;
  return colorArray[index];
};

export const getBackgroundColor = (color) => {
  return BG_COLORS[color] || BG_COLORS[COLORS.gray];
};

export const getAvatarColor = (name) => {
  return getDeterministicColor(name, AVATAR_COLORS);
};

export const getTagColor = (tag) => {
  return getDeterministicColor(tag, TAG_COLORS);
};

// Color validation
export const isValidColor = (color) => {
  return Object.values(COLORS).includes(color);
};

// Helper function to extract initials for avatars
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Project color generator (for consistent project colors)
export const getProjectColor = (projectName) => {
  const colors = Object.keys(COLORS);
  const hash = projectName.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0);
  }, 0);
  
  return colors[hash % colors.length];
};

// Utility for generating consistent colors for categories
export const getCategoryColor = (category, colorMap = {}) => {
  if (colorMap[category]) {
    return colorMap[category];
  }
  
  // Generate a consistent color for this category
  const color = getDeterministicColor(category, Object.keys(COLORS));
  colorMap[category] = color;
  return color;
};