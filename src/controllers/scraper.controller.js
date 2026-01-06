// src/controllers/scraper.controller.js
const { scrapeWebsite } = require('../services/scraper.service');
const { generateQRCode } = require('../services/qr.service');

async function scrapeController(req, res) {
    try {
        const { url } = req.body;
        if (!url) throw new Error('URL is required');

        // 1. Scrape website and get structured data
        const scrapeResult = await scrapeWebsite(url);

        // 2. Generate QR code (optional - can be included in response if needed)
        let qrData = null;
        try {
            const qrResult = await generateQRCode(url);
            qrData = {
                publicUrl: qrResult.publicQrUrl,
                urlFile: qrResult.urlFilePath
            };
        } catch (qrError) {
            console.warn('QR generation failed:', qrError.message);
            // Continue without QR if it fails
        }

        // 3. Return the formatted response
        const response = {
            ...scrapeResult,
            // Optionally include QR data if needed
            ...(qrData && { qr: qrData })
        };

        res.status(200).json(response);
    } catch (error) {
        console.error('Scraper controller error:', error);
        res.status(400).json({
            success: false,
            error: error.message,
            status: 'failed'
        });
    }
}

module.exports = {
    scrapeController
};