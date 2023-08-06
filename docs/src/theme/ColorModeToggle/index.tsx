import React from 'react';
import ColorModeToggle from '@theme-original/ColorModeToggle';
import { useShoelaceColorTheme } from '@site/src/hooks/useShoelaceColorTheme';

export default function ColorModeToggleWrapper(props) {
  useShoelaceColorTheme();
  return (
    <ColorModeToggle {...props} />
  );
}
