import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request =>
    console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText)
  );

  console.log('Navigating to http://localhost:8080/');
  try {
    await page.goto('http://localhost:8080/', { waitUntil: 'networkidle0' });
    console.log('Successfully loaded page!');
  } catch (e) {
    console.log('Failed to load:', e.message);
  }
  
  await browser.close();
})();
