import React from 'react';
import { HomepageFeatures } from './features/features';
import { HomepageHeader } from './header/header';
import { Examples } from './examples/examples';
import { Testimonials } from './testimonials/testimonials';
import Link from '@docusaurus/Link'

import styles from './homepage.module.scss';

export function Homepage() {
  return (
    <div id={styles.homePage}>
      <HomepageHeader />
      <main>
        <section className={styles.cta}>
        <Link
            className="button button--primary button--lg"
            to="/demo">
              Try a Live Demo →
          </Link>
        </section>
        <section>
          <HomepageFeatures />
        </section>
        <section className={styles.off}>
          <div className={styles.innerSection}>
            {/* <Examples /> */}
          </div>
        </section>
        <section>
          <div className={styles.innerSection}>
            {/* <Testimonials /> */}
          </div>
        </section>
        <section className={styles.off}>
          <div className={styles.innerSection}>
            <h2>Get Started</h2>
            <ul>
              <li><Link href="/documentation/getting-started">Install and integrate locally</Link></li>
              <li><Link href="/demo">Check out a live demo in your browser</Link></li>
              <li><Link href="/models">See benchmarks and information on available models</Link></li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  );
}

