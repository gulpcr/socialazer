const { scrapeWebsite } = require('../services/scraper.service');
const { generateQRCode } = require('../services/qr.service');

async function scrapeController(req, res) {
    try {
        const { url } = req.body;
        if (!url) throw new Error('URL is required');

        // Generate QR and upload
        const qrResult = await generateQRCode(url);

        // 2. Scrape website
        const scrapeResult = await scrapeWebsite(url);

        res.status(200).json({
            success: true,
            message: scrapeResult.message,
            rows: scrapeResult.totalRows,
            qr: {
                publicUrl: qrResult.publicQrUrl,   // <- this is the correct public QR URL
                urlFile: qrResult.urlFilePath
            }
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    scrapeController
};
