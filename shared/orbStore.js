// Orb Store - Premium items purchasable with Orbs

export const ORB_STORE = {
    // Real money packages to get Orbs
    PACKAGES: {
        ORBS_250: {
            id: 'ORBS_250',
            name: '250 Orbs',
            description: 'Pack with +25 Bonus Orbs!',
            price: 6.99,
            priceBRL: 36.90,
            amount: 275,
            icon: '/items/250_ORB.webp',
            category: 'PACKAGE',
            currency: 'USD'
        },
        ORBS_500: {
            id: 'ORBS_500',
            name: '500 Orbs',
            description: 'Pack with +50 Bonus Orbs!',
            price: 13.99,
            priceBRL: 72.90,
            amount: 550,
            icon: '/items/500_ORB.webp',
            category: 'PACKAGE',
            currency: 'USD',
            bestSeller: true
        },
        ORBS_1000: {
            id: 'ORBS_1000',
            name: '1000 Orbs',
            description: 'Pack with +100 Bonus Orbs!',
            price: 25.99,
            priceBRL: 135.90,
            amount: 1100,
            icon: '/items/1000_ORB.webp',
            category: 'PACKAGE',
            currency: 'USD'
        },
        ORBS_2500: {
            id: 'ORBS_2500',
            name: '2500 Orbs',
            description: 'Pack with +250 Bonus Orbs! (Best Value)',
            price: 64.99,
            priceBRL: 339.90,
            amount: 2750,
            icon: '/items/2500_ORB.webp',
            category: 'PACKAGE',
            currency: 'USD',
            premium: true
        }
    },
    BOOSTS: {},
    CONVENIENCE: {
        INVENTORY_SLOT_TICKET: {
            id: 'INVENTORY_SLOT_TICKET',
            name: 'Inventory Slot expansion',
            description: 'Permanently increases your inventory by 1 slot.',
            cost: 50,
            category: 'CONVENIENCE',
            permanent: true,
            icon: '/items/INVENTORY_SLOT.webp'
        },
        NAME_CHANGE_TOKEN: {
            id: 'NAME_CHANGE_TOKEN',
            name: 'Name Change Token',
            description: 'Unlock a one-time name change.',
            cost: 500,
            category: 'CONVENIENCE',
            permanent: false,
            icon: '/items/CHANGE_NAME.webp'
        },
        QUEUE_EXPANSION: {
            id: 'QUEUE_EXPANSION',
            name: 'Queue expansion',
            description: 'Permanently unlocks a 2nd slot in your action queue. Requires active Membership.',
            cost: 250,
            category: 'CONVENIENCE',
            permanent: true,
            maxPurchases: 1,
            requiresMembership: true,
            icon: '/items/QUEUE_SLOT_V2.png'
        }
    },
    COSMETICS: {},
    MEMBERSHIP: {
        MEMBERSHIP: {
            id: 'MEMBERSHIP',
            name: 'Membership',
            description: 'Activate to receive 30 days of VIP status and exclusive benefits.',
            price: 6.99,
            priceBRL: 33.00,
            currency: 'USD',
            icon: '/items/MEMBERSHIP.webp',
            category: 'MEMBERSHIP',
            duration: 30 * 24 * 60 * 60 * 1000,
            permanent: false
        },
        MEMBERSHIP_3: {
            id: 'MEMBERSHIP_3',
            name: '3-Month Membership',
            description: '3x Membership items (90 days of VIP). Save 8%!',
            price: 19.22,
            priceBRL: 90.75,
            currency: 'USD',
            icon: '/items/MEMBERSHIP.webp',
            category: 'MEMBERSHIP',
            membershipQty: 3,
            permanent: false
        },
        MEMBERSHIP_6: {
            id: 'MEMBERSHIP_6',
            name: '6-Month Membership',
            description: '6x Membership items (180 days of VIP). Save 8%!',
            price: 38.44,
            priceBRL: 181.50,
            currency: 'USD',
            icon: '/items/MEMBERSHIP.webp',
            category: 'MEMBERSHIP',
            membershipQty: 6,
            bestSeller: true,
            permanent: false
        },
        MEMBERSHIP_12: {
            id: 'MEMBERSHIP_12',
            name: 'Annual Membership',
            description: '12x Membership items (360 days of VIP). Save 8%!',
            price: 76.89,
            priceBRL: 363.00,
            currency: 'USD',
            icon: '/items/MEMBERSHIP.webp',
            category: 'MEMBERSHIP',
            membershipQty: 12,
            premium: true,
            permanent: false
        }
    }
};

// Helper to get all store items as flat array
export const getAllStoreItems = () => {
    const items = [];
    Object.values(ORB_STORE).forEach(category => {
        Object.values(category).forEach(item => {
            items.push(item);
        });
    });
    return items;
};

// Get item by ID
export const getStoreItem = (itemId) => {
    for (const category of Object.values(ORB_STORE)) {
        for (const item of Object.values(category)) {
            if (item.id === itemId) return item;
        }
    }
    return null;
};
