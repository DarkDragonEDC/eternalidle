import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, Info } from 'lucide-react';

const TutorialStepData = {
    'OPEN_INVENTORY': {
        title: 'Welcome to Eternal Idle!',
        text: 'Let\'s start by checking your items. Open your inventory.',
        targetId: 'tab-inventory',
        position: 'top'
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
        position: 'top'
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
        position: 'top-lower'
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
        position: 'top-lower'
    },
    'MERGE_RUNES_1': {
        title: 'Skills & Forging',
        text: 'You found some Rune Shards! Open the Skills tab to find the Rune Forge.',
        targetId: 'tab-skills',
        position: 'top'
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
        position: 'top'
    },
    'FORGE_SELECT_GATHERING': {
        title: 'Choose a Path',
        text: 'Select Gathering to create a Rune that boosts your gathering skills.',
        targetId: 'tutorial-forge-gathering',
        position: 'top'
    },
    'FORGE_CONFIRM': {
        title: 'Forge It!',
        text: 'Click Confirm to forge your very first Rune!',
        targetId: 'tutorial-forge-confirm',
        position: 'top'
    },
    'CLAIM_FORGE_RESULTS': {
        title: 'Gained Power',
        text: 'Click AWESOME! to see your newly created Runes.',
        targetId: 'tutorial-forge-results-awesome',
        position: 'top'
    },
    'OPEN_RUNE_TAB': {
        title: 'Your Collection',
        text: 'Open the Runes tab to see all your collected Runes.',
        targetId: 'tutorial-rune-tab',
        position: 'top'
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
        position: 'top'
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
        position: 'top-lower'
    },
    'GO_TO_COMBAT': {
        title: 'Basic Training',
        text: 'It is time to test your power. Go to the Combat tab.',
        targetId: 'tab-combat',
        position: 'top'
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
        position: 'bottom'
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
    'SELECT_COMBAT_CATEGORY', 'START_FIRST_MOB', 'MERGE_RUNES_2'
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
            if (document.getElementById('equipment-select-modal')) {
                if (currentStep === 'EQUIP_WEAPON') {
                    onCompleteStep('SELECT_WEAPON');
                    return;
                }
                if (currentStep === 'EQUIP_FOOD') {
                    onCompleteStep('SELECT_FOOD');
                    return;
                }
            }
            if (document.getElementById('tutorial-forge-max')) {
                if (currentStep === 'CREATE_RUNE') {
                    onCompleteStep('FORGE_SELECT_MAX');
                    return;
                }
            }
            if (document.getElementById('loot-claim-button')) {
                if (currentStep === 'OPEN_CHEST') {
                    onCompleteStep('CLAIM_LOOT');
                    return;
                }
            }
            if (document.getElementById('tutorial-forge-results-awesome')) {
                if (currentStep === 'FORGE_CONFIRM') {
                    onCompleteStep('CLAIM_FORGE_RESULTS');
                    return;
                }
            }
            if (document.getElementById('tutorial-rune-use-merge')) {
                if (currentStep === 'SELECT_MERGE_RUNE') {
                    onCompleteStep('CONFIRM_MERGE_SELECTION');
                    return;
                }
            }
            if (document.getElementById('tutorial-merge-result-item')) {
                if (currentStep === 'FINAL_MERGE_CLICK') {
                    onCompleteStep('VIEW_MERGE_RESULTS');
                    return;
                }
            }

            const newRects = [];
            if (step.targetClass) {
                const elements = document.getElementsByClassName(step.targetClass);
                for (const el of elements) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        newRects.push(r);
                    }
                }
            } else if (step.targetId) {
                const el = document.getElementById(step.targetId);
                if (el) {
                    const r = el.getBoundingClientRect();
                    if (r.width > 0 && r.height > 0) {
                        newRects.push(r);
                    }
                }
            }

            setTargetRects(newRects);

            // Auto-scroll logic (only for the first found element)
            if (newRects.length > 0 && lastScrolledStep !== currentStep) {
                const elements = step.targetClass ? document.getElementsByClassName(step.targetClass) : [document.getElementById(step.targetId)];
                const firstVisible = Array.from(elements).find(el => {
                    const r = el.getBoundingClientRect();
                    return r.width > 0 && r.height > 0;
                });
                if (firstVisible) {
                    firstVisible.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    setLastScrolledStep(currentStep);
                }
            }
        };

        updateRects();
        const interval = setInterval(updateRects, 500); // Poll for layout changes
        window.addEventListener('resize', updateRects);

        return () => {
            clearInterval(interval);
            window.removeEventListener('resize', updateRects);
        };
    }, [step, currentStep, lastScrolledStep]);

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
            {/* Dark Overlay with Hole */}
            <svg style={{ width: '100%', height: '100%' }}>
                <defs>
                    <mask id="hole">
                        <rect width="100%" height="100%" fill="white" />
                        {targetRects.map((rect, i) => (
                            <rect
                                key={`hole-${i}`}
                                x={rect.left - 4}
                                y={rect.top - 4}
                                width={rect.width + 8}
                                height={rect.height + 8}
                                rx="8"
                                fill="black"
                            />
                        ))}
                    </mask>
                </defs>
                <rect
                    width="100%"
                    height="100%"
                    fill="rgba(0,0,0,0.7)"
                    mask="url(#hole)"
                    style={{ pointerEvents: 'none' }}
                />
            </svg>

            {/* Highlight Border */}
            {targetRects.map((rect, i) => (
                <motion.div
                    key={`border-${i}`}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    style={{
                        position: 'absolute',
                        left: rect.left - 6,
                        top: rect.top - 6,
                        width: rect.width + 12,
                        height: rect.height + 12,
                        border: '3px solid var(--accent)',
                        borderRadius: '12px',
                        boxShadow: '0 0 20px var(--accent)',
                        pointerEvents: 'none'
                    }}
                />
            ))}

            {/* Dialog Box */}
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: 20, x: "-50%" }}
                    animate={{ opacity: 1, y: 0, x: "-50%" }}
                    exit={{ opacity: 0, y: 20, x: "-50%" }}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: step.position === 'very-top' ? '10px' : (step.position === 'top-lower' ? '180px' : (step.position === 'top' ? '10%' : 'auto')),
                        bottom: step.position === 'bottom' ? '40px' : 'auto',
                        width: 'calc(100% - 40px)',
                        maxWidth: '360px',
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        padding: '16px',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        pointerEvents: 'auto',
                        zIndex: 30001
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                        <Info size={20} color="var(--accent)" />
                        <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.1rem' }}>
                            {stepIndex > 0 ? `(${stepIndex}/${totalSteps}) ` : ''}{step.title}
                        </h3>
                    </div>
                    <p style={{ margin: 0, color: 'var(--text-dim)', lineHeight: '1.5', fontSize: '0.95rem' }}>
                        {step.text}
                    </p>

                    {/* Progress Helper (Conditional Finish Button if not clicking target) */}
                    {!step.targetId && !step.targetClass && (
                        <button
                            onClick={() => onCompleteStep(currentStep)}
                            style={{
                                marginTop: '15px',
                                width: '100%',
                                padding: '10px',
                                background: 'var(--accent)',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'var(--bg-dark)',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '5px'
                            }}
                        >
                            CONTINUE <ChevronRight size={18} />
                        </button>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default TutorialOverlay;
