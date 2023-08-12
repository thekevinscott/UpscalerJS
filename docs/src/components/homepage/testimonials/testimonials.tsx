import React from 'react';
import clsx from 'clsx';
import styles from './testimonials.module.scss';
import { TwitterTweetEmbed } from 'react-twitter-embed';
import { useColorMode } from '@docusaurus/theme-common';

const TWEETS = [
  '1353616560057815041',
  '1438507464144523270',
  '1438533652154097667',
  // '1563745210655547392',
  '1353739999213191168',
  '1361921667170263040',
]

export function Testimonials() {
  const { colorMode } = useColorMode();
  return (
    <div className={styles.testimonials}>
      <div className={clsx('row')}>
        <h2>Testimonials</h2>
      </div>
      <div className={styles.tweets}>
        {TWEETS.map((tweetId) => (
          <div className={styles.tweet} key={tweetId}>
            <TwitterTweetEmbed
              tweetId={tweetId}
              options={{
                theme: colorMode,
              }}
              key={colorMode}	
              />
          </div>
          ))}
      </div>
    </div>
  );
}
