import path from "path";
import fs from "fs/promises";  // you want promises here, not callbacks
import handlebars from "handlebars";
import puppeteer from "puppeteer";
import { AdminSettings } from "../models/adminSettings.model.js";

// register handlebars helpers
handlebars.registerHelper("multiply", (a, b) => (a * b).toFixed(2));
handlebars.registerHelper("year", () => new Date().getFullYear());

export const generateReceipt = async (order) => {
  // fetch dynamic company name
  const settings = await AdminSettings.findOne();

  const companyName = settings?.name || "yyy";
  const adminEmail = settings?.adminEmail || "yyy";

  const templatePath = path.join(process.cwd(), "templates", "receipt.hbs");
  const templateHtml = await fs.readFile(templatePath, "utf-8");

  const template = handlebars.compile(templateHtml);
console.log('Using Puppeteer executable at:', puppeteer.executablePath());

  const orderData = {
    ...order.toObject(),
    createdAt: new Date(order.createdAt).toLocaleString(),
    companyName,adminEmail
  };
  // console.log('orderData',orderData)
  const html = template(orderData);

  const browser = await puppeteer.launch({
  headless: "new", // or true
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});



  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
  });

  await fs.writeFile("test-output.pdf", pdfBuffer);

  await browser.close();
  return pdfBuffer;
};