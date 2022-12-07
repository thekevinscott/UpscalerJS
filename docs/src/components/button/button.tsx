import React from 'react';
import { useShoelaceEventListener } from '@site/src/hooks/useShoelaceEventListener';
import { SlButton } from '@shoelace-style/shoelace/dist/react';

interface IProps extends React.ComponentProps<typeof SlButton>{
  onClick?: () => void; 
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
