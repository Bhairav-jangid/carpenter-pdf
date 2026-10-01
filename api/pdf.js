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

    // --------------------------------
    // STEP 1: Fetch HTML using Vercel
    // --------------------------------

    console.log("Fetching URL:", url);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Source server returned HTTP ${response.status}`
      );
    }

    const html = await response.text();

    console.log("HTML received:", html.length);

    // --------------------------------
    // STEP 2: Start Chromium
    // --------------------------------

    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ],
      executablePath: await chromium.executablePath(),
      headless: true
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 900,
      deviceScaleFactor: 1
    });

    // --------------------------------
    // STEP 3: Load HTML directly
    // --------------------------------

    await page.setContent(html, {
      waitUntil: "domcontentloaded"
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log("HTML loaded into Chromium");

    // --------------------------------
    // STEP 4: Generate PDF
    // --------------------------------

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

    // --------------------------------
    // STEP 5: Return PDF
    // --------------------------------

    res.statusCode = 200;

    res.setHeader(
      "Content-Type",
      "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="test.pdf"'
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
