import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ArrowLeft, ArrowRight, Save, Download } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';

// Placeholder imports for step components that we will extract/adapt
import Step1Upload from './wizard/Step1Upload';
import Step2JD from './wizard/Step2JD';
import Step3Analysis from './wizard/Step3Analysis';
import Step4Optimize from './wizard/Step4Optimize';
import ResumeEditor from './ResumeEditor';

const STEPS = [
    { id: 1, title: 'Upload Resume', icon: '📄' },
    { id: 2, title: 'Job Description', icon: '🎯' },
    { id: 3, title: 'ATS Scan', icon: '🔍' },
    { id: 4, title: 'AI Optimize', icon: '✨' },
    { id: 5, title: 'Final Review', icon: '✍️' }
];

const ResumeWizard = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useContext(AuthContext);

    // Wizard state
    const [currentStep, setCurrentStep] = useState(1);
    const [isNextDisabled, setIsNextDisabled] = useState(true);

    // Resume state passed between steps
    const [resumeData, setResumeData] = useState({
        _id: id !== 'new' ? id : null,
        file: null,
        fileName: '',
        content: '',
        jdText: '',
        jdFile: null,
        atsResult: null,
        optimizedContent: '',
    });

    // Handle initialization (if coming from existing resume)
    useEffect(() => {
        if (id && id !== 'new') {
            // In a real flow, fetch the resume here or rely on the inner components
            // For now, if we have an ID, we might skip to step 5 (editor) or step 2 (JD)
            // Let's default to step 2 so they can enter a new JD, unless we already passed analysis
            if (location.state?.analysisResults) {
                setResumeData(prev => ({ ...prev, atsResult: location.state.analysisResults }));
                setCurrentStep(3);
            } else {
                setCurrentStep(2); // Jump to JD
            }
        }
    }, [id, location]);

    const updateData = (updates) => {
        setResumeData(prev => ({ ...prev, ...updates }));
    };

    const handleNext = () => {
        if (currentStep < STEPS.length) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
        else navigate('/dashboard');
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Upload data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onNext={handleNext} onBack={handleBack} />;
            case 2:
                // Pass a special flag to Step 2 so we know when to auto-advance
                return <Step2JD data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onAnalyze={handleNext} onNext={handleNext} onBack={handleBack} />;
            case 3:
                return <Step3Analysis data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onNext={handleNext} onBack={handleBack} />;
            case 4:
                return <Step4Optimize data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onNext={handleNext} onBack={handleBack} />;
            case 5:
                return <div style={{ height: '80vh', overflow: 'hidden' }}>
                    <ResumeEditor wizardMode={true} passedId={resumeData?._id || id} initialContent={resumeData?.optimizedContent || resumeData?.content} setNextDisabled={setIsNextDisabled} />
                </div>;
            default:
                return null;
        }
    };

    return (
        <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="ambient-bg" />
            <Navbar />

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '5rem' }}>
                {/* Top Progress Bar */}
                <div style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', padding: '1rem 0' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 1.5rem' }}>

                        {STEPS.map((step, idx) => (
                            <React.Fragment key={step.id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: currentStep >= step.id ? 1 : 0.4 }}>
                                    <div style={{
                                        width: '32px', height: '32px', borderRadius: '50%',
                                        background: currentStep > step.id ? 'var(--success)' : currentStep === step.id ? 'var(--primary)' : 'var(--bg-elevated)',
                                        color: currentStep >= step.id ? '#fff' : 'var(--text-muted)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.9rem', fontWeight: 'bold'
                                    }}>
                                        {currentStep > step.id ? <Check size={16} /> : step.id}
                                    </div>
                                    <span style={{ fontWeight: currentStep === step.id ? '700' : '500', color: currentStep >= step.id ? 'var(--text-main)' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {step.title}
                                    </span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div style={{ flex: 1, height: '2px', background: currentStep > step.id ? 'var(--success)' : 'var(--border)', margin: '0 1rem' }} />
                                )}
                            </React.Fragment>
                        ))}

                    </div>
                </div>

                {/* Step Content Area */}
                <div style={{ flex: 1, padding: '2rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                        >
                            {renderStep()}
                        </motion.div>
                    </AnimatePresence>
                </div>

            </main>
        </div>
    );
};

export default ResumeWizard;
