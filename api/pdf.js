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
    // 1. Launch Chromium
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
    // 2. Navigate Directly via page.goto
    // -----------------------------
    // networkidle2 use kiya hai taki agar koi external tracker/font slow ho toh timeout na ho
    await page.goto(url, {
      waitUntil: ["domcontentloaded", "networkidle2"],
      timeout: 30000
    });

    console.log("Page loaded via goto");

    // Thoda buffer time taaki fonts aur images 100% render ho jayein
    await new Promise(resolve => setTimeout(resolve, 3000));

    const title = await page.title();

    const bodyText = await page.evaluate(() => {
      return document.body
        ? document.body.innerText.substring(0, 1000)
        : "";
    });

    console.log("TITLE:", title);
    console.log("BODY:", bodyText);

    // -----------------------------
    // 3. Generate PDF
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
    // 4. Send PDF Response
    // -----------------------------

    const pdfBinary = Buffer.from(pdfBuffer);

    res.statusCode = 200;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="invoice.pdf"');
    res.setHeader("Content-Length", pdfBinary.length);
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");

    return res.end(pdfBinary);

  } catch (error) {

    console.log("PDF ERROR:", error);

    if (browser) {
      try {
        await browser.close();
      } else {}
    }

    return res.status(500).json({
      success: false,
      message: "PDF generation failed",
      error: error.message,
      stack: error.stack
    });

  }
}
