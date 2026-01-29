/**
 * NativeCollapsibleFolder Component
 * Alternative implementation using native HTML details/summary instead of Radix
 * Created for debugging to test if Radix Collapsible is causing click freeze
 */

import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollapsedFolders } from '@/hooks/useCollapsedFolders';
import { useEffect, useRef, useState } from 'react';

// DEBUG: Track instances
let nativeCollapsibleCount = 0;

/**
 * NativeCollapsibleFolder renders a folder with expand/collapse using native HTML
 * This is a Radix-free alternative for debugging the click freeze issue
 */
export function NativeCollapsibleFolder({ folder, children, isProductMode }) {
  const { isCollapsed, toggleFolder } = useCollapsedFolders();
  const isOpen = !isCollapsed(folder.id);
  const renderCountRef = useRef(0);
  const instanceIdRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // DEBUG: Track instance and renders
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++nativeCollapsibleCount;
  }
  renderCountRef.current++;
  console.log('[NativeCollapsibleFolder] Instance', instanceIdRef.current, 'render #', renderCountRef.current, {
    folderId: folder.id,
    folderName: folder.name,
    isOpen
  });

  // DEBUG: Track mount/unmount
  useEffect(() => {
    console.log('[NativeCollapsibleFolder] Mounted:', folder.id);
    return () => {
      console.log('[NativeCollapsibleFolder] Unmounted:', folder.id);
    };
  }, [folder.id]);

  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[NativeCollapsibleFolder] Toggle clicked:', folder.id, 'current isOpen:', isOpen);
    setIsAnimating(true);
    toggleFolder(folder.id);
    // Reset animation state after animation completes
    setTimeout(() => setIsAnimating(false), 200);
  };

  return (
    <div className="native-collapsible-folder">
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex items-center w-full px-4 py-2 text-sm font-medium rounded-md transition-colors',
          isProductMode
            ? 'text-gray-400 hover:bg-gray-800 hover:text-white'
            : 'text-gray-600 hover:bg-gray-100'
        )}
        aria-expanded={isOpen}
        aria-controls={`folder-content-${folder.id}`}
      >
        <ChevronDown
          className={cn(
            'h-4 w-4 mr-2 transition-transform duration-200',
            isOpen ? 'rotate-0' : '-rotate-90'
          )}
        />
        <span>{folder.name}</span>
      </button>

      {/* Content with animation */}
      <div
        id={`folder-content-${folder.id}`}
        className={cn(
          'overflow-hidden pl-6 transition-all duration-200',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
        style={{
          transitionProperty: 'max-height, opacity',
        }}
      >
        {children}
      </div>
    </div>
  );
}

NativeCollapsibleFolder.propTypes = {
  folder: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    order: PropTypes.number,
  }).isRequired,
  children: PropTypes.node,
  isProductMode: PropTypes.bool,
};

NativeCollapsibleFolder.defaultProps = {
  children: null,
  isProductMode: false,
};
