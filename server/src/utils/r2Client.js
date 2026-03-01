/**
 * r2Client.js
 * Cloudflare R2 S3-compatible client.
 * All credentials are read from environment variables — never hardcoded.
 */

import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CF_ACCOUNT_ID;

if (!accountId) {
    console.warn('[R2] CF_ACCOUNT_ID is not set — R2 uploads will fail.');
}

export const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.CF_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.CF_SECRET_ACCESS_KEY || '',
    },
});

export const R2_BUCKET = process.env.CF_BUCKET_NAME || 'hirescopes-resumes';
