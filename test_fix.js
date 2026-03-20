import { GameManager } from './server/GameManager.js';

async function test() {
    console.log("Starting GameManager initialization test...");
    const mockSupabase = {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: null }),
                    single: () => Promise.resolve({ data: null })
                })
            })
        })
    };

    try {
        const gm = new GameManager(mockSupabase);
        console.log("GameManager initialized successfully.");
        
        if (gm.notifications) {
            console.log("NotificationService initialized.");
        } else {
            console.error("NotificationService is still UNDEFINED!");
        }

        if (gm.pushManager) {
            console.log("PushManager initialized.");
        } else {
            console.error("PushManager is still UNDEFINED!");
        }

        // Mock a character object
        const mockChar = {
            id: 'test-char-id',
            state: { notifications: [] }
        };

        // Test addNotification
        console.log("Testing addNotification...");
        // We need to mock gm.markDirty and gm.broadcastToCharacter as NotificationService calls them
        gm.markDirty = () => {};
        gm.notifications.broadcastToCharacter = () => Promise.resolve();
        
        gm.addNotification(mockChar, 'SYSTEM', 'Test Notification');
        console.log("addNotification called successfully.");
        console.log("Notifications count:", mockChar.state.notifications.length);
        
        if (mockChar.state.notifications.length > 0) {
            console.log("SUCCESS: Notification added to character state.");
        } else {
            console.error("FAILURE: Notification not added.");
        }

    } catch (err) {
        console.error("Error during test:", err);
    }
}

test();
