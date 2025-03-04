// hooks/useTooltipFix.ts
import { useEffect } from 'react';

/**
 * A simplified hook to fix tooltip blinking issues
 */
export const useTooltipFix = () => {
  useEffect(() => {
    // Simple function to hide all tooltips
    const hideAllTooltips = (e: Event) => {
      // Check if the click was on a tooltip trigger
      if (e.type === 'click') {
        const clickEvent = e as MouseEvent;
        const target = clickEvent.target as HTMLElement;
        
        // If we clicked on a tooltip trigger, don't hide the tooltip
        if (target && (
          target.hasAttribute('data-tooltip-id') || 
          target.closest('[data-tooltip-id]')
        )) {
          return;
        }
      }
      
      // Get all tooltip elements
      const tooltips = document.querySelectorAll('.react-tooltip');
      if (tooltips.length > 0) {
        tooltips.forEach(tooltip => {
          tooltip.setAttribute('data-hidden', 'true');
          // Cast to HTMLElement to access style property
          const htmlTooltip = tooltip as HTMLElement;
          htmlTooltip.style.opacity = '0';
          htmlTooltip.style.visibility = 'hidden';
        });
      }
    };

    // Add event listeners for common cases that should dismiss tooltips
    window.addEventListener('scroll', hideAllTooltips);
    window.addEventListener('resize', hideAllTooltips);
    document.addEventListener('click', hideAllTooltips);
    document.addEventListener('keydown', hideAllTooltips);
    
    // Clean up event listeners
    return () => {
      window.removeEventListener('scroll', hideAllTooltips);
      window.removeEventListener('resize', hideAllTooltips);
      document.removeEventListener('click', hideAllTooltips);
      document.removeEventListener('keydown', hideAllTooltips);
    };
  }, []);
};

export default useTooltipFix;