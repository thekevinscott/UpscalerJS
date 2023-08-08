import React from 'react';
import { useShoelaceEventListener } from '@site/src/hooks/useShoelaceEventListener';
import { SlButton as _SlButton} from '@shoelace-style/shoelace/dist/react';
import { SlButton } from '@shoelace-style/shoelace';
import { CustomElement } from '@site/src/utils/customElement';

interface IProps extends React.ComponentProps<typeof _SlButton>{
  onClick?: () => void; 
}
export const Button = ({ onClick, draggable, translate, ...props }: IProps) => {
  const ref = useShoelaceEventListener<HTMLButtonElement>(onClick, 'click', 'touch');
  return (
    <sl-button
      ref={ref}
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
