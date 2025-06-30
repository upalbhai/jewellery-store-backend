import fs from 'fs/promises';
import path from 'path';
import handlebars from 'handlebars';
import puppeteer from 'puppeteer';

// Custom helper for math in Handlebars
handlebars.registerHelper('multiply', (a, b) => (a * b).toFixed(2));
handlebars.registerHelper('year', () => new Date().getFullYear());

export const generateReceipt = async (order) => {
  const templatePath = path.join(process.cwd(), 'templates', 'receipt.hbs');
  const templateHtml = await fs.readFile(templatePath, 'utf-8');

  const template = handlebars.compile(templateHtml);
  
  // Convert dates to readable format
  const orderData = {
    ...order.toObject(),
    createdAt: new Date(order.createdAt).toLocaleString(),
  };

  const html = template(orderData);
  const browser = await puppeteer.launch({
  headless: "new",
  executablePath: "/usr/bin/chromium", // Installed by our script
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});


  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });

  await fs.writeFile('test-output.pdf', pdfBuffer);


  await browser.close();
  return pdfBuffer;
};
