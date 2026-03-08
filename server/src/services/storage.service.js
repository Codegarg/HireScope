import fs from 'fs';
import path from 'path';
import { r2, R2_BUCKET } from '../utils/r2Client.js';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '../utils/logger.js';

const UPLOADS_DIR = path.join(process.cwd(), 'uploads');

/**
 * Ensures the local fallback directory exists ONLY when needed.
 */
const ensureLocalDir = () => {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

/**
 * Validates that a fileKey follows the expected HireScope format.
 * Prevents saving corrupted or malformed keys to the database.
 * @param {string} fileKey 
 * @returns {boolean}
 */
export const validateFileKey = (fileKey) => {
    if (!fileKey || typeof fileKey !== 'string') return false;
    // Expected formats: 
    // resumes/{userId}/{timestamp}.{ext}
    // resumes/{userId}/v{version}-{timestamp}-{suffix}.pdf
    return fileKey.startsWith('resumes/') && fileKey.split('/').length >= 3;
};

/**
 * Standardized key generator for resumes and versions.
 * @param {string} userId 
 * @param {'original' | 'version'} type 
 * @param {object} metadata - { versionNumber, extension, suffix }
 * @returns {string}
 */
export const generateFileKey = (userId, type, { versionNumber, extension = 'pdf', suffix = '' } = {}) => {
    const timestamp = Date.now();
    if (type === 'original') {
        return `resumes/${userId}/${timestamp}.${extension}`;
    }
    const versionPart = versionNumber ? `v${versionNumber}-` : '';
    const suffixPart = suffix ? `-${suffix}` : '';
    return `resumes/${userId}/${versionPart}${timestamp}${suffixPart}.pdf`;
};

/**
 * Robustly uploads a file. Tries Cloudflare R2 first; falls back to local disk ONLY if R2 fails.
 * @param {string} fileKey - Universal unique identifier for the file
 * @param {Buffer} buffer - File data
 * @param {string} mimetype - Content type of the file
 * @returns {Promise<void>}
 */
export const uploadFile = async (fileKey, buffer, mimetype) => {
    if (!validateFileKey(fileKey)) {
        throw new Error(`Invalid fileKey format: ${fileKey}`);
    }

    try {
        await r2.send(new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: fileKey,
            Body: buffer,
            ContentType: mimetype,
        }));
        logger.upload('File uploaded successfully to R2', { fileKey });
    } catch (r2Error) {
        logger.warn('STORAGE', `R2 Upload failed for ${fileKey}`, { error: r2Error.message });

        try {
            ensureLocalDir();
            // Flatten the key path for local storage to avoid nested directory creation issues
            const safeLocalName = fileKey.replace(/\//g, '_');
            const localPath = path.join(UPLOADS_DIR, safeLocalName);
            await fs.promises.writeFile(localPath, buffer);
            logger.upload('File uploaded to local fallback storage', { localPath });
        } catch (localErr) {
            logger.error('STORAGE', 'CRITICAL: Both R2 and Local Fallback Failed', { fileKey, error: localErr.message });
            throw new Error('Both Cloud Storage and Local Fallback Failed');
        }
    }
};

/**
 * Retrieves a file stream. Checks R2 first.
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
        return {
            stream: r2Response.Body,
            contentLength: r2Response.ContentLength
        };
    } catch (r2Error) {
        logger.warn('STORAGE', `R2 Fetch Failed for ${fileKey}`, { error: r2Error.message });

        const safeLocalName = fileKey.replace(/\//g, '_');
        const localPath = path.join(UPLOADS_DIR, safeLocalName);

        try {
            await fs.promises.access(localPath, fs.constants.F_OK);
            const stat = await fs.promises.stat(localPath);
            const stream = fs.createReadStream(localPath);
            return { stream, contentLength: stat.size };
        } catch (localErr) {
            logger.error('STORAGE', 'File not found in any storage', { fileKey });
            throw new Error(`File not found: ${fileKey}`);
        }
    }
};

/**
 * Deletes a file from both R2 and local fallback.
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
        })).catch(err => {
            console.warn(`[StorageService] R2 Deletion Soft-Fail: ${err.message}`);
        })
    );

    // Queue Local Fallback deletion promise
    const safeLocalName = fileKey.replace(/\//g, '_');
    const localPath = path.join(UPLOADS_DIR, safeLocalName);

    promises.push(
        fs.promises.unlink(localPath).catch(() => { }) // Ignore if file doesn't exist locally
    );

    await Promise.allSettled(promises);
};

/**
 * Canonical entry-point for original resume uploads.
 */
export const uploadResume = async (userId, fileBuffer, mimetype, originalName) => {
    const extension = originalName?.includes('.') ? originalName.split('.').pop().toLowerCase() : 'pdf';
    const fileKey = generateFileKey(userId, 'original', { extension });

    await uploadFile(fileKey, fileBuffer, mimetype);
    return fileKey;
};

/**
 * Canonical entry-point for resume versions.
 */
export const uploadResumeVersion = async (userId, versionNumber, fileBuffer, suffix = 'rendered') => {
    const fileKey = generateFileKey(userId, 'version', { versionNumber, suffix });

    await uploadFile(fileKey, fileBuffer, 'application/pdf');
    return fileKey;
};
