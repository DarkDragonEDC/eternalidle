import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer = ({ socket, settings }) => {
    const store = useAppStore();
    const { 
        lastActionResult, setLastActionResult,
        tradeSuccess, setTradeSuccess,
        serverError, setServerError
    } = store;

    const [toasts, setToasts] = useState([]);

    // Action Result Toast
    useEffect(() => {
        if (!lastActionResult) return;

        const result = lastActionResult;
        const msg = result.message;
        if (!msg) return;

        // Filters preserved
        if (msg.startsWith('Dmg:') ||
            msg.startsWith('Defeated') ||
            msg.startsWith('You were defeated')) {
            return;
        }

        if (msg.startsWith('Exploring') || msg.startsWith('Starting repeat run') || msg.startsWith('Dungeon run is finished')) {
            return;
        }

        if (settings?.hideCollectionPopups) {
            if (msg.includes('+') || msg.toLowerCase().includes('gathered') || msg.toLowerCase().includes('mined') || msg.toLowerCase().includes('caught') || msg.toLowerCase().includes('harvested') || Boolean(result.items_gained)) {
                return;
            }
        }

        addToast(msg, result.success ? 'success' : 'error');
        setLastActionResult(null);
    }, [lastActionResult, setLastActionResult, settings]);

    // Trade Success Toast
    useEffect(() => {
        if (!tradeSuccess) return;
        addToast(tradeSuccess.message || 'Trade completed!', 'success');
        setTradeSuccess(null);
    }, [tradeSuccess, setTradeSuccess]);

    // Error Toast
    useEffect(() => {
        if (!serverError) return;
        addToast(serverError, 'error');
        setServerError(null);
    }, [serverError, setServerError]);

    const addToast = (message, type = 'info') => {
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);

        // Auto remove
        setTimeout(() => {
            removeToast(id);
        }, 3000); // 3 seconds
    };

    const removeToast = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px', // Above bottom nav/footer
            right: '20px',
            zIndex: 50000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            pointerEvents: 'none', // Allow clicking through container
            width: 'auto',
            maxWidth: '150px', // Micro width
            alignItems: 'flex-end'
        }}>
            <AnimatePresence>
                {toasts.map(toast => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                        layout
                        style={{
                            background: toast.type === 'error' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(16, 185, 129, 0.9)',
                            color: '#fff',
                            padding: '3px 6px', // Micro padding
                            borderRadius: '3px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px', // Micro gap
                            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                            backdropFilter: 'blur(1px)',
                            pointerEvents: 'auto',
                            border: '1px solid rgba(255,255,255,0.1)',
                            fontSize: '0.6rem', // Micro font
                            fontWeight: '500',
                            lineHeight: '1.1'
                        }}
                    >
                        {toast.type === 'error' ? <AlertCircle size={10} /> : <CheckCircle size={10} />}
                        <div style={{ flex: 1 }}>{toast.message}</div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: 0, display: 'flex' }}
                        >
                            <X size={10} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default ToastContainer;
