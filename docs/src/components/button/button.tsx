import React from 'react';
import { useShoelaceEventListener } from '@site/src/hooks/useShoelaceEventListener';
import { SlButton as _SlButton} from '@shoelace-style/shoelace/dist/react';
import { SlButton } from '@shoelace-style/shoelace';
import { CustomElement } from '@site/src/utils/customElement';

interface IProps extends Omit<React.ComponentProps<typeof _SlButton>, 'className'>{
  class?: string;
  onClick?: () => void; 
}
export const Button = ({ onClick, draggable, translate, ...props }: IProps) => {
  const ref = useShoelaceEventListener<HTMLButtonElement>(onClick, 'click', 'touch');
  return (
    <sl-button
      ref={ref}
      class="button"
      {...props}
    />
  );
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      ['sl-button']: CustomElement<SlButton>;
    }
  }
}
