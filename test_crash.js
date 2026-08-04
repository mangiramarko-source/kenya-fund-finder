import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => { if(msg.type() === 'error') console.log('BROWSER_ERROR:', msg.text()); });
  page.on('pageerror', error => console.log('PAGE_ERROR:', error.message));

  try {
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0', timeout: 20000 });
  } catch (err) {
    console.log('GOTO_ERROR:', err.message);
  }

  await browser.close();
})();
