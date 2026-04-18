import { analyzeResume } from '../server/src/controllers/analysis.controller.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '../server/.env' });

const mockReq = {
    user: { id: '65f1a2b3c4d5e6f7a8b9c0d1' }, // Mock user ID
    body: {
        jdText: 'Job Title: Software Engineer\nRole: Build great apps.',
        resumeId: '65f1a2b3c4d5e6f7a8b9c0d2' // Mock resume ID (requires DB entry)
    },
    files: {}
};

const mockRes = {
    status: (code) => ({
        json: (data) => {
            console.log(`Status ${code}:`, JSON.stringify(data, null, 2));
        }
    })
};

const mockNext = (err) => {
    console.error('Next called with error:', err);
};

async function test() {
    try {
        // We'd need a real DB connection and a real Resume ID to test fully.
        // But we can check for syntax/import errors just by running this.
        console.log('Testing analysis controller imports...');
        console.log('Success.');
    } catch (e) {
        console.error('Test failed:', e);
    }
}

test();
