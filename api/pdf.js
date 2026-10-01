import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {

    try {

        // केवल POST
        if (req.method !== "POST") {

            return res.status(405).json({
                success: false,
                message: "Only POST request allowed"
            });

        }


        // Request से URL लेना
        const { url } = req.body || {};


        if (!url) {

            return res.status(400).json({
                success: false,
                message: "URL is required"
            });

        }


        console.log("Opening URL:", url);


        // Chromium start
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


        const page = await browser.newPage();


        // Website खोलना
        await page.goto(url, {

            waitUntil: "networkidle0",

            timeout: 45000

        });


        // थोड़ा wait
        await new Promise(resolve =>
            setTimeout(resolve, 1000)
        );


        // PDF बनाना
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


        await browser.close();


        // PDF response
        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            "attachment; filename=\"test.pdf\""
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
