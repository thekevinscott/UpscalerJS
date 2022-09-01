import React, { useCallback } from 'react';
import { SlRange  } from '@shoelace-style/shoelace/dist/react';

export const Range = ({ onChange, ...props }) => {
  const handleChange = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  }, [onChange]);

  return (
    <SlRange
    onSlChange={handleChange}
    {...props}
    />
  );
}
