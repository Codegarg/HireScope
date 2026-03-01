/**
 * ResumeLayout.jsx
 *
 * Professional, ATS-friendly resume layout component.
 * Renders from a structured `resumeData` object — no raw text, no dangerouslySetInnerHTML.
 * All dates right-aligned via flexbox. All links clickable via <a> tags.
 */

import React from 'react';

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = {
    page: {
        fontFamily: "'Times New Roman', Georgia, serif",
        fontSize: '1em', // Base font size controlled by parent
        lineHeight: '1.45',
        color: '#000',
        padding: '2.5em 2.8em',
        width: '100%',
        height: '100%',
        background: '#fff',
        boxSizing: 'border-box',
    },
    name: {
        fontSize: '1.8em',
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: '0.04em',
        marginBottom: '0.15em',
    },
    title: {
        fontSize: '1em',
        textAlign: 'center',
        color: '#444',
        marginBottom: '0.3em',
    },
    contacts: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0.4em 1.2em',
        fontSize: '0.85em',
        color: '#222',
        marginBottom: '0.6em',
    },
    link: {
        color: '#1a56db',
        textDecoration: 'none',
    },
    divider: {
        borderTop: '1.5px solid #000',
        margin: '0.4em 0 0.5em',
    },
    sectionHeading: {
        fontWeight: '700',
        fontSize: '1em',
        textTransform: 'uppercase',
        letterSpacing: '0.07em',
        marginBottom: '0.25em',
        marginTop: '0',
    },
    section: {
        marginBottom: '0.75em',
    },
    flexRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '0.5em',
    },
    roleTitle: {
        fontWeight: '700',
        fontSize: '1em',
    },
    orgName: {
        fontStyle: 'italic',
        fontSize: '0.95em',
        marginTop: '0.04em',
        marginBottom: '0.08em',
    },
    dateRight: {
        fontSize: '0.9em',
        color: '#333',
        whiteSpace: 'nowrap',
        marginLeft: 'auto',
    },
    bullet: {
        display: 'flex',
        gap: '0.4em',
        marginBottom: '0.1em',
        fontSize: '0.95em',
    },
    bulletDot: {
        flexShrink: 0,
        marginTop: '0.05em',
    },
    skillRow: {
        display: 'flex',
        gap: '0.5em',
        flexWrap: 'wrap',
        marginBottom: '0.15em',
        fontSize: '0.95em',
    },
    skillCategory: {
        fontWeight: '700',
        minWidth: '80px',
    },
    eduRow: {
        marginBottom: '0.35em',
    },
};

// ── Sub-components ────────────────────────────────────────────────────────────

const SectionDivider = ({ title }) => (
    <div style={s.section}>
        <div style={s.divider} />
        <div style={s.sectionHeading}>{title}</div>
    </div>
);

const BulletList = ({ points = [] }) => (
    <>
        {points.filter(p => p?.trim()).map((p, i) => (
            <div key={i} style={s.bullet}>
                <span style={s.bulletDot}>•</span>
                <span>{p.trim()}</span>
            </div>
        ))}
    </>
);

const DateRange = ({ start, end }) => {
    if (!start && !end) return null;
    const label = [start, end].filter(Boolean).join(' – ');
    return <span style={s.dateRight}>{label}</span>;
};

const LinkTag = ({ href, children }) => {
    if (!href) return <span>{children}</span>;
    const fullHref = href.startsWith('http') ? href : `https://${href}`;
    return <a href={fullHref} target="_blank" rel="noopener noreferrer" style={s.link}>{children || href}</a>;
};

// ── Main Component ────────────────────────────────────────────────────────────

const ResumeLayout = ({ resumeData }) => {
    if (!resumeData) {
        return (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '4rem 2rem' }}>
                <p>No structured resume data available.</p>
            </div>
        );
    }

    const { personalInfo = {}, summary, skills = {}, projects = [], experience = [], education = [] } = resumeData;

    const skillBuckets = [
        { label: 'Languages', items: skills.languages },
        { label: 'Frontend', items: skills.frontend },
        { label: 'Backend', items: skills.backend },
        { label: 'Databases', items: skills.databases },
        { label: 'Cloud', items: skills.cloud },
        { label: 'Tools', items: skills.tools },
        { label: 'Core', items: skills.core },
    ].filter(b => b.items?.length);

    const hasSkills = skillBuckets.length > 0;
    const hasSummary = summary && summary.trim();
    const hasExperience = experience.length > 0;
    const hasProjects = projects.length > 0;
    const hasEducation = education.length > 0;

    return (
        <div style={s.page}>
            {/* ── Header ──────────────────────────────────────────────── */}
            {personalInfo.fullName && <div style={s.name}>{personalInfo.fullName}</div>}
            {personalInfo.title && <div style={s.title}>{personalInfo.title}</div>}

            <div style={s.contacts}>
                {personalInfo.email && <span>{personalInfo.email}</span>}
                {personalInfo.phone && <span>{personalInfo.phone}</span>}
                {personalInfo.linkedin && <LinkTag href={personalInfo.linkedin}>LinkedIn</LinkTag>}
                {personalInfo.github && <LinkTag href={personalInfo.github}>GitHub</LinkTag>}
            </div>

            {/* ── Summary ─────────────────────────────────────────────── */}
            {hasSummary && (
                <>
                    <SectionDivider title="Summary" />
                    <p style={{ marginTop: 0, marginBottom: '0.45em', fontSize: '0.95em' }}>{summary}</p>
                </>
            )}

            {/* ── Skills ──────────────────────────────────────────────── */}
            {hasSkills && (
                <>
                    <SectionDivider title="Skills" />
                    <div style={{ marginBottom: '0.5rem' }}>
                        {skillBuckets.map(({ label, items }) => (
                            <div key={label} style={s.skillRow}>
                                <span style={s.skillCategory}>{label}:</span>
                                <span>{items.join(', ')}</span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* ── Experience ──────────────────────────────────────────── */}
            {hasExperience && (
                <>
                    <SectionDivider title="Experience" />
                    {experience.map((exp, i) => (
                        <div key={i} style={{ marginBottom: '0.65rem' }}>
                            <div style={s.flexRow}>
                                <span style={s.roleTitle}>{exp.role}</span>
                                <DateRange start={exp.startDate} end={exp.endDate} />
                            </div>
                            {exp.organization && (
                                <div style={s.orgName}>{exp.organization}</div>
                            )}
                            <BulletList points={exp.points} />
                        </div>
                    ))}
                </>
            )}

            {/* ── Projects ────────────────────────────────────────────── */}
            {hasProjects && (
                <>
                    <SectionDivider title="Projects" />
                    {projects.map((proj, i) => (
                        <div key={i} style={{ marginBottom: '0.6rem' }}>
                            <div style={s.flexRow}>
                                <span style={s.roleTitle}>{proj.name}</span>
                                {proj.link && (
                                    <LinkTag href={proj.link}>GitHub</LinkTag>
                                )}
                            </div>
                            <BulletList points={proj.descriptionPoints} />
                        </div>
                    ))}
                </>
            )}

            {/* ── Education ───────────────────────────────────────────── */}
            {hasEducation && (
                <>
                    <SectionDivider title="Education" />
                    {education.map((edu, i) => (
                        <div key={i} style={s.eduRow}>
                            <div style={s.flexRow}>
                                <span style={s.roleTitle}>{edu.degree}</span>
                                <DateRange start={edu.startYear} end={edu.endYear} />
                            </div>
                            {edu.institution && <div style={s.orgName}>{edu.institution}</div>}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default ResumeLayout;
