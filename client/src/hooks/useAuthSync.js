import { useEffect } from 'react';
import { supabase } from '../supabase';
import { useAppStore } from '../store/useAppStore';

export const useAuthSync = () => {
    const { setSession, setIsAuthLoading } = useAppStore();

    useEffect(() => {
        // 1. Initial session check
        const initAuth = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                setSession(session);
            } catch (err) {
                console.error('[AUTH] Session rehydration failed:', err.message);
            } finally {
                setIsAuthLoading(false);
            }
        };

        initAuth();

        // 2. Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setIsAuthLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, [setSession, setIsAuthLoading]);
};
