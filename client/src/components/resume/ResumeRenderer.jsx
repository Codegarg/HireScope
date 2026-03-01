/**
 * ResumeRenderer.jsx
 *
 * Pure layout-preservation mode.
 * Renders the resume exactly as received — zero text modification.
 * Only enhancement: detected URLs become clickable <a> tags.
 */

import React from 'react';

// ─── Safe Linkify ─────────────────────────────────────────────────────────────
// Uses text.split() on a capturing-group regex so the matched URL is kept in
// the parts array. Only the exact URL substring is wrapped — surrounding
// spaces and characters are never touched.

const URL_SPLIT = /(https?:\/\/[^\s)\]>,"']+|(?:linkedin|github)\.com\/[^\s)\]>,"']+)/i;
const IS_URL = /^https?:\/\/.+$|^(?:linkedin|github)\.com\/.+$/i;

const linkifyLine = (line, lineIdx) => {
    const parts = line.split(URL_SPLIT);
    if (parts.length <= 1) return line; // no URL — return string as-is

    return parts.map((part, pi) => {
        if (!part) return null;
        if (IS_URL.test(part)) {
            const href = part.startsWith('http') ? part : `https://${part}`;
            return (
                <a
                    key={`${lineIdx}-${pi}`}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'inherit', textDecoration: 'underline' }}
                >
                    {part}
                </a>
            );
        }
        return part;
    });
};

// ─── Renderer ─────────────────────────────────────────────────────────────────

const ResumeRenderer = ({ text, templateConfig }) => {
    if (!text) {
        return (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 2rem' }}>
                <p>No resume content yet.</p>
                <p style={{ fontSize: '0.82rem' }}>Upload a resume or use Magic Improve to generate content.</p>
            </div>
        );
    }

    // Split on \n only — \r\n converted to \n for consistency, nothing else changed
    const lines = text.replace(/\r\n/g, '\n').split('\n');

    return (
        <pre
            style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                width: '100%',
                display: 'block',
                fontFamily: templateConfig?.fontFamily || "'Times New Roman', Georgia, serif",
                fontSize: templateConfig?.fontSize || '0.88rem',
                lineHeight: templateConfig?.lineSpacing || '1.55',
                color: '#000',
                margin: 0,
                padding: 0,
                background: 'transparent',
                border: 'none',
                outline: 'none',
            }}
        >
            {lines.map((line, i) => (
                <React.Fragment key={i}>
                    {linkifyLine(line, i)}
                    {i < lines.length - 1 && '\n'}
                </React.Fragment>
            ))}
        </pre>
    );
};

export default ResumeRenderer;
