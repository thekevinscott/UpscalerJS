import React, { useContext } from 'react';
import clsx from 'clsx';
import {useWindowSize} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/theme-common/internal';
import DocItemPaginator from '@theme/DocItem/Paginator';
import DocVersionBanner from '@theme/DocVersionBanner';
import DocVersionBadge from '@theme/DocVersionBadge';
import DocItemFooter from '@theme/DocItem/Footer';
import DocItemTOCMobile from '@theme/DocItem/TOC/Mobile';
import DocItemTOCDesktop from '@theme/DocItem/TOC/Desktop';
import DocItemContent from '@theme/DocItem/Content';
import DocBreadcrumbs from '@theme/DocBreadcrumbs';
import styles from './styles.module.scss';
import { HiddenSidebarContainerContext } from '../../DocPage/Layout/Main';
import CodeEmbed from '@site/src/components/codeEmbed/codeEmbed';
/**
 * Decide if the toc should be rendered, on mobile or desktop viewports
 */
function useDocTOC() {
  const {frontMatter, toc} = useDoc();
  const windowSize = useWindowSize();
  const fullWidth = frontMatter.full_width;
  const hidden = fullWidth || frontMatter.hide_table_of_contents;
  const canRender = !hidden && toc.length > 0;
  const mobile = canRender ? <DocItemTOCMobile /> : undefined;
  const embed = frontMatter.code_embed;
  const desktop =
    canRender && (windowSize === 'desktop' || windowSize === 'ssr') ? (
      <DocItemTOCDesktop />
    ) : undefined;
  return {
    hidden,
    mobile,
    desktop,
    fullWidth,
    embed,
  };
}
export default function DocItemLayout({children}) {
  const docTOC = useDocTOC();
  const hiddenSidebarContainer = useContext(HiddenSidebarContainerContext);
  return (
    <div className={styles.container}>
      {docTOC.embed && (
        <CodeEmbed
          url={docTOC.embed.url}
          params={docTOC.embed.params}
          persist 
          type={docTOC.embed.type}
        />
      )}
      <div
        className={clsx(
          'container padding-top--md padding-bottom--lg',
          hiddenSidebarContainer && styles.docItemWrapperEnhanced,
        )}>
        <div className="row">
          <div className={clsx('col', !docTOC.hidden && styles.docItemCol, docTOC.fullWidth && styles.fullWidth)}>
            <DocVersionBanner />
            <div className={styles.docItemContainer}>
              <article>
                <DocBreadcrumbs />
                <DocVersionBadge />
                {docTOC.mobile}
                <DocItemContent>
                  {children}
                  </DocItemContent>
                <DocItemFooter />
              </article>
              <DocItemPaginator />
            </div>
          </div>
          {docTOC.desktop && <div className="col col--3">{docTOC.desktop}</div>}
        </div>
      </div>
    </div>
  );
}
