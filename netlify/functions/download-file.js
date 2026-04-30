const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    const params = event.queryStringParameters || {};

    // Production: Netlify Blobs
    if (params.key) {
        try {
            const { getStore } = require('@netlify/blobs');
            const store = getStore('form-uploads');
            const blob = await store.getWithMetadata(params.key, { type: 'arrayBuffer' });

            if (!blob || !blob.data) {
                return { statusCode: 404, body: 'File not found' };
            }

            const metadata = blob.metadata || {};
            return {
                statusCode: 200,
                headers: {
                    'Content-Type': metadata.contentType || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${metadata.filename || 'file'}"`,
                    'Cache-Control': 'public, max-age=31536000'
                },
                body: Buffer.from(blob.data).toString('base64'),
                isBase64Encoded: true
            };
        } catch (error) {
            console.error('Blob download error:', error);
            return { statusCode: 500, body: 'Error retrieving file' };
        }
    }

    // Local dev: read from disk
    if (params.ts && params.name) {
        try {
            const filePath = path.join(process.cwd(), 'uploads', params.ts, params.name);

            if (!fs.existsSync(filePath)) {
                return { statusCode: 404, body: 'File not found' };
            }

            const fileData = fs.readFileSync(filePath);
            const ext = path.extname(params.name).toLowerCase();

            const mimeTypes = {
                '.pdf':  'application/pdf',
                '.jpg':  'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png':  'image/png',
                '.gif':  'image/gif',
                '.doc':  'application/msword',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };

            return {
                statusCode: 200,
                headers: {
                    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${params.name}"`,
                    'Cache-Control': 'public, max-age=31536000'
                },
                body: fileData.toString('base64'),
                isBase64Encoded: true
            };
        } catch (error) {
            console.error('Local download error:', error);
            return { statusCode: 500, body: 'Error retrieving file' };
        }
    }

    return { statusCode: 400, body: 'Missing parameters' };
};