// hooks/useTooltipFix.ts
import { useEffect } from 'react';

/**
 * A simplified hook to fix tooltip blinking issues
 */
export const useTooltipFix = () => {
  useEffect(() => {
    // Simple function to hide all tooltips
    const hideAllTooltips = () => {
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