import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:8080');
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: '/Users/markomangira/Desktop/Business/KENYAFUNDFINDER/screenshot_test.png' });
  await browser.close();
})();
