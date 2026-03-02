import React, { useMemo } from 'react';

export const RESUME_THEMES = {
    modern: {
        fontFamily: "'Inter', sans-serif",
        headingColor: '#1e293b',
        textColor: '#334155',
        primaryColor: '#3b82f6', // blue accent
        fontSize: '0.9rem',
        lineHeight: '1.5',
        sectionSpacing: '1.2rem',
    },
    classic: {
        fontFamily: "'Times New Roman', Times, serif",
        headingColor: '#000000',
        textColor: '#000000',
        primaryColor: '#000000',
        accentColor: '#0000EE', // traditional blue for links
        fontSize: '11pt',
        lineHeight: '1.3',
        sectionSpacing: '0.8rem',
    },
    minimalist: {
        fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
        headingColor: '#0f172a',
        textColor: '#475569',
        primaryColor: '#64748b',
        fontSize: '0.85rem',
        lineHeight: '1.6',
        sectionSpacing: '1.5rem',
    }
};

const LinkTag = ({ href, children, activeTheme }) => {
    if (!href) return <span>{children}</span>;
    const fullHref = href.startsWith('http') ? href : `https://${href}`;
    const color = activeTheme?.accentColor || activeTheme?.primaryColor || 'inherit';
    return <a href={fullHref} target="_blank" rel="noopener noreferrer" style={{ color, textDecoration: 'none' }}>{children || href}</a>;
};

const linkifyText = (text, activeTheme) => {
    const parts = text.split(/(https?:\/\/[^\s)\]>,"']+|(?:linkedin|github)\.com\/[^\s)\]>,"']+)/i);
    if (parts.length <= 1) return text;

    return parts.map((part, pi) => {
        if (!part) return null;
        if (/^https?:\/\/.+$|^(?:linkedin|github)\.com\/.+$/i.test(part)) {
            return <LinkTag key={pi} href={part} activeTheme={activeTheme}>{part}</LinkTag>;
        }
        return part;
    });
};

const renderText = (text, activeTheme) => {
    if (!text) return null;
    return text.split('\n').map((line, i) => (
        <React.Fragment key={i}>
            {linkifyText(line, activeTheme)}
            {i < text.split('\n').length - 1 && <br />}
        </React.Fragment>
    ));
};

const parseHeaderBlock = (content, activeTheme) => {
    const lines = content.split('\n').filter(l => l.trim() !== '');
    if (lines.length === 0) return null;

    const name = lines[0];
    const details = lines.slice(1);

    return (
        <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
            <h1 style={{
                fontSize: '1.8em',
                fontWeight: 'normal',
                textTransform: 'uppercase',
                margin: '0 0 0.3rem 0',
                color: activeTheme.headingColor,
                letterSpacing: '0.03em'
            }}>
                {name}
            </h1>
            {details.map((line, i) => (
                <div key={i} style={{
                    fontSize: '0.95em',
                    color: activeTheme.textColor,
                    marginBottom: '0.15rem'
                }}>
                    {renderText(line, activeTheme)}
                </div>
            ))}
        </div>
    );
};

const parseContentBlock = (content, activeTheme) => {
    const lines = content.split('\n').filter(l => l.trim() !== '');

    // Simple paragraph (summary or arbitrary short text)
    if (lines.length === 1 && !lines[0].trim().startsWith('-') && !lines[0].trim().startsWith('•')) {
        return <p style={{ margin: '0 0 0.5rem 0' }}>{renderText(lines[0], activeTheme)}</p>;
    }

    return lines.map((line, index) => {
        // Match standard right-aligned items like Dates
        // Example: "Software Engineer, Google | Jan 2020 - Present"
        const separatorIdx = line.lastIndexOf('|');
        let potentialDate = null;
        let mainText = line;

        if (separatorIdx !== -1) {
            const rightSide = line.slice(separatorIdx + 1).trim();
            if (rightSide.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{4}/i)) {
                potentialDate = rightSide;
                mainText = line.slice(0, separatorIdx).trim();
            }
        } else {
            // Backup check with copious whitespace
            const parts = line.split(/\s{3,}/);
            if (parts.length > 1) {
                const rightSide = parts[parts.length - 1];
                if (rightSide.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{4}/i)) {
                    potentialDate = rightSide;
                    mainText = parts.slice(0, -1).join(' ').trim();
                }
            }

            // Rescue smudged dates from raw PDF extraction (e.g., "MemberSep 2024 - Present")
            if (!potentialDate) {
                const smudgeMatch = line.match(/([a-z])((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}.*)/);
                if (smudgeMatch) {
                    mainText = line.substring(0, smudgeMatch.index + 1).trim();
                    potentialDate = smudgeMatch[2].trim();
                }
            }

            // Rescue smudged GitHub/LinkedIn links (e.g., "PlatformGitHub")
            if (!potentialDate) {
                const linkSmudge = line.match(/([a-z])(GitHub|LinkedIn|https?:\/\/[^\s]+)$/i);
                if (linkSmudge && !line.includes(' ')) {
                    // Only if it's not a single isolated word
                } else if (linkSmudge) {
                    mainText = line.substring(0, linkSmudge.index + 1).trim();
                    potentialDate = linkSmudge[2].trim();
                }
            }
        }

        // Detect if line is likely an Organization + Role Header
        const isHeaderLike = !line.trim().startsWith('-') && !line.trim().startsWith('•') && (potentialDate || line.length < 100);

        if (isHeaderLike && potentialDate) {
            return (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontWeight: 'bold', minHeight: '1.2em' }}>
                    <span>{renderText(mainText, activeTheme)}</span>
                    <span style={{ fontSize: '0.9em', color: activeTheme.primaryColor, whiteSpace: 'nowrap' }}>{potentialDate}</span>
                </div>
            );
        } else if (isHeaderLike) {
            return (
                <div key={index} style={{ fontWeight: 'bold' }}>
                    {renderText(mainText, activeTheme)}
                </div>
            );
        }

        // Bullet points
        if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
            return (
                <div key={index} style={{ display: 'flex', paddingLeft: '1rem', alignItems: 'flex-start', margin: '0' }}>
                    <span style={{ marginRight: '0.5rem' }}>•</span>
                    <span style={{ flex: 1 }}>{renderText(line.replace(/^[-•]\s*/, ''), activeTheme)}</span>
                </div>
            );
        }

        // Fallback for everything else
        return <div key={index} style={{ margin: '0' }}>{renderText(line, activeTheme)}</div>;
    });
};

