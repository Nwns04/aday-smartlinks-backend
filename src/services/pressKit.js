// services/pressKit.js
const puppeteer = require('puppeteer');

async function generatePressKit(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent);
  const pdf = await page.pdf({ format: 'A4' });
  await browser.close();
  return pdf;
}

module.exports = { generatePressKit };
