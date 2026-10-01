import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {

  let browser = null;

  try {

    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        message: "Only POST request allowed"
      });
    }

    const { url } = req.body || {};

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required"
      });
    }

    console.log("PDF URL:", url);

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer"
      ],
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/140.0.0.0 Safari/537.36"
    );

    await page.setViewport({
      width: 1280,
      height: 900,
      deviceScaleFactor: 1
    });

    console.log("Opening page...");

    const response = await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 45000
    });

    console.log(
      "Page status:",
      response ? response.status() : "NO RESPONSE"
    );

    await page.waitForTimeout(2000);

    const title = await page.title();

    console.log("Page title:", title);

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });

    await browser.close();
    browser = null;

    const pdfBinary = Buffer.from(pdfBuffer);

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="invoice.pdf"'
    );

    res.setHeader(
      "Content-Length",
      pdfBinary.length
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate"
    );

    res.setHeader(
      "Pragma",
      "no-cache"
    );

    return res.end(pdfBinary);

  } catch (error) {

    console.error("PDF ERROR:", error);

    if (browser) {
      try {
        await browser.close();
      } catch (e) {}
    }

    return res.status(500).json({
      success: false,
      message: "PDF generation failed",
      error: error.message,
      stack: error.stack
    });
  }
}
