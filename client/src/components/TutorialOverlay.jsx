import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Info, Sparkles } from 'lucide-react';

const TutorialStepData = {
    'OPEN_INVENTORY': {
        title: 'Welcome to Eternal Idle!',
        text: 'Let\'s start by checking your items. Open your inventory.',
        targetId: 'tab-inventory',
        position: 'bottom'
    },
    'SELECT_CHEST': {
        title: 'A Gift for You',
        text: 'You received a Noob Chest! Click on it to see its contents.',
        targetId: 'item-NOOB_CHEST',
        position: 'top'
    },
    'OPEN_CHEST': {
        title: 'Open the Chest',
        text: 'Click on the "Open Chest" button to receive your rewards!',
        targetId: 'open-chest-button',
        position: 'top'
    },
    'CLAIM_LOOT': {
        title: 'Claim Your Rewards',
        text: 'Click on the Claim button to add these items to your inventory.',
        targetId: 'loot-claim-button',
        position: 'very-top'
    },
    'OPEN_PROFILE': {
        title: 'Equip Your Gear',
        text: 'Go to your Profile to equip your new weapon!',
        targetId: 'tab-profile',
        position: 'bottom'
    },
    'EQUIP_WEAPON': {
        title: 'Gear Up',
        text: 'Click on the weapon slot to select and equip your new weapon!',
        targetId: 'slot-mainHand',
        position: 'bottom'
    },
    'SELECT_WEAPON': {
        title: 'Choose Your Class',
        text: 'The weapon you select defines your playstyle! A Sword makes you a Warrior, a Bow a Hunter, and a Staff a Mage.',
        targetClass: 'tutorial-equip-item',
        position: 'cover-best'
    },
    'EQUIP_FOOD': {
        title: 'Don\'t Starve',
        text: 'Equip some food to sustain yourself during combat.',
        targetId: 'slot-food',
        position: 'bottom'
    },
    'SELECT_FOOD': {
        title: 'Select Food',
        text: 'Click on the EQUIP button to add food to your active slot.',
        targetClass: 'tutorial-equip-item',
        position: 'cover-best'
    },
    'MERGE_RUNES_1': {
        title: 'Skills & Forging',
        text: 'You found some Rune Shards! Open the Skills tab to find the Rune Forge.',
        targetId: 'tab-skills',
        position: 'bottom'
    },
    'OPEN_RUNE_FORGE': {
        title: 'Rune Forge',
        text: 'Click on the Rune Forge tile to start creating your first power-up!',
        targetId: 'skill-RUNE_FORGE',
        position: 'top'
    },
    'CREATE_RUNE': {
        title: 'Forging Power',
        text: 'Select your shards and click Forge to create a Rune!',
        targetId: 'tutorial-rune-merge-button',
        position: 'top'
    },
    'FORGE_SELECT_MAX': {
        title: 'Maximum Power',
        text: 'Click MAX to use all available shards for your Rune.',
        targetId: 'tutorial-forge-max',
        position: 'very-top'
    },
    'FORGE_SELECT_GATHERING': {
        title: 'Choose a Path',
        text: 'Select Gathering to create a Rune that boosts your gathering skills.',
        targetId: 'tutorial-forge-gathering',
        position: 'very-top'
    },
    'FORGE_CONFIRM': {
        title: 'Forge It!',
        text: 'Click Confirm to forge your very first Rune!',
        targetId: 'tutorial-forge-confirm',
        position: 'very-top'
    },
    'CLAIM_FORGE_RESULTS': {
        title: 'Gained Power',
        text: 'Click AWESOME! to see your newly created Runes.',
        targetId: 'tutorial-forge-results-awesome',
        position: 'very-top'
    },
    'OPEN_RUNE_TAB': {
        title: 'Your Collection',
        text: 'Open the Runes tab to see all your collected Runes.',
        targetId: 'tutorial-rune-tab',
        position: 'middle'
    },
    'SELECT_MERGE_RUNE': {
        title: 'Evolution Ready',
        text: 'Runes with 2 or more copies can be merged. Select one of these runes!',
        targetClass: 'tutorial-merge-candidate',
        position: 'top'
    },
    'CONFIRM_MERGE_SELECTION': {
        title: 'Prepare Evolution',
        text: 'Click Use in Merge to prepare this rune for evolution.',
        targetId: 'tutorial-rune-use-merge',
        position: 'top'
    },
    'FINAL_MERGE_CLICK': {
        title: 'Commit Evolution',
        text: 'Click the Merge button to combine your runes into a more powerful one!',
        targetId: 'tutorial-rune-merge-button',
        position: 'top'
    },
    'VIEW_MERGE_RESULTS': {
        title: 'Evolved!',
        text: 'Click on your newly evolved Rune to see its upgraded power!',
        targetId: 'tutorial-merge-result-item',
        position: 'top'
    },
    'CLOSE_FINAL_MODAL': {
        title: 'Power Evolved',
        text: 'You have successfully evolved your Rune! Click AWESOME! to continue.',
        targetId: 'tutorial-forge-results-awesome',
        position: 'top'
    },
    'MERGE_RUNES_2': {
        title: 'Evolution',
        text: 'You have enough Runes to merge them. Try merging two Runes of the same type!',
        targetId: 'tab-skills',
        position: 'top'
    },
    'EQUIP_RUNE_PROFILE': {
        title: 'More Power',
        text: 'Now that you have evolved your Runes, let\'s equip them. Go to your Profile.',
        targetId: 'tab-profile',
        position: 'bottom'
    },
    'PROFILE_RUNE_TAB': {
        title: 'Rune Slots',
        text: 'Open the Runes tab in your profile to manage your equipped Runes.',
        targetId: 'profile-rune-tab',
        position: 'top'
    },
    'SELECT_RUNE_SLOT': {
        title: 'Empty Slot',
        text: 'Click on an empty rune slot to see your available Runes.',
        targetClass: 'tutorial-rune-slot-empty',
        position: 'bottom'
    },
    'CONFIRM_EQUIP_RUNE': {
        title: 'Final Surge',
        text: 'Select your new Rune and click EQUIP to gain its power!',
        targetClass: 'tutorial-equip-item',
        position: 'cover-best'
    },
    'GO_TO_COMBAT': {
        title: 'Basic Training',
        text: 'It is time to test your power. Go to the Combat tab.',
        targetId: 'tab-combat',
        position: 'bottom'
    },
    'SELECT_COMBAT_CATEGORY': {
        title: 'Adventure Awaits',
        text: 'Click on Adventure to see available enemies.',
        targetId: 'combat-adventure-btn',
        position: 'bottom'
    },
    'START_FIRST_MOB': {
        title: 'First Battle',
        text: 'Start a fight with a Rabbit to begin your journey!',
        targetId: 'fight-button-RABBIT',
        position: 'top'
    },
    'TUTORIAL_FINAL_MESSAGE': {
        title: 'Journey Begins',
        text: 'Congratulations! You have mastered the basics. You are now ready to explore the world and claim your glory!',
        position: 'middle'
    }
};

