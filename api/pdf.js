import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {

    try {

        // -----------------------------------------
        // Only POST
        // -----------------------------------------

        if (req.method !== "POST") {

            return res.status(405).json({
                success: false,
                message: "Only POST request allowed"
            });

        }


        // -----------------------------------------
        // Get URL
        // -----------------------------------------

        const { url } = req.body || {};

        if (!url) {

            return res.status(400).json({
                success: false,
                message: "URL is required"
            });

        }


        console.log("PDF URL:", url);


        // -----------------------------------------
        // Launch Chromium
        // -----------------------------------------

        const browser = await puppeteer.launch({

            args: chromium.args,

            executablePath: await chromium.executablePath(),

            headless: true,

            defaultViewport: {
                width: 1280,
                height: 900,
                deviceScaleFactor: 1
            }

        });


        // -----------------------------------------
        // New Page
        // -----------------------------------------

        const page = await browser.newPage();


        // -----------------------------------------
        // Open website
        // -----------------------------------------

        await page.goto(url, {

            waitUntil: "networkidle0",

            timeout: 45000

        });


        // -----------------------------------------
        // Wait for fonts/images
        // -----------------------------------------

        await new Promise(resolve =>
            setTimeout(resolve, 1500)
        );


        // -----------------------------------------
        // Generate PDF
        // -----------------------------------------

        const pdfBuffer = await page.pdf({

            format: "A4",

            landscape: false,

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


        // -----------------------------------------
        // IMPORTANT
        // Convert Buffer to binary string
        // -----------------------------------------

        const pdfBinary = Buffer.from(pdfBuffer);


        // -----------------------------------------
        // Headers
        // -----------------------------------------

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=\"invoice.pdf\""
        );

        res.setHeader(
            "Cache-Control",
            "no-store, no-cache, must-revalidate"
        );

        res.setHeader(
            "Pragma",
            "no-cache"
        );


        // -----------------------------------------
        // Send real PDF binary
        // -----------------------------------------

        return res.end(pdfBinary);


    } catch (error) {

        console.error("PDF ERROR:", error);

        return res.status(500).json({

            success: false,

            message: "PDF generation failed",

            error: error.message

        });

    }

}
