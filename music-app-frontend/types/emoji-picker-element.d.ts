// types/emoji-picker-element.d.ts

declare module 'emoji-picker-element' {
  export default class Picker extends HTMLElement {
    constructor();
    
    // Methods
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
    
    // Properties that can be set
    skinToneEmoji: string;
    i18n: Record<string, string>;
    locale: string;
    dataSource: string;
    customEmoji: Array<{
      name: string;
      shortcodes: string[];
      url: string;
      category: string;
    }>;
  }
}

// Add the custom element to JSX IntrinsicElements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        ref?: React.RefObject<any>;
        class?: string;
        style?: React.CSSProperties;
      };
    }
  }
}