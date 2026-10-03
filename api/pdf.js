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

    console.log("SOURCE URL:", url);

    // -----------------------------
    // 1. Fetch HTML
    // -----------------------------

    const response = await fetch(url);

    const html = await response.text();

    console.log("HTTP STATUS:", response.status);
    console.log("HTML LENGTH:", html.length);

    if (!response.ok) {
      return res.status(500).json({
        success: false,
        message: "Source page returned error",
        status: response.status,
        preview: html.substring(0, 1000)
      });
    }

    if (!html || html.length < 10) {
      return res.status(500).json({
        success: false,
        message: "Empty HTML received"
      });
    }

    // -----------------------------
    // 2. Launch Chromium
    // -----------------------------

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

    console.log("Chromium started");

    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 900,
      deviceScaleFactor: 1
    });

    // -----------------------------
    // 3. Set HTML
    // -----------------------------

    await page.setContent(html, {
      waitUntil: ["domcontentloaded", "networkidle0"],
      timeout: 30000
    });

    // Thoda sa pause taaki Google fonts render ho sakein
    await new Promise(resolve => setTimeout(resolve, 2500));

    console.log("HTML loaded");

    // Give browser time to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    const title = await page.title();

    const bodyText = await page.evaluate(() => {
      return document.body
        ? document.body.innerText.substring(0, 1000)
        : "";
    });

    console.log("TITLE:", title);
    console.log("BODY:", bodyText);

    // -----------------------------
    // 4. Generate PDF
    // -----------------------------

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

    console.log("PDF SIZE:", pdfBuffer.length);

    if (!pdfBuffer || pdfBuffer.length < 1000) {

      return res.status(500).json({
        success: false,
        message: "PDF buffer is empty or invalid",
        pdfSize: pdfBuffer ? pdfBuffer.length : 0,
        title: title,
        body: bodyText
      });

    }

    await browser.close();

    browser = null;

    // -----------------------------
    // 5. Send PDF
    // -----------------------------

    const pdfBinary = Buffer.from(pdfBuffer);

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