const TUTORIAL_ORDER = [
    'OPEN_INVENTORY', 'SELECT_CHEST', 'OPEN_CHEST', 'CLAIM_LOOT',
    'OPEN_PROFILE', 'EQUIP_WEAPON', 'SELECT_WEAPON', 'EQUIP_FOOD',
    'SELECT_FOOD', 'MERGE_RUNES_1', 'OPEN_RUNE_FORGE', 'CREATE_RUNE',
    'FORGE_SELECT_MAX', 'FORGE_SELECT_GATHERING', 'FORGE_CONFIRM',
    'CLAIM_FORGE_RESULTS', 'OPEN_RUNE_TAB', 'SELECT_MERGE_RUNE',
    'CONFIRM_MERGE_SELECTION', 'FINAL_MERGE_CLICK', 'VIEW_MERGE_RESULTS',
    'CLOSE_FINAL_MODAL', 'EQUIP_RUNE_PROFILE', 'PROFILE_RUNE_TAB',
    'SELECT_RUNE_SLOT', 'CONFIRM_EQUIP_RUNE', 'GO_TO_COMBAT',
    'SELECT_COMBAT_CATEGORY', 'START_FIRST_MOB', 'TUTORIAL_FINAL_MESSAGE'
];

const TutorialOverlay = ({ currentStep, onCompleteStep }) => {
    const step = TutorialStepData[currentStep];
    const [targetRects, setTargetRects] = useState([]);
    const [lastScrolledStep, setLastScrolledStep] = useState(null);

    const stepIndex = TUTORIAL_ORDER.indexOf(currentStep) + 1;
    const totalSteps = TUTORIAL_ORDER.length;

    useEffect(() => {
        if (!step || (!step.targetId && !step.targetClass)) {
            setTargetRects([]);
            return;
        }

        const updateRects = () => {
            // Auto-advance logic for modals
            const modalEq = document.getElementById('equipment-select-modal');
            if (modalEq) {
                if (currentStep === 'EQUIP_WEAPON') { onCompleteStep('SELECT_WEAPON'); return; }
                if (currentStep === 'EQUIP_FOOD') { onCompleteStep('SELECT_FOOD'); return; }
            }
            if (document.getElementById('tutorial-forge-max') && currentStep === 'CREATE_RUNE') {
                onCompleteStep('FORGE_SELECT_MAX'); return;
            }
            if (document.getElementById('loot-claim-button') && currentStep === 'OPEN_CHEST') {
                onCompleteStep('CLAIM_LOOT'); return;
            }
            if (document.getElementById('tutorial-forge-results-awesome') && currentStep === 'FORGE_CONFIRM') {
                onCompleteStep('CLAIM_FORGE_RESULTS'); return;
            }
            if (document.getElementById('tutorial-rune-use-merge') && currentStep === 'SELECT_MERGE_RUNE') {
                onCompleteStep('CONFIRM_MERGE_SELECTION'); return;
            }
            if (document.getElementById('tutorial-merge-result-item') && currentStep === 'FINAL_MERGE_CLICK') {
                onCompleteStep('VIEW_MERGE_RESULTS'); return;
            }

            const newRects = [];
            if (step.targetClass) {
                const elements = document.getElementsByClassName(step.targetClass);
                for (const el of elements) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) newRects.push(r);
                }
            } else if (step.targetId) {
                const el = document.getElementById(step.targetId);
                if (el) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) newRects.push(r);
                }
            }

            setTargetRects(newRects);

            if (newRects.length > 0 && lastScrolledStep !== currentStep) {
                const els = step.targetClass ? document.getElementsByClassName(step.targetClass) : [document.getElementById(step.targetId)];
                const first = Array.from(els).find(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                });
                if (first) {
                    first.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setLastScrolledStep(currentStep);
                }
            }
        };

        updateRects();
        const interval = setInterval(updateRects, 300);
        window.addEventListener('resize', updateRects);
        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateRects);
        };
    }, [step, currentStep, lastScrolledStep, onCompleteStep]);

    const dialogRef = React.useRef(null);

    // Native capture-phase click blocker — blocks ALL interactions except on targets and dialog
    useEffect(() => {
        if (!step) return;

        const blockEvent = (e) => {
            // Allow interactions inside the tutorial dialog
            if (dialogRef.current && dialogRef.current.contains(e.target)) return;

            // Get coordinates (touch events use touches/changedTouches)
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else if (e.changedTouches && e.changedTouches.length > 0) {
                clientX = e.changedTouches[0].clientX;
                clientY = e.changedTouches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            // Allow interactions inside target areas
            const padding = 10;
            for (const rect of targetRects) {
                if (
                    clientX >= rect.left - padding &&
                    clientX <= rect.left + rect.width + padding &&
                    clientY >= rect.top - padding &&
                    clientY <= rect.top + rect.height + padding
                ) {
                    return; // Let it through
                }
            }

            // Block everything else
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        };

        const opts = { capture: true, passive: false };
        document.addEventListener('click', blockEvent, opts);
        document.addEventListener('mousedown', blockEvent, opts);
        document.addEventListener('mouseup', blockEvent, opts);
        document.addEventListener('touchstart', blockEvent, opts);
        document.addEventListener('touchend', blockEvent, opts);

        return () => {
            document.removeEventListener('click', blockEvent, opts);
            document.removeEventListener('mousedown', blockEvent, opts);
            document.removeEventListener('mouseup', blockEvent, opts);
            document.removeEventListener('touchstart', blockEvent, opts);
            document.removeEventListener('touchend', blockEvent, opts);
        };
    }, [step, targetRects]);

    if (!step) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 30000,
            overflow: 'hidden'
        }}>
            {/* SVG Mask with Smooth Transitions */}
            <svg style={{ width: '100%', height: '100%', position: 'absolute' }}>
                <defs>
                    <mask id="tutorial-mask">
                        <rect width="100%" height="100%" fill="white" />
                        <AnimatePresence>
                            {targetRects.map((rect, i) => (
                                <motion.rect
                                    key={currentStep + i}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 1.1 }}
                                    x={rect.left - 6}
                                    y={rect.top - 6}
                                    width={rect.width + 12}
                                    height={rect.height + 12}
                                    rx="12"
                                    fill="black"
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                />
                            ))}
                        </AnimatePresence>
                    </mask>
                </defs>
                <motion.rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.75)"
                    mask="url(#tutorial-mask)"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    style={{ pointerEvents: 'none' }}
                />
            </svg>

            {/* Glowing Highlights */}
            <AnimatePresence>
                {targetRects.map((rect, i) => (
                    <motion.div
                        key={`highlight-${currentStep}-${i}`}
                        initial={{ opacity: 0, scale: 1.2 }}
                        animate={{
                            opacity: [0.8, 1, 0.8],
                            scale: [1, 1.02, 1],
                        }}
                        transition={{
                            opacity: { duration: 2, repeat: Infinity },
                            scale: { duration: 2, repeat: Infinity },
                            initial: { type: 'spring', damping: 20 }
                        }}
                        style={{
                            position: 'absolute',
                            left: rect.left - 10,
                            top: rect.top - 10,
                            width: rect.width + 20,
                            height: rect.height + 20,
                            border: '3px solid var(--accent)',
                            borderRadius: '16px',
                            boxShadow: '0 0 30px var(--accent)',
                            pointerEvents: 'none'
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* AAA Glassmorphism Dialog */}
            <AnimatePresence mode="wait">
                <motion.div
                    ref={dialogRef}
                    key={currentStep}
                    initial={{ opacity: 0, y: 10, scale: 0.98, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, scale: 1, x: "-50%" }}
                    exit={{ opacity: 0, y: -10, scale: 0.98, x: "-50%" }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: step.position === 'very-top' ? '20px' :
                            (step.position === 'cover-best' ? '28%' :
                                (step.position === 'top' ? '12%' :
                                    (step.position === 'middle' ? '42%' : 'auto'))),
                        bottom: step.position === 'bottom' ? '85px' : 'auto',
                        width: 'calc(100% - 80px)',
                        maxWidth: '240px',
                        background: 'rgba(20, 20, 25, 0.85)',
                        backdropFilter: 'blur(12px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '16px',
                        padding: '12px 16px',
                        boxShadow: '0 10px 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
                        pointerEvents: 'auto',
                        zIndex: 30001,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}
                >
                    {/* Header with Step indicator */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: 'rgba(var(--accent-rgb), 0.15)',
                            padding: '2px 8px',
                            borderRadius: '100px',
                            border: '1px solid var(--accent-soft)'
                        }}>
                            <Sparkles size={10} color="var(--accent)" />
                            <span style={{
                                color: 'var(--accent)',
                                fontSize: '0.55rem',
                                fontWeight: 'bold',
                                letterSpacing: '1px',
                                textTransform: 'uppercase'
                            }}>
                                {stepIndex}/{totalSteps}
                            </span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <h3 style={{
                            margin: 0,
                            color: '#fff',
                            fontSize: '0.9rem',
                            fontWeight: '900',
                            letterSpacing: '-0.3px'
                        }}>
                            {step.title}
                        </h3>
                        <p style={{
                            margin: 0,
                            color: 'rgba(255,255,255,0.7)',
                            lineHeight: '1.4',
                            fontSize: '0.75rem',
                            fontWeight: '500'
                        }}>
                            {step.text}
                        </p>
                    </div>

                    {/* Action Button */}
                    {!step.targetId && !step.targetClass && (
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: 'var(--accent-bright)' }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onCompleteStep(currentStep === 'TUTORIAL_FINAL_MESSAGE' ? 'COMPLETED' : currentStep)}
                            style={{
                                marginTop: '4px',
                                width: '100%',
                                padding: '10px',
                                background: 'var(--accent)',
                                border: 'none',
                                borderRadius: '10px',
                                color: '#000',
                                fontWeight: '900',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: '0.8rem',
                                letterSpacing: '0.5px',
                                boxShadow: '0 4px 12px rgba(var(--accent-rgb), 0.3)',
                                transition: 'all 0.2s ease',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Shine Effect Animation Overlay */}
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: '-100%',
                                    width: '100%',
                                    height: '100%',
                                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                }}
                                animate={{ left: '200%' }}
                                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
                            />

                            <span style={{ position: 'relative', zIndex: 1 }}>
                                {currentStep === 'TUTORIAL_FINAL_MESSAGE' ? 'START YOUR JOURNEY' : 'CONTINUE'}
                            </span>
                            {currentStep !== 'TUTORIAL_FINAL_MESSAGE' && <ChevronRight size={20} />}
                        </motion.button>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default TutorialOverlay;
