/**
 * PDFPreview.jsx
 * Renders the original uploaded PDF from the secure R2 streaming endpoint.
 * Falls back to a text preview if no file key is available.
 *
 * Uses react-pdf for page-accurate rendering.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker (bundler-compatible CDN version)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFPreview = ({ resumeId, fallbackText, templateConfig }) => {
    const [numPages, setNumPages] = useState(null);
    const [pdfError, setPdfError] = useState(false);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const pdfUrl = resumeId
        ? `${apiBase}/resumes/${resumeId}/file`
        : null;

    // Memoize the file object — react-pdf does a reference comparison on <Document file={}>.
    // Without this, a new object is created every parent render and the PDF reloads each time.
    const fileObject = useMemo(
        () => pdfUrl ? { url: pdfUrl, httpHeaders: { Authorization: `Bearer ${token}` } } : null,
        [pdfUrl, token]
    );

    const onDocumentLoadSuccess = useCallback(({ numPages }) => {
        setNumPages(numPages);
        setLoading(false);
        setPdfError(false);
    }, []);

    const onDocumentLoadError = useCallback((err) => {
        console.error('[PDFPreview] Load error:', err);
        setPdfError(true);
        setLoading(false);
    }, []);

    // No resume ID or no file stored
    if (!fileObject || pdfError) {
        return null; // Let ResumeEditor fallback to ResumeLayout if no PDF
    }

    return (
        <div style={{ width: '100%' }}>
            <Document
                file={fileObject}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading=""
            >
                {Array.from({ length: numPages || 0 }, (_, i) => (
                    <Page
                        key={`page_${i + 1}`}
                        pageNumber={i + 1}
                        width={680}
                        renderAnnotationLayer
                        renderTextLayer
                        style={{ marginBottom: i < numPages - 1 ? '1rem' : 0 }}
                    />
                ))}
            </Document>
        </div>
    );
};

// Prevent re-renders when parent state changes (e.g. showImproveMenu, improveMode)
// — none of those affect the PDF source or fallback text.
export default React.memo(PDFPreview);
