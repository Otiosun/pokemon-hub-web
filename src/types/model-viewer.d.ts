import type { DetailedHTMLProps, HTMLAttributes } from 'react';

type ModelViewerAttributes = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
  src?: string;
  poster?: string;
  alt?: string;
  autoplay?: boolean;
  'camera-controls'?: boolean;
  'disable-pan'?: boolean;
  'interaction-prompt'?: 'auto' | 'none';
  'shadow-intensity'?: string;
  'touch-action'?: string;
};

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes;
    }
  }
}
