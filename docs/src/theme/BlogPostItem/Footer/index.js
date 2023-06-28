import React from 'react';
import clsx from 'clsx';
import {useBlogPost} from '@docusaurus/theme-common/internal';
import EditThisPage from '@theme/EditThisPage';
import TagsListInline from '@theme/TagsListInline';
import ReadMoreLink from '@theme/BlogPostItem/Footer/ReadMoreLink';
import BlogPostItemHeaderAuthors from '@theme/BlogPostItem/Header/Authors';
import styles from './styles.module.css';
export default function BlogPostItemFooter() {
  const {metadata, isBlogPostPage} = useBlogPost();
  const {tags, title, editUrl, hasTruncateMarker} = metadata;
  // A post is truncated if it's in the "list view" and it has a truncate marker
  const truncatedPost = !isBlogPostPage && hasTruncateMarker;
  if (truncatedPost) {
    return null;
  }
  const tagsExists = tags.length > 0;
  const renderFooter = tagsExists || editUrl;
  if (!renderFooter) {
    return null;
  }
  return (
    <footer
      className={clsx(
        'row docusaurus-mt-lg',
        isBlogPostPage && styles.blogPostFooterDetailsFull,
      )}>

      {!truncatedPost && (
        <>
          <div className={clsx('col', {'col--6': !truncatedPost})}>
            <BlogPostItemHeaderAuthors />
          </div>
          {tagsExists && (
            <div className={clsx('col', isBlogPostPage && styles.blogPostTags, {
              'col--3': truncatedPost,
              'col--6': !truncatedPost,
            })}>
              <TagsListInline tags={tags} />
            </div>
          )}
        </>
      )}


      {isBlogPostPage && editUrl && (
        <div className="col margin-top--sm">
          <EditThisPage editUrl={editUrl} />
        </div>
      )}

      {truncatedPost && (
        <div
          className={clsx('col text--right', {
            'col--3': tagsExists,
          })}>
          <ReadMoreLink blogPostTitle={title} to={metadata.permalink} />
        </div>
      )}
    </footer>
  );
}
