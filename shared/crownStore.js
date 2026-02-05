// Crown Store - Premium items purchasable with Crowns

export const CROWN_STORE = {
    // Real money packages to get Crowns
    PACKAGES: {
        CROWNS_250: {
            id: 'CROWNS_250',
            name: '250 Orbs',
            description: 'Pack with +25 Bonus Orbs!',
            price: 6.99,
            priceBRL: 39.90,
            amount: 275,
            icon: '💎',
            category: 'PACKAGE',
            currency: 'USD',
            stripeLink: 'https://buy.stripe.com/dRm28r8Rx4OmciEdtY7kc02'
        },
        CROWNS_500: {
            id: 'CROWNS_500',
            name: '500 Orbs',
            description: 'Pack with +50 Bonus Orbs!',
            price: 13.99,
            priceBRL: 79.90,
            amount: 550,
            icon: '💰',
            category: 'PACKAGE',
            currency: 'USD',
            bestSeller: true,
            stripeLink: 'https://buy.stripe.com/7sYeVdaZFcgO6Yk4Xs7kc03'
        },
        CROWNS_1000: {
            id: 'CROWNS_1000',
            name: '1000 Orbs',
            description: 'Pack with +100 Bonus Orbs!',
            price: 25.99,
            priceBRL: 149.90,
            amount: 1100,
            icon: '📦',
            category: 'PACKAGE',
            currency: 'USD',
            stripeLink: 'https://buy.stripe.com/28E00j5Fl3Ki6YkblQ7kc04'
        },
        CROWNS_2500: {
            id: 'CROWNS_2500',
            name: '2500 Orbs',
            description: 'Pack with +250 Bonus Orbs! (Best Value)',
            price: 64.99,
            priceBRL: 299.90,
            amount: 2750,
            icon: '👑',
            category: 'PACKAGE',
            currency: 'USD',
            premium: true,
            stripeLink: 'https://buy.stripe.com/bJefZhgjZ3Ki2I4gGa7kc05'
        }
    },
    BOOSTS: {},
    CONVENIENCE: {
        INVENTORY_SLOT_TICKET: {
            id: 'INVENTORY_SLOT_TICKET',
            name: 'Inventory Slot expansion',
            description: 'Permanently increases your inventory by 1 slot.',
            cost: 25,
            category: 'CONVENIENCE',
            permanent: true
        },
        NAME_CHANGE_TOKEN: {
            id: 'NAME_CHANGE_TOKEN',
            name: 'Name Change Token',
            description: 'Unlock a one-time name change.',
            cost: 500,
            category: 'CONVENIENCE',
            permanent: false
        }
    },
    COSMETICS: {},
    MEMBERSHIP: {
        ETERNAL_MEMBERSHIP: {
            id: 'ETERNAL_MEMBERSHIP',
            name: 'Eternal Membership',
            description: 'Activate to receive 30 days of VIP status and exclusive benefits.',
            price: 6.99,
            priceBRL: 39.90,
            currency: 'USD',
            icon: '🏆',
            category: 'MEMBERSHIP',
            duration: 30 * 24 * 60 * 60 * 1000,
            permanent: false,
            stripeLink: 'https://buy.stripe.com/aFa3cvc3JeoWbeAdtY7kc01'
        }
    }
};

// Helper to get all store items as flat array
export const getAllStoreItems = () => {
    const items = [];
    Object.values(CROWN_STORE).forEach(category => {
        Object.values(category).forEach(item => {
            items.push(item);
        });
    });
    return items;
};

// Get item by ID
export const getStoreItem = (itemId) => {
    for (const category of Object.values(CROWN_STORE)) {
        for (const item of Object.values(category)) {
            if (item.id === itemId) return item;
        }
    }
    return null;
};
