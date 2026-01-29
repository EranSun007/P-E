/**
 * HierarchicalNavigation Component
 * Groups navigation items by folder and renders them hierarchically
 * Displays folders as collapsible groups with nested menu items
 */

import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useNavigation } from '@/contexts/NavigationContext';
import { useAppMode } from '@/contexts/AppModeContext';
import { CollapsibleFolder } from '@/components/navigation/CollapsibleFolder';
import { NativeCollapsibleFolder } from '@/components/navigation/NativeCollapsibleFolder';

// DEBUG: Toggle this to switch between Radix and Native collapsible for testing
// Set to true to use native HTML details/summary instead of Radix Collapsible
const USE_NATIVE_COLLAPSIBLE = false;

// DEBUG: Track render count
let hierNavRenderCount = 0;

/**
 * HierarchicalNavigation renders navigation items grouped by folder
 * @param {object} props
 * @param {Array} props.navigation - Array of navigation items from Layout.jsx
 * @param {Function} props.onItemClick - Callback when a navigation item is clicked
 */
export function HierarchicalNavigation({ navigation, onItemClick }) {
  const { folders, items } = useNavigation();
  const { isProductMode } = useAppMode();

  // DEBUG: Track renders
  hierNavRenderCount++;
  console.log('[HierarchicalNavigation] Render #', hierNavRenderCount, {
    foldersCount: folders?.length,
    itemsCount: items?.length,
    navigationCount: navigation?.length,
    isProductMode
  });

  // Group navigation items by folder
  // NavigationSettings stores itemId as lowercase (e.g., "tasks", "github")
  // Layout.jsx navigation uses capitalized names (e.g., "Tasks", "GitHub")
  // Match case-insensitively to bridge the two
  const itemsByFolder = navigation.reduce((acc, navItem) => {
    const navItemIdLower = navItem.name.toLowerCase();
    const assignment = items.find(i => i.itemId.toLowerCase() === navItemIdLower);
    const folderId = assignment?.folderId || 'root';
    if (!acc[folderId]) acc[folderId] = [];
    acc[folderId].push(navItem);
    return acc;
  }, {});

  // Sort folders by order field
  const sortedFolders = [...folders].sort((a, b) => a.order - b.order);

  // Render a single navigation link
  const renderNavLink = (item) => (
    <Link
      key={item.name}
      to={item.href}
      onClick={(e) => {
        console.log('[HierarchicalNavigation] Link clicked:', item.name, item.href);
        onItemClick?.(e);
      }}
      className={cn(
        'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors duration-200',
        isProductMode
          ? item.current
            ? 'bg-purple-900/50 text-purple-300'
            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          : item.current
            ? 'bg-indigo-50 text-indigo-700'
            : 'text-gray-700 hover:bg-gray-100'
      )}
    >
      <item.icon className="h-5 w-5 mr-3" />
      {item.name}
    </Link>
  );

  // Select the collapsible component based on debug flag
  const FolderComponent = USE_NATIVE_COLLAPSIBLE ? NativeCollapsibleFolder : CollapsibleFolder;
  console.log('[HierarchicalNavigation] Using', USE_NATIVE_COLLAPSIBLE ? 'NATIVE' : 'RADIX', 'collapsible');

  return (
    <>
      {/* Render folders with their nested items */}
      {sortedFolders.map((folder) => {
        const folderItems = itemsByFolder[folder.id];
        // Skip folders with no items
        if (!folderItems || folderItems.length === 0) return null;

        return (
          <FolderComponent
            key={folder.id}
            folder={folder}
            isProductMode={isProductMode}
          >
            {folderItems.map(renderNavLink)}
          </FolderComponent>
        );
      })}

      {/* Render root-level items (not assigned to any folder) */}
      {itemsByFolder.root?.map(renderNavLink)}
    </>
  );
}

HierarchicalNavigation.propTypes = {
  navigation: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      icon: PropTypes.elementType.isRequired,
      href: PropTypes.string.isRequired,
      current: PropTypes.bool,
    })
  ).isRequired,
  onItemClick: PropTypes.func,
};

HierarchicalNavigation.defaultProps = {
  onItemClick: () => {},
};
