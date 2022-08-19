import React, { useCallback, useEffect, useRef } from 'react';
import { SlRange  } from '@shoelace-style/shoelace/dist/react';

export const Range = ({ onChange, ...props }) => {
  const range = useRef<HTMLInputElement>();

  const _handleChange = useCallback((e) => {
    const target = e.target as HTMLInputElement;
    onChange(target.value);
  }, [onChange]);

  useEffect(() => {
    const c = range.current;
    if (c) {
      c.addEventListener('input', _handleChange);
      return () => {
        c.removeEventListener('input', _handleChange);
      }
    }
  }, [_handleChange, range]);

  return (
    <SlRange
    ref={range}
    {...props}
    />
  );
}
