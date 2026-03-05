import 'dotenv/config';
import mongoose from 'mongoose';
import Resume from './src/models/resume.model.js';
import { generateResumePDF } from './src/services/pdfGenerator.service.js';
import { r2, R2_BUCKET } from './src/utils/r2Client.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

async function test() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const resume = await Resume.findOne();
        if (!resume) {
            console.log("No resume found to test with");
            process.exit(0);
        }

        console.log("Testing PDF generation for:", resume.title);
        const pdfBuffer = await generateResumePDF(resume);
        console.log("PDF generated, size:", pdfBuffer.length);

        if (pdfBuffer.length > 0) {
            const testKey = `test-diag-${Date.now()}.pdf`;
            await r2.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: testKey,
                Body: pdfBuffer,
                ContentType: "application/pdf"
            }));
            console.log("Test upload successful:", testKey);
        }

        process.exit(0);
    } catch (err) {
        console.error("Diagnostic failed:", err);
        process.exit(1);
    }
}

test();
