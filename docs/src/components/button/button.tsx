import React from 'react';
import { useShoelaceEventListener } from '@site/src/hooks/useShoelaceEventListener';
import { SlButton } from '@shoelace-style/shoelace/dist/react';

interface IProps {
  onClick?: () => void; 
  disabled?: boolean; 
  children?: (JSX.Element | string | Array<JSX.Element | string>);
  size?: 'small' | 'medium' | 'large';
  variant?: 'primary';
}
export const Button = ({ onClick, ...props }: IProps) => {
  const ref = useShoelaceEventListener<HTMLButtonElement>(onClick, 'click', 'touch');
  return (
    <SlButton
      ref={ref}
      {...props}
    />
  );
}
