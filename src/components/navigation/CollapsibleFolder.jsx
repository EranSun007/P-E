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

  return (
    <Collapsible open={isOpen} onOpenChange={() => toggleFolder(folder.id)}>
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

      <CollapsibleContent className="pl-6">
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
