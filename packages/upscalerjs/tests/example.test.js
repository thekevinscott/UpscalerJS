/**
 * Copyright Microsoft Corporation. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const DOCKER = process.env.docker;
const { it, expect } = require('@playwright/test');

it('is a basic test with the page', async ({ page }) => {
  await page.goto('https://playwright.dev/');
  expect(await page.innerText('.navbar__title')).toBe('Playwright');
});

it('tests the local server', async ({ browser }) => {
  console.log('1')
  const page = await browser.newPage();
  console.log('2')
  const url = DOCKER === undefined ? 'http://localhost:8000' : 'http://host.docker.internal:8000';
  console.log('3', url)
  await page.goto(url);
  console.log('4')
  const title = await page.title();
  console.log('5', title)
  expect(title).toBe('UpscalerJS Integration Test Webpack Bundler Server')
  console.log('6')
});
