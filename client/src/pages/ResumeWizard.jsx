import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, ArrowRight, Save, Download } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import axios from 'axios';

// ── Shared Wizard Components (Formerly in GlobalNav) ─────────────────────────
const NavigationDock = ({
    onBack,
    onPrimary,
    primaryLabel = "Next",
    primaryIcon: PrimaryIcon = ArrowRight,
    isPrimaryDisabled = false,
    showBack = true
}) => {
    return (
        <motion.div
            initial={{ y: 100, x: '-50%', opacity: 0 }}
            animate={{ y: 0, x: '-50%', opacity: 1 }}
            style={{
                position: 'fixed',
                bottom: '2rem',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(20px)',
                padding: '0.75rem 1rem',
                borderRadius: '2rem',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                minWidth: '300px',
                justifyContent: 'space-between'
            }}
        >
            {showBack ? (
                <motion.button
                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.05)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onBack}
                    className="ghost-btn"
                    style={{
                        borderRadius: '1.5rem',
                        padding: '0.6rem 1.25rem',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '0.85rem'
                    }}
                >
                    <ArrowLeft size={16} /> Back
                </motion.button>
            ) : <div />}

            <motion.button
                whileHover={isPrimaryDisabled ? {} : { scale: 1.02, boxShadow: '0 0 20px var(--primary-glow)' }}
                whileTap={isPrimaryDisabled ? {} : { scale: 0.98 }}
                onClick={onPrimary}
                disabled={isPrimaryDisabled}
                className="glow-btn"
                style={{
                    borderRadius: '1.5rem',
                    padding: '0.6rem 1.5rem',
                    fontSize: '0.85rem',
                    opacity: isPrimaryDisabled ? 0.5 : 1
                }}
            >
                {primaryLabel} <PrimaryIcon size={16} />
            </motion.button>
        </motion.div>
    );
};

const GlowingProgressBar = ({ progress }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            height: '2px',
            background: 'rgba(255,255,255,0.05)',
            zIndex: 9999
        }}>
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                style={{
                    height: '100%',
                    background: 'var(--accent-glow)',
                    boxShadow: '0 0 10px #22C08E, 0 0 20px #2E9BD6'
                }}
            />
        </div>
    );
};

// Placeholder imports for step components that we will extract/adapt
import Step1Upload from './wizard/Step1Upload';
import Step2JD from './wizard/Step2JD';
import Step3Analysis from './wizard/Step3Analysis';
import ResumeEditor from './ResumeEditor';

const STEPS = [
    { id: 1, title: 'Upload Resume', icon: '📄' },
    { id: 2, title: 'Job Description', icon: '🎯' },
    { id: 3, title: 'ATS Scan', icon: '🔍' },
    { id: 4, title: 'Final Review', icon: '✍️' }
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

    const [triggerAction, setTriggerAction] = useState(0);

    const handleNext = () => {
        // Step-specific primary actions
        if (currentStep === 2) {
            // Trigger analysis in Step 2
            setTriggerAction(prev => prev + 1);
            return;
        }

        if (currentStep < STEPS.length) setCurrentStep(c => c + 1);
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(c => c - 1);
        else navigate('/dashboard');
    };

    const renderStep = () => {
        switch (currentStep) {
            case 1:
                return <Step1Upload data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onNext={handleNext} />;
            case 2:
                return <Step2JD data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onAnalyze={() => setCurrentStep(3)} triggerAction={triggerAction} />;
            case 3:
                return <Step3Analysis data={resumeData} updateData={updateData} setNextDisabled={setIsNextDisabled} onNext={handleNext} />;
            case 4:
                return <div style={{ height: '80vh', overflow: 'hidden' }}>
                    <ResumeEditor wizardMode={true} passedId={resumeData?._id || id} initialContent={resumeData?.content} setNextDisabled={setIsNextDisabled} />
                </div>;
            default:
                return null;
        }
    };
    const getStepLabels = () => {
        switch (currentStep) {
            case 1: return { primary: "Next Step", showBack: false };
            case 2: return { primary: resumeData.atsResult ? "Next Step" : "Analyze Match", showBack: true };
            case 3: return { primary: "Final Review", showBack: true };
            case 4: return { primary: "Finish & Save", showBack: true };
            default: return { primary: "Next", showBack: true };
        }
    };

    const labels = getStepLabels();

    return (
        <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div className="ambient-bg" />
            <Navbar />

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', marginTop: '5rem' }}>
                {/* Glowing Top Progress Bar */}
                <GlowingProgressBar progress={(currentStep / STEPS.length) * 100} />

                {/* Step Content Area */}
                <div style={{ flex: 1, padding: '2rem 1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', maxWidth: '1200px', margin: '0 auto', width: '100%', paddingBottom: '8rem' }}>
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

                {/* Navigation Dock */}
                <NavigationDock
                    onBack={handleBack}
                    onPrimary={handleNext}
                    isPrimaryDisabled={isNextDisabled}
                    primaryLabel={labels.primary}
                    showBack={labels.showBack}
                />

            </main>
        </div>
    );
};

export default ResumeWizard;
