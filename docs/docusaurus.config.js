// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/nightOwl');

const GITHUB_ROOT = 'https://github.com/thekevinscott/UpscalerJS';

/** @type {import('@docusaurus/types').Config} */
const config = {
  staticDirectories: [
    'assets', 
    'node_modules/sql.js/dist',
  ],
  title: 'UpscalerJS',
  tagline: 'Upscale images in your browser with Tensorflow.js',
  url: 'https://upscalerjs.com',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',

  organizationName: 'thekevinscott',
  projectName: 'upscalerjs',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    function (context, options) {
      return {
        name: 'webpack-configuration-plugin',
        configureWebpack() {
          return {
            resolve: {
              fallback: {
                fs: false,
                "path": require.resolve("path-browserify"),
                "crypto": require.resolve("crypto-browserify"),
                "stream": require.resolve("stream-browserify"),
              },
            },
          };
        }
      };
    },
    'docusaurus-plugin-sass',
  ],

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/', // Serve the docs at the site's root
          sidebarPath: require.resolve('./sidebars.js'),
          breadcrumbs: false,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.scss'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      sidebar: {
        hideable: true,
        autoCollapseCategories: true,
      },
      colorMode: {
        defaultMode: 'dark',
        disableSwitch: false,
        respectPrefersColorScheme: false,
      },
      navbar: {
        title: 'UpscalerJS',
        // logo: {
        //   alt: 'My Site Logo',
        //   src: 'img/logo.svg',
        // },
        items: [
          {
            to: '/demo',
            position: 'left',
            label: 'Demo',
          },
          // {
          //   type: 'doc',
          //   docId: 'getting-started',
          //   position: 'left',
          //   label: 'Docs',
          // },
          {
            to: '/models',
            position: 'left',
            label: 'Models',
          },
          // { to: '/blog', label: 'News', position: 'left' },
          // {
          //   to: 'support',
          //   label: 'Support',
          //   position: 'left',
          // },
          {
            href: 'https://npmjs.com/package/upscaler',
            label: 'npm',
            'aria-label': 'UpscalerJS NPM package',
            position: 'right',
          },
          {
            href: GITHUB_ROOT,
            label: 'GitHub',
            position: 'right',
            'aria-label': 'UpscalerJS GitHub repository',
          },
        ],
      },
      // footer: {
      //   style: 'dark',
      //   links: [
      //     {
      //       title: 'Docs',
      //       items: [
      //         {
      //           label: 'Tutorial',
      //           to: '/docs/intro',
      //         },
      //       ],
      //     },
      //     // {
      //     //   title: 'Community',
      //     //   items: [
      //     //     {
      //     //       label: 'Stack Overflow',
      //     //       href: 'https://stackoverflow.com/questions/tagged/docusaurus',
      //     //     },
      //     //     {
      //     //       label: 'Discord',
      //     //       href: 'https://discordapp.com/invite/docusaurus',
      //     //     },
      //     //     {
      //     //       label: 'Twitter',
      //     //       href: 'https://twitter.com/docusaurus',
      //     //     },
      //     //   ],
      //     // },
      //     // {
      //     //   title: 'More',
      //     //   items: [
      //     //     {
      //     //       label: 'Blog',
      //     //       to: '/blog',
      //     //     },
      //     //     {
      //     //       label: 'GitHub',
      //     //       href: 'https://github.com/facebook/docusaurus',
      //     //     },
      //     //   ],
      //     // },
      //   ],
      //   // copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with Docusaurus.`,
      // },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
