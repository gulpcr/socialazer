const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');

async function uploadBufferToCatbox(buffer) {
    const form = new FormData();
    form.append('reqtype', 'fileupload');
    form.append('fileToUpload', buffer, { filename: 'qr.png', contentType: 'image/png' });

    const resp = await axios.post('https://catbox.moe/user/api.php', form, {
        headers: form.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity
    });

    return resp.data.trim(); // public URL
}

async function generateQRCode(url) {
    // Generate QR in memory
    const qrBuffer = await QRCode.toBuffer(url, { width: 512, margin: 1 });

    // Upload to Catbox.moe
    const publicQrUrl = await uploadBufferToCatbox(qrBuffer);

    // Store public URL locally
    const urlDir = path.join(__dirname, '../assets/url');
    fs.mkdirSync(urlDir, { recursive: true });
    const urlFilePath = path.join(urlDir, 'url.txt');
    fs.writeFileSync(urlFilePath, publicQrUrl, 'utf8');

    return {
        publicQrUrl,
        urlFilePath
    };
}

module.exports = { generateQRCode };
