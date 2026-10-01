export default async function handler(req, res) {
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

    const response = await fetch(url);

    const text = await response.text();

    return res.status(200).json({
      success: true,
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get("content-type"),
      responseLength: text.length,
      preview: text.substring(0, 500)
    });

  } catch (error) {

    console.error("FETCH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Fetch failed",
      error: error.message,
      stack: error.stack
    });
  }
}
