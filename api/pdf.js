import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {

    try {

        // ---------------------------------------
        // Only POST request
        // ---------------------------------------

        if (req.method !== "POST") {

            return res.status(405).json({
                success: false,
                message: "Only POST request allowed"
            });

        }


        // ---------------------------------------
        // Get URL from request
        // ---------------------------------------

        const { url } = req.body || {};


        if (!url) {

            return res.status(400).json({
                success: false,
                message: "URL is required"
            });

        }


        // ---------------------------------------
        // Launch Chromium
        // ---------------------------------------

        const browser = await puppeteer.launch({

            args: chromium.args,

            defaultViewport: {
                width: 1280,
                height: 900,
                deviceScaleFactor: 1
            },

            executablePath: await chromium.executablePath(),

            headless: "shell",

            ignoreHTTPSErrors: true

        });


        // ---------------------------------------
        // Create page
        // ---------------------------------------

        const page = await browser.newPage();


        // ---------------------------------------
        // Open invoice page
        // ---------------------------------------

        await page.goto(url, {

            waitUntil: "networkidle0",

            timeout: 45000

        });


        // ---------------------------------------
        // Wait a little for fonts/images
        // ---------------------------------------

        await new Promise(resolve => setTimeout(resolve, 1500));


        // ---------------------------------------
        // Generate PDF
        // ---------------------------------------

        const pdf = await page.pdf({

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


        // ---------------------------------------
        // Close browser
        // ---------------------------------------

        await browser.close();


        // ---------------------------------------
        // Return PDF
        // ---------------------------------------

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            "inline; filename=\"invoice.pdf\""
        );

        res.setHeader(
            "Content-Length",
            pdf.length
        );


        return res.status(200).send(pdf);


    } catch (error) {

        console.error(error);

        return res.status(500).json({

            success: false,

            message: "PDF generation failed",

            error: error.message

        });

    }

}