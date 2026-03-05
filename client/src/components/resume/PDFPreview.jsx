/**
 * PDFPreview.jsx
 * Renders the original uploaded PDF from the secure R2 streaming endpoint.
 * Falls back to a text preview if no file key is available.
 *
 * Uses react-pdf for page-accurate rendering.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { AlertCircle } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker (bundler-compatible CDN version)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PDFPreview = ({ resumeId, fallbackText, templateConfig, versionNumber }) => {
    const [numPages, setNumPages] = useState(null);
    const [pdfError, setPdfError] = useState(false);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem('token');
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    let pdfUrl = null;
    if (resumeId) {
        if (versionNumber) {
            pdfUrl = `${apiBase}/resumes/${resumeId}/version/${versionNumber}/view`;
        } else {
            pdfUrl = `${apiBase}/resumes/${resumeId}/file`;
        }
    }

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
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                height: '100%', minHeight: '600px', width: '100%', background: '#fafafa',
                color: '#64748b', textAlign: 'center', padding: '2rem'
            }}>
                <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '1rem', color: '#94a3b8' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#334155', fontSize: '1.2rem' }}>PDF Not Available</h3>
                <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '300px' }}>
                    The original uploaded PDF file could not be found or loaded.
                    However, your resume features and ATS score are still intact.
                </p>
            </div>
        );
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
