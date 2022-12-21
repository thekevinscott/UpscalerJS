import React from 'react';
import clsx from 'clsx';
import {useDocsSidebar} from '@docusaurus/theme-common/internal';
import styles from './styles.module.css';
export const HiddenSidebarContainerContext = React.createContext(undefined);

export default function DocPageLayoutMain({ hiddenSidebarContainer, children }) {
  const sidebar = useDocsSidebar();
  return (
    <main
      className={clsx(
        styles.docMainContainer,
        (hiddenSidebarContainer || !sidebar) && styles.docMainContainerEnhanced,
      )}>
      <HiddenSidebarContainerContext.Provider value={hiddenSidebarContainer}>
        {children}
      </HiddenSidebarContainerContext.Provider>
    </main>
  );
}
