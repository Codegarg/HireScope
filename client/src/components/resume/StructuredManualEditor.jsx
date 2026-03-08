import React, { useState, useEffect } from 'react';
import { Save, Plus, Trash2, User, Briefcase, GraduationCap, Code, Folder, FileText, ChevronRight, ChevronDown, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SectionHeader = ({ icon: Icon, title, isExpanded, onToggle }) => (
    <div
        onClick={onToggle}
        style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem', background: 'rgba(255,255,255,0.03)',
            borderRadius: '0.8rem', cursor: 'pointer', marginBottom: '0.5rem',
            border: '1px solid rgba(255,255,255,0.05)',
            userSelect: 'none'
        }}
    >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'rgba(124, 58, 237, 0.1)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', color: '#a78bfa'
            }}>
                <Icon size={18} />
            </div>
            <span style={{ fontWeight: '600', color: '#e2e8f0' }}>{title}</span>
        </div>
        {isExpanded ? <ChevronDown size={18} color="#94a3b8" /> : <ChevronRight size={18} color="#94a3b8" />}
    </div>
);

const InputField = ({ label, value, onChange, placeholder, type = 'text', multiline = false }) => (
    <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.4rem', fontWeight: '500' }}>{label}</label>
        {multiline ? (
            <textarea
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '0.75rem', borderRadius: '0.6rem',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', resize: 'vertical', minHeight: '80px'
                }}
            />
        ) : (
            <input
                type={type}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                style={{
                    width: '100%', padding: '0.75rem', borderRadius: '0.6rem',
                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none'
                }}
            />
        )}
    </div>
);

