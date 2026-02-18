import { calculateItemSellPrice } from '../../shared/items.js';

const MAX_MARKET_PRICE = 1_000_000_000_000; // 1 Trilion
const MAX_MARKET_AMOUNT = 1_000_000_000; // 1 Billion

export class MarketManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async getMarketListings(filters = {}) {
        let query = this.gameManager.supabase
            .from('market_listings')
            .select('*')
            .order('created_at', { ascending: false });

        if (filters.tier) query = query.eq('item_data->>tier', filters.tier.toString());
        if (filters.type) query = query.eq('item_data->>type', filters.type.toUpperCase());
        if (filters.search) query = query.ilike('item_id', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) throw error;

        // Map data to ensure seller_character_id is available even if column is missing
        return (data || []).map(l => ({
            ...l,
            seller_character_id: l.seller_character_id || l.item_data?.seller_character_id
        }));
    }

    async sellItem(userId, characterId, itemId, quantity) {
        if (!quantity || quantity <= 0) throw new Error("Invalid quantity");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        const inventory = char.state.inventory;
        const entry = inventory[itemId];
        const currentQty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);

        if (!entry || currentQty < quantity) {
            throw new Error("Insufficient quantity in inventory");
        }

        const quality = typeof entry === 'object' ? entry.quality : undefined;
        const itemData = this.gameManager.inventoryManager.resolveItem(itemId, quality);
        if (!itemData) throw new Error("Invalid item");

        const pricePerUnit = calculateItemSellPrice(itemData, itemId);
        const totalSilver = pricePerUnit * quantity;

        if (typeof inventory[itemId] === 'object' && inventory[itemId] !== null) {
            inventory[itemId].amount -= quantity;
            if (inventory[itemId].amount <= 0) delete inventory[itemId];
        } else {
            inventory[itemId] -= quantity;
            if (inventory[itemId] <= 0) delete inventory[itemId];
        }

        char.state.silver = (char.state.silver || 0) + totalSilver;

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Sold ${quantity}x ${itemData.name} for ${totalSilver} Silver`, unitPrice: pricePerUnit, total: totalSilver };
    }

    async listMarketItem(userId, characterId, itemId, amount, price, metadata = {}) {
        // Robust numeric parsing for both arguments
        let parsedAmount = Math.floor(Number(amount));
        let parsedPrice = Math.floor(Number(price));

        if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid amount");
        if (isNaN(parsedPrice) || parsedPrice < 0) throw new Error("Invalid price");

        // Safety Caps
        if (parsedAmount > MAX_MARKET_AMOUNT) parsedAmount = MAX_MARKET_AMOUNT;
        if (parsedPrice > MAX_MARKET_PRICE) parsedPrice = MAX_MARKET_PRICE;

        if (!parsedAmount || parsedAmount <= 0) throw new Error("Invalid amount");
        if (!parsedPrice || parsedPrice <= 0) throw new Error("Invalid price");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        // Check Listing Limit (10 base, 30 Premium)
        const isPremium = char.state?.membership?.active && char.state?.membership?.expiresAt > Date.now();
        const maxListings = isPremium ? 50 : 30;

        const { count, error: countError } = await this.gameManager.supabase
            .from('market_listings')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', userId);

        if (countError) throw countError;
        if (count >= maxListings) {
            throw new Error(`Market listing limit reached (${count}/${maxListings}). ${!isPremium ? 'Upgrade to Premium for 50 slots!' : ''}`);
        }

        const inventory = char.state.inventory;
        const entry = inventory[itemId];
        const currentQty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);

        if (!entry || currentQty < parsedAmount) {
            throw new Error("Insufficient quantity in inventory");
        }

        const quality = typeof entry === 'object' ? entry.quality : undefined;
        const stars = typeof entry === 'object' ? entry.stars : undefined;

        const itemData = this.gameManager.inventoryManager.resolveItem(itemId, quality);
        if (!itemData) throw new Error("Invalid item");

        // Clean metadata from server's entry
        const sourceMetadata = typeof entry === 'object' ? { ...entry } : {};
        delete sourceMetadata.amount; // Never store current balance in listing metadata

        // Merge stars/quality if they exist on server (already extracted above)
        if (stars !== undefined) sourceMetadata.stars = stars;
        if (quality !== undefined) sourceMetadata.quality = quality;

        const { error: insertError } = await this.gameManager.supabase
            .from('market_listings')
            .insert({
                seller_id: userId,
                seller_name: char.name,
                item_id: itemId,
                item_data: { ...itemData, ...sourceMetadata, seller_character_id: char.id },
                amount: parsedAmount,
                price: parsedPrice
            });

        if (insertError) {
            throw insertError;
        }

        // Deduct item
        if (typeof inventory[itemId] === 'object' && inventory[itemId] !== null) {
            inventory[itemId].amount -= parsedAmount;
            if (inventory[itemId].amount <= 0) delete inventory[itemId];
        } else {
            inventory[itemId] -= parsedAmount;
            if (inventory[itemId] <= 0) delete inventory[itemId];
        }

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Item listed successfully!` };
    }


    async buyMarketItem(buyerId, characterId, listingId, quantity = 1) {
        if (!listingId || listingId === 'undefined' || listingId === 'null') throw new Error("Invalid Listing ID");
        const qtyNum = parseInt(quantity) || 1;
        console.log(`[MarketManager] buyMarketItem: buyerId=${buyerId}, listingId=${listingId}, qtyNum=${qtyNum}`);

        const buyer = await this.gameManager.getCharacter(buyerId, characterId);
        if (!buyer) throw new Error("Buyer character not found");

        const { data: listing, error: fetchError } = await this.gameManager.supabase
            .from('market_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (fetchError || !listing) throw new Error("Listing not found or expired");
        const sellerCharId = listing.seller_character_id || listing.item_data?.seller_character_id;
        if (sellerCharId === buyer.id) throw new Error("Current character cannot buy its own item");

        const listingAmount = parseInt(listing.amount);
        if (qtyNum > listingAmount) throw new Error(`Only ${listingAmount} items available`);

        const unitPrice = listing.price / listingAmount;
        const totalCost = Math.floor(unitPrice * qtyNum);

        console.log(`[MarketManager] Calculated: unitPrice=${unitPrice}, totalCost=${totalCost}`);

        if ((buyer.state.silver || 0) < totalCost) throw new Error("Insufficient silver");

        // Deduct Silver from Buyer
        buyer.state.silver -= totalCost;

        console.log(`[MarketManager] Adding claim for buyer ${buyerId}:`, { itemId: listing.item_id, amount: qtyNum });

        // Extract instance-specific metadata from listing.item_data
        const listingMetadata = { ...listing.item_data };
        // Remove search/static fields which aren't needed in inventory entry
        delete listingMetadata.name;
        delete listingMetadata.type;
        delete listingMetadata.description;
        delete listingMetadata.icon;
        delete listingMetadata.tier;
        delete listingMetadata.stats;
        delete listingMetadata.rarity;
        delete listingMetadata.rarityColor;
        delete listingMetadata.seller_character_id;

        this.addClaim(buyer, {
            type: 'BOUGHT_ITEM',
            itemId: listing.item_id,
            amount: qtyNum,
            metadata: listingMetadata,
            timestamp: Date.now(),
            cost: totalCost
        });
        this.gameManager.addNotification(buyer, 'SUCCESS', `You bought ${qtyNum}x ${listing.item_data.name} for ${totalCost} Silver.`);
        await this.gameManager.saveState(buyer.id, buyer.state);

        // Update Global Taxometer IMMEDIATELY after buyer pays
        const tax = Math.floor(totalCost * 0.20);
        this.gameManager.updateGlobalTax(tax, 'MARKET');

        // Process Seller side
        // Note: Seller might be offline or playing another character.
        let seller = await this.gameManager.getCharacter(listing.seller_id, sellerCharId || null);
        if (seller) {
            const sellerProfit = totalCost - tax;

            this.addClaim(seller, {
                type: 'SOLD_ITEM',
                silver: sellerProfit,
                itemId: listing.item_id,
                amount: qtyNum,
                timestamp: Date.now()
            });
            this.gameManager.addNotification(seller, 'SUCCESS', `Your item ${listing.item_data.name} (x${qtyNum}) was sold! +${sellerProfit} Silver (after tax).`);
            await this.gameManager.saveState(seller.id, seller.state);
        }

        // Update or Delete Listing
        if (qtyNum >= listingAmount) {
            console.log(`[MarketManager] Full buy - deleting listing ${listingId}`);
            // Full Buy - Delete Listing
            const { error: deleteError } = await this.gameManager.supabase
                .from('market_listings')
                .delete()
                .eq('id', listingId);
            if (deleteError) throw deleteError;
        } else {
            console.log(`[MarketManager] Partial buy - updating listing ${listingId}. Remaining: ${listingAmount - qtyNum}`);
            // Partial Buy - Update Listing
            const remainingAmount = listingAmount - qtyNum;
            const remainingPrice = listing.price - totalCost;

            const { error: updateError } = await this.gameManager.supabase
                .from('market_listings')
                .update({
                    amount: remainingAmount,
                    price: remainingPrice
                })
                .eq('id', listingId);
            if (updateError) throw updateError;
        }

        // --- NEW: Record Market History ---
        try {
            const sellerName = seller?.name || (await this.gameManager.supabase
                .from('characters')
                .select('name')
                .eq('id', sellerCharId)
                .single()).data?.name || 'Unknown';

            await this.gameManager.supabase
                .from('market_history')
                .insert([{
                    item_id: listing.item_id,
                    item_data: listing.item_data,
                    seller_id: listing.seller_id,
                    buyer_id: buyerId,
                    seller_name: sellerName,
                    buyer_name: buyer.name,
                    quantity: qtyNum,
                    price_total: totalCost,
                    price_per_unit: unitPrice,
                    tax_paid: tax,
                    created_at: new Date().toISOString()
                }]);
            console.log(`[MarketManager] Recorded history for ${qtyNum}x ${listing.item_id}`);
        } catch (historyErr) {
            console.error('[MarketManager] Error recording history:', historyErr);
            // Don't throw, transaction is already done
        }

        return { success: true, message: `Bought ${qtyNum}x ${listing.item_data.name} for ${totalCost} Silver` };
    }

    async cancelMarketListing(userId, characterId, listingId) {
        if (!listingId || listingId === 'undefined' || listingId === 'null') throw new Error("Invalid Listing ID");

        const { data: listing, error: fetchError } = await this.gameManager.supabase
            .from('market_listings')
            .select('*')
            .eq('id', listingId)
            .single();

        if (fetchError || !listing) throw new Error("Listing not found");
        if (listing.seller_id !== userId) throw new Error("Permission denied");

        const char = await this.gameManager.getCharacter(userId, characterId);

        // Fee Calculation (10% if < 1 hour)
        const createdAt = new Date(listing.created_at).getTime();
        const elapsedMs = Date.now() - createdAt;
        const ONE_HOUR_MS = 3600 * 1000;
        let feeMsg = "";

        if (elapsedMs < ONE_HOUR_MS) {
            const fee = Math.floor(listing.price * 0.10);
            if ((char.state.silver || 0) < fee) {
                throw new Error(`Insufficient silver for cancellation fee (${fee.toLocaleString()} Silver required).`);
            }
            char.state.silver -= fee;

            // Update Global Taxometer
            this.gameManager.updateGlobalTax(fee, 'MARKET');

            feeMsg = ` A fee of ${fee.toLocaleString()} Silver was charged.`;
        }

        const { error: deleteError } = await this.gameManager.supabase
            .from('market_listings')
            .delete()
            .eq('id', listingId);

        if (deleteError) throw deleteError;

        // Extract instance-specific metadata
        const listingMetadata = { ...listing.item_data };
        delete listingMetadata.name;
        delete listingMetadata.type;
        delete listingMetadata.description;
        delete listingMetadata.icon;
        delete listingMetadata.tier;
        delete listingMetadata.stats;
        delete listingMetadata.rarity;
        delete listingMetadata.rarityColor;
        delete listingMetadata.seller_character_id;

        this.addClaim(char, {
            type: 'CANCELLED_LISTING',
            itemId: listing.item_id,
            amount: listing.amount,
            metadata: listingMetadata,
            name: listing.item_data.name,
            timestamp: Date.now()
        });

        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: `Listing cancelled. Item sent to Claim tab.${feeMsg}` };
    }

    addClaim(char, claimData) {
        if (!char.state.claims) char.state.claims = [];
        char.state.claims.push({
            id: Date.now().toString() + Math.random().toString().slice(2, 8),
            ...claimData
        });
    }

    async claimMarketItem(userId, characterId, claimId) {
        // ... (existing code stays the same)
        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char.state.claims) return { success: false, message: "No items to claim." };

        const claimIndex = char.state.claims.findIndex(c => c.id === claimId);
        if (claimIndex === -1) return { success: false, message: "Claim not found." };

        const claim = char.state.claims[claimIndex];

        if (claim.itemId && claim.type !== 'SOLD_ITEM') {
            const success = this.gameManager.inventoryManager.addItemToInventory(char, claim.itemId, claim.amount, claim.metadata || null);
            if (!success) {
                return { success: false, message: "Inventory full! Please make some space before claiming." };
            }
        }

        if (claim.silver) {
            char.state.silver = (char.state.silver || 0) + claim.silver;
        }

        char.state.claims.splice(claimIndex, 1);
        await this.gameManager.saveState(char.id, char.state);
        return { success: true, message: "Claimed successfully!" };
    }

    async getGlobalHistory() {
        const { data, error } = await this.gameManager.supabase
            .from('market_history')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Sanitize data: Remove buyer info to prevent sniping/tracking
        return (data || []).map(tx => {
            const cleanTx = { ...tx };
            delete cleanTx.buyer_id;
            delete cleanTx.buyer_name;
            return cleanTx;
        });
    }

    async getPersonalHistory(userId) {
        const { data, error } = await this.gameManager.supabase
            .from('market_history')
            .select('*')
            .or(`seller_id.eq.${userId},buyer_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        // Tag each record with the user's role
        return (data || []).map(tx => ({
            ...tx,
            role: tx.buyer_id === userId ? 'BOUGHT' : 'SOLD'
        }));
    }
}
