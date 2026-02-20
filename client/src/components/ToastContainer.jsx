import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContainer = ({ socket }) => {
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        if (!socket) return;

        const handleActionResult = (result) => {
            // Filter out Combat messages based on content strings
            // We don't use result.combatUpdate extraction because it might be present during gathering too
            const msg = result.message;
            if (!msg) return;

            if (msg.startsWith('Dmg:') ||
                msg.startsWith('Defeated') ||
                msg.startsWith('You were defeated')) {
                return;
            }

            addToast(msg, result.success ? 'success' : 'error');
        };

        const handleError = (error) => {
            addToast(error.message || "An error occurred", 'error');
        };

        const handleStatus = (status) => {
            // Optional: level up toast? 
            // Usually handled by level up modal, but maybe small toast too?
            // For now, stick to action_result
        };

        const handleTradeSuccess = (data) => {
            addToast(data.message || 'Trade completed!', 'success');
        };

        const handleDungeonQueueStop = (data) => {
            if (data.success) {
                addToast(data.message || 'Dungeon will stop after this run', 'success');
            } else {
                addToast(data.message || 'Failed to stop dungeon queue', 'error');
            }
        };

        socket.on('action_result', handleActionResult);
        socket.on('error', handleError);
        socket.on('trade_success', handleTradeSuccess);
        socket.on('stop_dungeon_queue_result', handleDungeonQueueStop);

        return () => {
            socket.off('action_result', handleActionResult);
            socket.off('error', handleError);
            socket.off('trade_success', handleTradeSuccess);
            socket.off('stop_dungeon_queue_result', handleDungeonQueueStop);
        };
    }, [socket]);

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