const StructuredManualEditor = ({ initialContent, initialTitle, onSave, onCancel, isSaving }) => {
    const [title, setTitle] = useState(initialTitle || 'My Resume');
    const [content, setContent] = useState(initialContent || {
        personalInfo: {},
        summary: '',
        experience: [],
        projects: [],
        skills: {},
        education: [],
        certifications: [],
        awards: [],
        spokenLanguages: []
    });

    const [expandedSections, setExpandedSections] = useState({
        title: true,
        personal: false,
        summary: false,
        experience: false,
        projects: false,
        skills: false,
        education: false,
        extras: false
    });

    const toggleSection = (section) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handlePersonalInfoChange = (field, value) => {
        setContent(prev => ({
            ...prev,
            personalInfo: { ...prev.personalInfo, [field]: value }
        }));
    };

    // Generic List Helpers
    const updateList = (field, value) => {
        setContent(prev => ({
            ...prev,
            [field]: value.split(',').map(s => s.trim()).filter(Boolean)
        }));
    };

    // Experience Helpers
    const addExperience = () => {
        setContent(prev => ({
            ...prev,
            experience: [...(prev.experience || []), { role: '', organization: '', startDate: '', endDate: '', points: [''] }]
        }));
    };

    const updateExperience = (index, field, value) => {
        const newExp = [...content.experience];
        newExp[index][field] = value;
        setContent(prev => ({ ...prev, experience: newExp }));
    };

    const removeExperience = (index) => {
        setContent(prev => ({
            ...prev,
            experience: prev.experience.filter((_, i) => i !== index)
        }));
    };

    // Skills Helpers
    const updateSkills = (category, value) => {
        // value is a comma-separated string
        setContent(prev => ({
            ...prev,
            skills: { ...prev.skills, [category]: value.split(',').map(s => s.trim()).filter(Boolean) }
        }));
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0f172a', borderRadius: '1.2rem', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)' }}>
                <div>
                    <h3 style={{ margin: 0, color: 'white', fontSize: '1.1rem', fontWeight: '700' }}>Manual Section Editor</h3>
                    <p style={{ margin: '0.2rem 0 0 0', color: '#94a3b8', fontSize: '0.75rem' }}>Precise control over every resume section</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: '0.6rem', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
                    <button
                        onClick={() => onSave(content, title)}
                        disabled={isSaving}
                        style={{
                            padding: '0.5rem 1.25rem', borderRadius: '0.6rem', border: 'none',
                            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white',
                            cursor: isSaving ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: isSaving ? 0.7 : 1
                        }}
                    >
                        {isSaving ? 'Saving...' : <><Save size={16} /> Save Changes</>}
                    </button>
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                {/* Resume Title */}
                <SectionHeader icon={FileText} title="Resume Title" isExpanded={expandedSections.title} onToggle={() => toggleSection('title')} />
                <AnimatePresence>
                    {expandedSections.title && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem' }}>
                                <InputField label="Filename / Title" value={title} onChange={setTitle} placeholder="Software Engineer Resume" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Personal Info */}
                <SectionHeader icon={User} title="Personal Details" isExpanded={expandedSections.personal} onToggle={() => toggleSection('personal')} />
                <AnimatePresence>
                    {expandedSections.personal && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: 'span 2' }}>
                                    <InputField label="Full Name" value={content.personalInfo?.fullName} onChange={(v) => handlePersonalInfoChange('fullName', v)} placeholder="John Doe" />
                                </div>
                                <InputField label="Email" value={content.personalInfo?.email} onChange={(v) => handlePersonalInfoChange('email', v)} placeholder="john@example.com" />
                                <InputField label="Phone" value={content.personalInfo?.phone} onChange={(v) => handlePersonalInfoChange('phone', v)} placeholder="+1 234 567 890" />
                                <InputField label="LinkedIn" value={content.personalInfo?.linkedin} onChange={(v) => handlePersonalInfoChange('linkedin', v)} placeholder="linkedin.com/in/johndoe" />
                                <InputField label="GitHub" value={content.personalInfo?.github} onChange={(v) => handlePersonalInfoChange('github', v)} placeholder="github.com/johndoe" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Summary */}
                <SectionHeader icon={FileText} title="Professional Summary" isExpanded={expandedSections.summary} onToggle={() => toggleSection('summary')} />
                <AnimatePresence>
                    {expandedSections.summary && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem' }}>
                                <InputField label="Summary" value={content.summary} onChange={(v) => setContent(prev => ({ ...prev, summary: v }))} multiline placeholder="A brief overview of your professional career..." />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Experience */}
                <SectionHeader icon={Briefcase} title="Work Experience" isExpanded={expandedSections.experience} onToggle={() => toggleSection('experience')} />
                <AnimatePresence>
                    {expandedSections.experience && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {(content.experience || []).map((exp, idx) => (
                                    <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                        <button onClick={() => removeExperience(idx)} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.4rem', borderRadius: '0.4rem', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <InputField label="Role" value={exp.role} onChange={(v) => updateExperience(idx, 'role', v)} placeholder="Software Engineer" />
                                            <InputField label="Organization" value={exp.organization} onChange={(v) => updateExperience(idx, 'organization', v)} placeholder="Google" />
                                            <InputField label="Start Date" value={exp.startDate} onChange={(v) => updateExperience(idx, 'startDate', v)} placeholder="Jan 2022" />
                                            <InputField label="End Date" value={exp.endDate} onChange={(v) => updateExperience(idx, 'endDate', v)} placeholder="Present" />
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <InputField label="Bullet Points (newline separated)" value={exp.points?.join('\n')} onChange={(v) => updateExperience(idx, 'points', v.split('\n'))} multiline placeholder="• Developed feature X\n• Optimized pipeline Y" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addExperience} style={{ padding: '1rem', borderRadius: '0.8rem', border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    <Plus size={16} /> Add Experience
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Skills */}
                <SectionHeader icon={Code} title="Technical Skills" isExpanded={expandedSections.skills} onToggle={() => toggleSection('skills')} />
                <AnimatePresence>
                    {expandedSections.skills && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <InputField label="Languages" value={content.skills?.languages?.join(', ')} onChange={(v) => updateSkills('languages', v)} placeholder="JavaScript, Python, C++" />
                                <InputField label="Frontend" value={content.skills?.frontend?.join(', ')} onChange={(v) => updateSkills('frontend', v)} placeholder="React, Vue, Tailwind" />
                                <InputField label="Backend" value={content.skills?.backend?.join(', ')} onChange={(v) => updateSkills('backend', v)} placeholder="Node.js, Django, Go" />
                                <InputField label="Databases" value={content.skills?.databases?.join(', ')} onChange={(v) => updateSkills('databases', v)} placeholder="MongoDB, PostgreSQL" />
                                <div style={{ gridColumn: 'span 2' }}>
                                    <InputField label="Cloud & Tools" value={content.skills?.cloud?.concat(content.skills?.tools || []).join(', ')} onChange={(v) => updateSkills('cloud', v)} placeholder="AWS, Docker, Git" />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Projects */}
                <SectionHeader icon={Folder} title="Projects" isExpanded={expandedSections.projects} onToggle={() => toggleSection('projects')} />
                <AnimatePresence>
                    {expandedSections.projects && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {(content.projects || []).map((proj, idx) => (
                                    <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                        <button onClick={() => {
                                            const newProj = content.projects.filter((_, i) => i !== idx);
                                            setContent(prev => ({ ...prev, projects: newProj }));
                                        }} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.4rem', borderRadius: '0.4rem', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <InputField label="Project Name" value={proj.name} onChange={(v) => {
                                                const newProj = [...content.projects];
                                                newProj[idx].name = v;
                                                setContent(prev => ({ ...prev, projects: newProj }));
                                            }} placeholder="Portfolio Website" />
                                            <InputField label="Link" value={proj.link} onChange={(v) => {
                                                const newProj = [...content.projects];
                                                newProj[idx].link = v;
                                                setContent(prev => ({ ...prev, projects: newProj }));
                                            }} placeholder="https://..." />
                                            <div style={{ gridColumn: 'span 2' }}>
                                                <InputField label="Bullet Points (newline separated)" value={proj.descriptionPoints?.join('\n')} onChange={(v) => {
                                                    const newProj = [...content.projects];
                                                    newProj[idx].descriptionPoints = v.split('\n');
                                                    setContent(prev => ({ ...prev, projects: newProj }));
                                                }} multiline placeholder="• Built using React\n• Deployed on Vercel" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => {
                                    setContent(prev => ({ ...prev, projects: [...(prev.projects || []), { name: '', link: '', descriptionPoints: [''] }] }));
                                }} style={{ padding: '1rem', borderRadius: '0.8rem', border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    <Plus size={16} /> Add Project
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Education */}
                <SectionHeader icon={GraduationCap} title="Education" isExpanded={expandedSections.education} onToggle={() => toggleSection('education')} />
                <AnimatePresence>
                    {expandedSections.education && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                {(content.education || []).map((edu, idx) => (
                                    <div key={idx} style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '0.8rem', border: '1px solid rgba(255,255,255,0.05)', position: 'relative' }}>
                                        <button onClick={() => {
                                            const newEdu = content.education.filter((_, i) => i !== idx);
                                            setContent(prev => ({ ...prev, education: newEdu }));
                                        }} style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', padding: '0.4rem', borderRadius: '0.4rem', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <InputField label="Degree" value={edu.degree} onChange={(v) => {
                                                const newEdu = [...content.education];
                                                newEdu[idx].degree = v;
                                                setContent(prev => ({ ...prev, education: newEdu }));
                                            }} placeholder="B.S. Computer Science" />
                                            <InputField label="Institution" value={edu.institution} onChange={(v) => {
                                                const newEdu = [...content.education];
                                                newEdu[idx].institution = v;
                                                setContent(prev => ({ ...prev, education: newEdu }));
                                            }} placeholder="MIT" />
                                            <InputField label="Start Year" value={edu.startYear} onChange={(v) => {
                                                const newEdu = [...content.education];
                                                newEdu[idx].startYear = v;
                                                setContent(prev => ({ ...prev, education: newEdu }));
                                            }} placeholder="2018" />
                                            <InputField label="End Year" value={edu.endYear} onChange={(v) => {
                                                const newEdu = [...content.education];
                                                newEdu[idx].endYear = v;
                                                setContent(prev => ({ ...prev, education: newEdu }));
                                            }} placeholder="2022" />
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => {
                                    setContent(prev => ({ ...prev, education: [...(prev.education || []), { degree: '', institution: '', startYear: '', endYear: '' }] }));
                                }} style={{ padding: '1rem', borderRadius: '0.8rem', border: '1px dashed rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                    <Plus size={16} /> Add Education
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Extra Sections (Certifications, Awards, Languages) */}
                <SectionHeader icon={Sparkles} title="Extra Sections" isExpanded={expandedSections.extras} onToggle={() => toggleSection('extras')} />
                <AnimatePresence>
                    {expandedSections.extras && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                            <div style={{ padding: '0 0.5rem 1rem 0.5rem' }}>
                                <InputField label="Certifications (comma separated)" value={content.certifications?.join(', ')} onChange={(v) => updateList('certifications', v)} placeholder="AWS Solutions Architect, PMP" />
                                <InputField label="Awards & Achievements (comma separated)" value={content.awards?.join(', ')} onChange={(v) => updateList('awards', v)} placeholder="Employee of the Month, Dean's List" />
                                <InputField label="Languages (comma separated)" value={content.spokenLanguages?.join(', ')} onChange={(v) => updateList('spokenLanguages', v)} placeholder="English (Native), Hindi, Spanish" />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

export default StructuredManualEditor;
