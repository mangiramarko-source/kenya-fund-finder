import puppeteer from 'puppeteer';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  
  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 20000 });
    await page.screenshot({ path: 'screenshot.png' });
    console.log('Screenshot saved to screenshot.png');
  } catch (err) {
    console.log('GOTO_ERROR:', err.message);
  }

  await browser.close();
})();
