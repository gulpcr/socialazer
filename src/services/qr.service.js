// src/services/qr.service.js
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Generates a QR code and saves it locally.
 * Overwrites the existing file on every run.
 */
async function generateQRCode(url) {
    try {
        // Define the local directory and file path
        // Goes up one level from 'services' to 'src', then into 'assets/qr'
        const qrDir = path.join(__dirname, '../assets/qr');
        const qrFilePath = path.join(qrDir, 'code.png');

        // Ensure the directory exists
        if (!fs.existsSync(qrDir)) {
            fs.mkdirSync(qrDir, { recursive: true });
        }

        // Generate QR code and save directly to file
        // width: 512 ensures high resolution for video overlay
        // margin: 1 gives a small white border for scanability
        await QRCode.toFile(qrFilePath, url, {
            width: 512,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#FFFFFF'
            },
            errorCorrectionLevel: 'H' // High error correction (good for video overlays)
        });

        console.log(`✅ QR Code saved locally at: ${qrFilePath}`);

        return {
            success: true,
            qrFilePath: qrFilePath
        };

    } catch (error) {
        console.error('Failed to generate QR code:', error);
        throw new Error(`QR Generation failed: ${error.message}`);
    }
}

module.exports = { generateQRCode };