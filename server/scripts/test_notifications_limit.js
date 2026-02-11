import { GameManager } from '../GameManager.js';

// Mock character object
const char = {
    id: 'test-char',
    state: {
        notifications: [
            { id: 1, message: 'Notif 1 (Oldest)' },
            { id: 2, message: 'Notif 2' },
            { id: 3, message: 'Notif 3' },
            { id: 4, message: 'Notif 4' },
            { id: 5, message: 'Notif 5' },
            { id: 6, message: 'Notif 6' },
            { id: 7, message: 'Notif 7' },
            { id: 8, message: 'Notif 8' },
            { id: 9, message: 'Notif 9' },
            { id: 10, message: 'Notif 10 (Newest)' }
        ]
    }
};

// We need to invert the order if we use unshift.
// In the code, unshift puts newest at the beginning.
// So: [Newest, ..., Oldest]
char.state.notifications = [
    { id: 10, message: 'N10 (Newest)' },
    { id: 9, message: 'N9' },
    { id: 8, message: 'N8' },
    { id: 7, message: 'N7' },
    { id: 6, message: 'N6' },
    { id: 5, message: 'N5' },
    { id: 4, message: 'N4' },
    { id: 3, message: 'N3' },
    { id: 2, message: 'N2' },
    { id: 1, message: 'N1 (Oldest)' }
];

const gm = new GameManager({}); // Supabase is not needed for this test

console.log('--- Current Notifications (10) ---');
char.state.notifications.forEach(n => console.log(`- ${n.message}`));

console.log('\n--- Adding a new notification (N11) ---');
gm.addNotification(char, 'SUCCESS', 'N11 (Brand New)');

console.log('\n--- New Notifications (Should still be 10, N1 gone) ---');
char.state.notifications.forEach(n => console.log(`- ${n.message}`));

if (char.state.notifications.length === 10 && char.state.notifications[0].message === 'N11 (Brand New)' && !char.state.notifications.some(n => n.message === 'N1 (Oldest)')) {
    console.log('\n✅ TEST PASSED: Oldest removed, only 10 kept.');
} else {
    console.log('\n❌ TEST FAILED');
}
