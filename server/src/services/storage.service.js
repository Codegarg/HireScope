import fs from 'fs';
import path from 'path';
import { r2, R2_BUCKET } from '../utils/r2Client.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

// Ensure the local fallback directory exists statically
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Robustly uploads a file. Tries Cloudflare R2 first; falls back to local disk if R2 fails.
 * @param {string} fileKey - Universal unique identifier for the file (e.g. resumes/xyz/123.pdf)
 * @param {Buffer} buffer - File data
 * @param {string} mimetype - Content type of the file
 * @returns {Promise<void>}
 */
export const uploadFile = async (fileKey, buffer, mimetype) => {
    try {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileKey,
            Body: buffer,
            ContentType: mimetype,
        }));
        console.log(`[StorageService] Successfully uploaded to R2: ${fileKey}`);
    } catch (r2Error) {
        console.error(`[StorageService] R2 Upload failed for ${fileKey}: ${r2Error.message}. Falling back to local storage.`);

        try {
            // Flatten the key path for local storage to avoid nested directory creation issues
            const safeLocalName = fileKey.replace(/\//g, '_');
            const localPath = path.join(UPLOADS_DIR, safeLocalName);
            await fs.promises.writeFile(localPath, buffer);
            console.log(`[StorageService] Fallback Local Upload Success: ${localPath}`);
        } catch (localErr) {
            console.error(`[StorageService] CRITICAL FAULT: Local upload also failed for ${fileKey}:`, localErr);
            throw new Error('Both Cloud Storage and Local Fallback Failed');
        }
    }
};

/**
 * Robustly retrieves a file stream. Checks R2 first; checks local fallback if R2 fails or throws NoSuchKey.
 * @param {string} fileKey - Universal unique identifier for the file
 * @returns {Promise<{ stream: import('stream').Readable, contentLength?: number }>}
 */
export const getFileStream = async (fileKey) => {
    try {
        const command = new GetObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileKey,
        });
        const r2Response = await r2.send(command);
        console.log(`[StorageService] R2 Fetch Success: ${fileKey}`);
        return {
            stream: r2Response.Body,
            contentLength: r2Response.ContentLength
        };
    } catch (r2Error) {
        console.warn(`[StorageService] R2 Fetch Failed for ${fileKey}: ${r2Error.message}. Searching local fallback.`);

        const safeLocalName = fileKey.replace(/\//g, '_');
        const localPath = path.join(UPLOADS_DIR, safeLocalName);

        try {
            await fs.promises.access(localPath, fs.constants.F_OK);
            const stat = await fs.promises.stat(localPath);
            const stream = fs.createReadStream(localPath);
            console.log(`[StorageService] Local Fetch Success: ${localPath}`);
            return {
                stream,
                contentLength: stat.size
            };
        } catch (localErr) {
            console.error(`[StorageService] CRITICAL FAULT: File not found in R2 or Local Storage for ${fileKey}`);
            throw new Error(`File not found: ${fileKey}`);
        }
    }
};

/**
 * Robustly deletes a file from both R2 and local fallback concurrently.
 * @param {string} fileKey - Universal unique identifier for the file
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileKey) => {
    const promises = [];

    // Queue R2 deletion promise
    promises.push(
        r2.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileKey,
        })).then(() => {
            console.log(`[StorageService] Deleted from R2: ${fileKey}`);
        }).catch(err => {
            console.warn(`[StorageService] R2 Deletion Soft-Fail for ${fileKey}: ${err.message}`);
        })
    );

    // Queue Local Fallback deletion promise
    const safeLocalName = fileKey.replace(/\//g, '_');
    const localPath = path.join(UPLOADS_DIR, safeLocalName);

    promises.push(
        fs.promises.unlink(localPath).then(() => {
            console.log(`[StorageService] Deleted from Local: ${localPath}`);
        }).catch(err => {
            if (err.code !== 'ENOENT') {
                console.warn(`[StorageService] Local Deletion Soft-Fail for ${localPath}: ${err.message}`);
            }
        })
    );

    await Promise.allSettled(promises);
};
