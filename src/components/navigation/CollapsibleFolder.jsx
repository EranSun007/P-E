/**
 * CollapsibleFolder Component
 * Renders a collapsible folder header with rotating chevron and nested menu items
 * Uses Radix Collapsible for accessibility (ARIA, keyboard nav)
 */

import PropTypes from 'prop-types';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollapsedFolders } from '@/hooks/useCollapsedFolders';
import { useEffect, useRef } from 'react';

// DEBUG: Track instances and renders
let collapsibleFolderCount = 0;

/**
 * CollapsibleFolder renders a folder with expand/collapse functionality
 * @param {object} props
 * @param {object} props.folder - Folder object with { id, name, order }
 * @param {React.ReactNode} props.children - Nested menu items
 * @param {boolean} props.isProductMode - True for product mode theming (dark)
 */
export function CollapsibleFolder({ folder, children, isProductMode }) {
  const { isCollapsed, toggleFolder } = useCollapsedFolders();
  const isOpen = !isCollapsed(folder.id);
  const renderCountRef = useRef(0);
  const instanceIdRef = useRef(null);

  // DEBUG: Track instance and renders
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++collapsibleFolderCount;
  }
  renderCountRef.current++;
  console.log('[CollapsibleFolder] Instance', instanceIdRef.current, 'render #', renderCountRef.current, {
    folderId: folder.id,
    folderName: folder.name,
    isOpen
  });

  // DEBUG: Track mount/unmount
  useEffect(() => {
    console.log('[CollapsibleFolder] Mounted:', folder.id);
    return () => {
      console.log('[CollapsibleFolder] Unmounted:', folder.id);
    };
  }, [folder.id]);

  const handleOpenChange = () => {
    console.log('[CollapsibleFolder] onOpenChange triggered:', folder.id, 'current isOpen:', isOpen);
    toggleFolder(folder.id);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger
        className={cn(
          'flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors',
          isProductMode
            ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100'
        )}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 mr-2 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
        <span>{folder.name}</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="overflow-hidden pl-6 data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

CollapsibleFolder.propTypes = {
  folder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    order: PropTypes.number,
  }).isRequired,
  children: PropTypes.node,
  isProductMode: PropTypes.bool,
};

CollapsibleFolder.defaultProps = {
  children: null,
  isProductMode: false,
};