const ResumeLayout = ({ text, theme = 'modern' }) => {
    const activeTheme = RESUME_THEMES[theme] || RESUME_THEMES.modern;

    // A lightweight parser identical to the one in ResumeEditor but standalone
    const sections = useMemo(() => {
        if (!text) return [];
        const lines = text.replace(/\r\n/g, '\n').split('\n');
        const parsed = [];
        let currentSection = { title: '', body: '' };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const isAllcapsWithShortLength = line === line.toUpperCase() && line.trim().length > 0 && line.trim().length <= 30 && !line.includes('|');

            if (isAllcapsWithShortLength && !line.trim().startsWith('-')) {
                if (currentSection.title || currentSection.body) {
                    parsed.push({ ...currentSection });
                }
                currentSection = { title: line.trim(), body: '' };
            } else {
                currentSection.body += line + '\n';
            }
        }
        if (currentSection.title || currentSection.body.trim()) {
            parsed.push(currentSection);
        }
        return parsed;
    }, [text]);

    if (!text) {
        return (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 2rem' }}>
                <p>No resume content yet.</p>
                <p style={{ fontSize: '0.82rem' }}>Upload a resume or use Magic Improve to generate content.</p>
            </div>
        );
    }

    return (
        <div
            className="resume-a4-container"
            style={{
                width: '100%',
                margin: '0',
                padding: '2rem 2.8rem', // Tighter margins to fit denser content
                background: 'white',
                boxSizing: 'border-box',
                fontFamily: activeTheme.fontFamily,
                fontSize: activeTheme.fontSize,
                lineHeight: activeTheme.lineHeight,
                color: activeTheme.textColor,
                textAlign: 'left'
            }}
        >
            {sections?.map((section, idx) => {
                const isUnnamedFirstSection = !section.title && idx === 0;

                return (
                    <div key={idx} style={{ marginBottom: activeTheme.sectionSpacing }}>
                        {section.title && (
                            <h2 style={{
                                fontSize: '1.2em',
                                fontWeight: 'bold',
                                color: activeTheme.primaryColor,
                                textTransform: 'uppercase',
                                borderBottom: `1px solid ${activeTheme.primaryColor}`,
                                paddingBottom: '0.15rem',
                                marginBottom: '0.35rem',
                                marginTop: '0'
                            }}>
                                {section.title}
                            </h2>
                        )}
                        <div style={{ fontSize: activeTheme.fontSize, color: activeTheme.textColor, lineHeight: activeTheme.lineHeight }}>
                            {isUnnamedFirstSection
                                ? parseHeaderBlock(section.body, activeTheme)
                                : parseContentBlock(section.body, activeTheme)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default ResumeLayout;
