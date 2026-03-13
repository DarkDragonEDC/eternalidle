const VAPID_PUBLIC_KEY = 'BOq5hpW-pqknqPdagPCms-kdX7ypprE_teMi0b4sihmVamw58m51pzNYYcL7NF-jxdsyeRFPfG0VO9pT14FraV8';

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export const PushService = {
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/service-worker.js');
                console.log('Service Worker registered with scope:', registration.scope);
                return registration;
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
        return null;
    },

    async getSubscription() {
        if (!('serviceWorker' in navigator)) return null;
        const registration = await navigator.serviceWorker.ready;
        return await registration.pushManager.getSubscription();
    },

    async subscribeUser() {
        if (!('serviceWorker' in navigator)) return null;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
        });

        return subscription;
    },

    async unsubscribeUser() {
        const subscription = await this.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            return true;
        }
        return false;
    }
};
