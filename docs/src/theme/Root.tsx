import React from 'react';
import '@shoelace-style/shoelace/dist/themes/light.css';
import '@shoelace-style/shoelace/dist/themes/dark.css';
import { useShoelace } from '../hooks/useShoelace';

export default function Root({children}) {
  useShoelace();
  return <>{children}</>;
}
