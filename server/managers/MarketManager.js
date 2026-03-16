import { calculateItemSellPrice } from '../../shared/items.js';

const MAX_MARKET_PRICE = 1_000_000_000_000; // 1 Trilion
const MAX_MARKET_AMOUNT = 1_000_000_000; // 1 Billion

export class MarketManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
    }

    async getMarketListings(filters = {}) {
        const page = parseInt(filters.page) || 1;
        const limit = parseInt(filters.limit) || 10;
        const start = (page - 1) * limit;
        const end = start + limit - 1;

        let query = this.gameManager.supabase
            .from('market_listings')
            .select('*', { count: 'exact' });

        // Apply filters
        if (filters.tier && filters.tier !== 'ALL') {
            query = query.eq('item_data->>tier', filters.tier.toString());
        }
        
        if (filters.quality && filters.quality !== 'ALL') {
            query = query.eq('item_data->>quality', filters.quality.toString());
        }

        if (filters.itemClass && filters.itemClass !== 'ALL') {
            const cls = filters.itemClass.toUpperCase();
            if (cls === 'WARRIOR') {
                 query = query.or('item_id.ilike.%SWORD%,item_id.ilike.%SHEATH%,item_id.ilike.%AXE_%,item_id.ilike.%PLATE_%');
            } else if (cls === 'MAGE') {
                 query = query.or('item_id.ilike.%STAFF%,item_id.ilike.%TOME%,item_id.ilike.%CLOTH_%');
            } else if (cls === 'HUNTER') {
                 query = query.or('item_id.ilike.%BOW%,item_id.ilike.%TORCH%,item_id.ilike.%LEATHER_%');
            }
        }

        if (filters.seller_id) {
            query = query.eq('seller_id', filters.seller_id);
        }
        
        if (filters.seller_character_id) {
            query = query.eq('item_data->>seller_character_id', filters.seller_character_id);
        }

        // Exclude own listings from the browse/buy tab so pagination count is accurate
        if (filters.exclude_seller_id) {
            query = query.neq('seller_id', filters.exclude_seller_id);
        }

        if (filters.category && filters.category !== 'ALL') {
            if (filters.category === 'EQUIPMENT') {
                query = query.or('item_data->>type.in.(WEAPON,ARMOR,HELMET,BOOTS,OFF_HAND,GLOVES,CAPE)');
            } else if (filters.category === 'TOOL') {
                query = query.ilike('item_data->>type', 'TOOL%');
            } else if (filters.category === 'RESOURCE') {
                // Raw resources (excluding refined, runes, and shards)
                query = query.or('item_data->>type.eq.RAW,and(item_data->>type.eq.RESOURCE,item_id.not.ilike.%_BAR,item_id.not.ilike.%_PLANK,item_id.not.ilike.%_LEATHER,item_id.not.ilike.%_CLOTH,item_id.not.ilike.%_EXTRACT,item_id.not.ilike.%_SHARD%,item_id.not.ilike.%_RUNE_%)');
            } else if (filters.category === 'REFINED') {
                query = query.or('item_data->>type.eq.REFINED,and(item_data->>type.eq.RESOURCE,or(item_id.ilike.%_BAR,item_id.ilike.%_PLANK,item_id.ilike.%_LEATHER,item_id.ilike.%_CLOTH,item_id.ilike.%_EXTRACT))');
            } else if (filters.category === 'CONSUMABLE') {
                query = query.in('item_data->>type', ['FOOD', 'POTION']);
            } else if (filters.category === 'RUNES') {
                query = query.or('item_id.ilike.%_RUNE_%,item_id.ilike.%_SHARD%');
            }
        }

        if (filters.search && filters.search.trim() !== '') {
            query = query.ilike('item_id', `%${filters.search.trim()}%`);
        }

        // Apply Sorting
        const sort = filters.sort || 'PRICE_ASC';
        if (sort === 'PRICE_ASC') {
            query = query.order('unit_price', { ascending: true });
        } else if (sort === 'PRICE_DESC') {
            query = query.order('unit_price', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // Apply Pagination
        query = query.range(start, end);

        const { data, count, error } = await query;
        if (error) throw error;

        return {
            listings: (data || []).map(l => ({
                ...l,
                item_id: l.item_id,
                seller_character_id: l.item_data?.seller_character_id // Correctly map from item_data
            })),
            totalCount: count || 0,
            page,
            totalPages: Math.ceil((count || 0) / limit)
        };
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

        await this.gameManager.saveStateCritical(char.id, char.state);
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

        // Enforce minimum price per unit
        const sellPricePerUnit = Math.floor(parsedPrice / parsedAmount);
        // Note: For listings, the itemId passed is already the fully qualified ID from inventory (e.g. T1_SWORD_Q2, MYSTIC_RABBIT_MEAT)
        const minPrice = calculateItemSellPrice(itemData, itemId) || 1;
        if (sellPricePerUnit < minPrice) {
            throw new Error(`Price per unit cannot be below the item's base value (${minPrice.toLocaleString()} Silver).`);
        }

        // --- NEW: AUTO-MATCHING (Sell -> Buy) ---
        let remainingAmount = parsedAmount;
        let totalSold = 0;

        try {
            // Build the item ID variants that buy orders might use
            // Buy orders encode quality/stars in the item_id (e.g., T1_SWORD_Q2, RUNE_XP_WOOD_2STAR)
            const possibleIds = [itemId];
            if (quality !== undefined && quality > 0) {
                possibleIds.push(`${itemId}_Q${quality}`);
            }
            if (stars !== undefined) {
                possibleIds.push(`${itemId}_${stars}STAR`);
            }

            console.log(`[AUTO-MATCH] Selling ${itemId}, checking buy orders for IDs: ${possibleIds.join(', ')}, sellPricePerUnit: ${sellPricePerUnit}, totalPrice: ${parsedPrice}, amount: ${parsedAmount}`);

            const { data: matches, error: matchError } = await this.gameManager.supabase
                .from('market_buy_orders')
                .select('*')
                .in('item_id', possibleIds)
                .eq('status', 'ACTIVE')
                .gte('price_per_unit', sellPricePerUnit)
                .neq('buyer_id', userId) // Cannot match own orders
                .order('price_per_unit', { ascending: false }) // Highest price first
                .order('created_at', { ascending: true }); // Then oldest first

            if (matchError) {
                console.error("[AUTO-MATCH] Query error:", matchError);
            }

            console.log(`[AUTO-MATCH] Found ${matches?.length || 0} matching buy orders`);

            if (matches && matches.length > 0) {
                for (const order of matches) {
                    if (remainingAmount <= 0) break;

                    console.log(`[AUTO-MATCH] Processing order ${order.id}: item=${order.item_id}, price=${order.price_per_unit}, filled=${order.filled}/${order.amount}`);

                    const orderRemaining = order.amount - order.filled;
                    const fillQty = Math.min(remainingAmount, orderRemaining);

                    // Execute Match
                    const transactionPricePerUnit = order.price_per_unit;
                    // Seller GETS their sellPrice, buyer gets the difference back
                    const actualPricePerUnit = sellPricePerUnit;
                    const totalCost = fillQty * actualPricePerUnit;
                    const tax = Math.floor(totalCost * 0.20);
                    const profit = totalCost - tax;
                    const buyerChange = (transactionPricePerUnit - actualPricePerUnit) * fillQty;

                    // Process Seller Profit
                    this.addClaim(char, {
                        type: 'SOLD_ITEM',
                        silver: profit,
                        itemId: itemId,
                        amount: fillQty,
                        timestamp: Date.now(),
                        orderType: 'AUTO_MATCH_SELL'
                    });

                    // Process Buyer Items and Change
                    const buyer = await this.gameManager.getCharacter(order.buyer_id, order.buyer_character_id);
                    if (buyer) {
                        this.addClaim(buyer, {
                            type: 'BOUGHT_ITEM',
                            itemId: itemId,
                            amount: fillQty,
                            metadata: { quality, stars },
                            timestamp: Date.now(),
                            cost: fillQty * transactionPricePerUnit, // Total they paid initially
                            orderType: 'AUTO_MATCH_BUY'
                        });

                        if (buyerChange > 0) {
                            this.addClaim(buyer, {
                                type: 'MARKET_REFUND',
                                silver: buyerChange,
                                message: `Refund for price difference on ${itemData.name} x${fillQty}`,
                                timestamp: Date.now()
                            });
                        }

                        this.gameManager.addNotification(buyer, 'SUCCESS', `Your buy order for ${itemData.name} was partially filled (x${fillQty}). Refund: ${buyerChange} Silver.`);

                        // Push Notification: Item Bought (Auto-match)
                        if (buyer.user_id) {
                            this.gameManager.pushManager.notifyUser(
                                buyer.user_id,
                                'push_market_bought',
                                'Item Bought! 💰',
                                `Your buy order for ${itemData.name} was partially filled (x${fillQty}).`,
                                '/market'
                            );
                        }
                        await this.gameManager.saveStateCritical(buyer.id, buyer.state);
                    }

                    // Update Buy Order
                    const newFilled = Number(order.filled) + fillQty;
                    await this.gameManager.supabase
                        .from('market_buy_orders')
                        .update({
                            filled: newFilled,
                            status: newFilled >= order.amount ? 'FILLED' : 'ACTIVE'
                        })
                        .eq('id', order.id);

                    // Record History
                    console.log(`[AUTO-MATCH] Recording history: item=${itemId}, seller=${userId}, buyer=${order.buyer_id}`);
                    await this.gameManager.supabase.from('market_history').insert([{
                        id: Math.floor(Date.now() * 100) + Math.floor(Math.random() * 100),
                        item_id: itemId,
                        item_data: { ...itemData, quality, stars },
                        seller_id: userId,
                        buyer_id: order.buyer_id,
                        seller_name: char.name,
                        buyer_name: order.buyer_name,
                        quantity: fillQty,
                        price_total: totalCost,
                        price_per_unit: actualPricePerUnit,
                        tax_paid: tax,
                        order_type: 'AUTO_MATCH',
                        created_at: new Date().toISOString()
                    }]);

                    this.gameManager.updateGlobalTax(tax, 'MARKET');
                    remainingAmount -= fillQty;
                    totalSold += fillQty;

                    console.log(`[AUTO-MATCH] Filled ${fillQty} units from order ${order.id}. Remaining: ${remainingAmount}`);
                }
            }
        } catch (matchErr) {
            console.error("[MarketManager] Auto-match failed:", matchErr);
            // Continue with listing if auto-match fails for some reason
        }

        // Deduct items from inventory regardless of whether they were sold or listed
        if (typeof inventory[itemId] === 'object' && inventory[itemId] !== null) {
            inventory[itemId].amount -= parsedAmount;
            if (inventory[itemId].amount <= 0) delete inventory[itemId];
        } else {
            inventory[itemId] -= parsedAmount;
            if (inventory[itemId] <= 0) delete inventory[itemId];
        }
        await this.gameManager.saveStateCritical(char.id, char.state);

        if (remainingAmount > 0) {
            // Clean metadata from server's entry
            const sourceMetadata = typeof entry === 'object' ? { ...entry } : {};
            delete sourceMetadata.amount;

            if (stars !== undefined) sourceMetadata.stars = stars;
            if (quality !== undefined) sourceMetadata.quality = quality;

            const { error: insertError } = await this.gameManager.supabase
                .from('market_listings')
                .insert({
                    seller_id: userId,
                    seller_name: char.name,
                    item_id: itemId,
                    item_data: { ...itemData, ...sourceMetadata, seller_character_id: char.id },
                    amount: remainingAmount,
                    price: remainingAmount * sellPricePerUnit, // Store total price for remaining items
                    unit_price: sellPricePerUnit
                });

            if (insertError) throw insertError;
        }

        const msg = totalSold > 0
            ? `Instantly sold ${totalSold} units. ${remainingAmount > 0 ? `Remaining ${remainingAmount} units listed.` : 'All units sold!'}`
            : `Item listed successfully!`;

        return { success: true, message: msg };
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

        // Push Notification: Item Bought
        if (buyer.user_id) {
            this.gameManager.pushManager.notifyUser(
                buyer.user_id,
                'push_market_bought',
                'Item Bought! 💰',
                `You bought ${qtyNum}x ${listing.item_data.name} for ${totalCost} Silver.`,
                '/market'
            );
        }
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

            // Push Notification: Market Sale
            if (seller.user_id) {
                this.gameManager.pushManager.notifyUser(
                    seller.user_id,
                    'push_market_sale',
                    'Item Sold! 💵',
                    `Your item ${listing.item_data.name} (x${qtyNum}) was sold for ${sellerProfit} Silver.`,
                    '/market'
                );
            }
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

            console.log(`[MarketManager] Recording history for buyer=${buyerId}, seller=${listing.seller_id}, itemId=${listing.item_id}`);
            const { error: historyError } = await this.gameManager.supabase
                .from('market_history')
                .insert([{
                    id: Math.floor(Date.now() * 100) + Math.floor(Math.random() * 100),
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
            
            if (historyError) {
                console.error('[MarketManager] Supabase insert returning error for history:', historyError);
                throw historyError;
            }
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

        await this.gameManager.saveStateCritical(char.id, char.state);
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
        await this.gameManager.saveStateCritical(char.id, char.state);
        return { success: true, message: "Claimed successfully!" };
    }

    async getBuyOrders(filters = {}) {
        let query = this.gameManager.supabase
            .from('market_buy_orders')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false });

        if (filters.tier) query = query.eq('item_data->>tier', filters.tier.toString());
        if (filters.type) query = query.eq('item_data->>type', filters.type.toUpperCase());
        if (filters.search) query = query.ilike('item_id', `%${filters.search}%`);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async createBuyOrder(userId, characterId, itemId, amount, pricePerUnit) {
        let parsedAmount = Math.floor(Number(amount));
        let parsedPrice = Math.floor(Number(pricePerUnit));

        if (isNaN(parsedAmount) || parsedAmount <= 0) throw new Error("Invalid quantity");
        if (isNaN(parsedPrice) || parsedPrice <= 0) throw new Error("Invalid price per unit");

        const char = await this.gameManager.getCharacter(userId, characterId);
        if (!char) throw new Error("Character not found");

        if (char.state.isIronman) throw new Error("Ironman characters cannot use the Marketplace.");

        const totalCost = parsedAmount * parsedPrice;
        if ((char.state.silver || 0) < totalCost) throw new Error(`Insufficient silver for escrow (${totalCost.toLocaleString()} required).`);

        const isPremium = char.state?.membership?.active && char.state?.membership?.expiresAt > Date.now();
        const maxOrders = isPremium ? 50 : 30;

        const { count, error: countError } = await this.gameManager.supabase
            .from('market_buy_orders')
            .select('*', { count: 'exact', head: true })
            .eq('buyer_id', userId)
            .eq('status', 'ACTIVE');

        if (countError) throw countError;
        if (count >= maxOrders) throw new Error(`Buy order limit reached (${count}/${maxOrders}).`);

        // Check if itemId contains quality/stars using precise regex
        let baseItemId = itemId;
        let quality, stars;

        // Matches _Q followed by a digit (e.g. _Q1, _Q2) at the end of the string
        const qualityMatch = itemId.match(/^(.+?)_Q(\d)$/);
        if (qualityMatch) {
            baseItemId = qualityMatch[1];
            quality = parseInt(qualityMatch[2]);
        }

        // Matches _ followed by a digit and STAR (e.g. _2STAR) at the end of the string
        const starMatch = itemId.match(/^(.+?)_(\d)STAR$/);
        if (starMatch) {
            baseItemId = starMatch[1];
            stars = parseInt(starMatch[2]);
        }

        const itemData = this.gameManager.inventoryManager.resolveItem(baseItemId, quality);
        if (!itemData) throw new Error("Invalid item");
        if (stars !== undefined) itemData.stars = stars;
        if (quality !== undefined) itemData.quality = quality;

        // Enforce minimum price (cannot be below item's quick sell value)
        const minPrice = calculateItemSellPrice(itemData, baseItemId) || 1;
        if (parsedPrice < minPrice) {
            throw new Error(`Price per unit cannot be below the item's base value (${minPrice.toLocaleString()} Silver).`);
        }

        // Deduct silver (Escrow)
        char.state.silver -= totalCost;

        // --- NEW: AUTO-MATCHING (Buy -> Sell) ---
        let remainingToBuy = parsedAmount;
        let totalRefund = 0;
        let itemsBought = 0;

        console.log(`[AUTO-MATCH BUY] Creating buy order for ${itemId} (base: ${baseItemId}), pricePerUnit: ${parsedPrice}, amount: ${parsedAmount}`);

        try {
            // Find listings that matches either the exact itemId or the baseItemId
            // Gear often stores by baseItemId, but Runes and shards store by exact ID.
            const { data: listings } = await this.gameManager.supabase
                .from('market_listings')
                .select('*')
                .in('item_id', [itemId, baseItemId])
                .neq('seller_id', userId) // Cannot buy own items
                .order('price', { ascending: true }); // Lowest total price first (needs care since price is total)

            if (listings && listings.length > 0) {
                // Filter and sort by unit price
                const sortedListings = listings
                    .map(l => ({ ...l, unitPrice: Math.floor(l.price / l.amount) }))
                    .filter(l => l.unitPrice <= parsedPrice)
                    .filter(l => {
                        // If it's an exact ID match (like a RUNE_XX_2STAR), it's definitely a match.
                        if (l.item_id === itemId) return true;

                        // Otherwise, match quality/stars if specified (for gear stored as baseId)
                        if (quality !== undefined && l.item_data.quality !== quality) return false;
                        if (stars !== undefined && l.item_data.stars !== stars) return false;
                        return true;
                    })
                    .sort((a, b) => a.unitPrice - b.unitPrice || new Date(a.created_at) - new Date(b.created_at));

                console.log(`[AUTO-MATCH BUY] Found ${sortedListings.length} potential listings for ${itemId}`);

                for (const listing of sortedListings) {
                    if (remainingToBuy <= 0) break;

                    const fillQty = Math.min(remainingToBuy, listing.amount);
                    const unitPrice = listing.unitPrice;
                    const cost = fillQty * unitPrice;
                    const escrowShare = fillQty * parsedPrice;
                    const change = escrowShare - cost;

                    const tax = Math.floor(cost * 0.20);
                    const sellerProfit = cost - tax;

                    console.log(`[AUTO-MATCH BUY] Filling ${fillQty} units from listing ${listing.id} at ${unitPrice}/unit (escrow: ${parsedPrice})`);

                    // Process Buyer (Current char)
                    // RULE: Runes MUST use the full variant ID (itemId) to be indexed correctly in inventory.
                    const isRune = itemId.includes('_RUNE_');
                    const claimItemId = isRune ? itemId : baseItemId;

                    this.addClaim(char, {
                        type: 'BOUGHT_ITEM',
                        itemId: claimItemId,
                        amount: fillQty,
                        metadata: isRune ? null : { quality, stars },
                        timestamp: Date.now(),
                        cost: cost,
                        orderType: 'AUTO_MATCH_BUY'
                    });
                    if (change > 0) {
                        totalRefund += change;
                    }

                    // Process Seller
                    const sellerCharId = listing.item_data?.seller_character_id;
                    const seller = await this.gameManager.getCharacter(listing.seller_id, sellerCharId);
                    if (seller) {
                        this.addClaim(seller, {
                            type: 'SOLD_ITEM',
                            silver: sellerProfit,
                            itemId: baseItemId,
                            amount: fillQty,
                            timestamp: Date.now(),
                            orderType: 'AUTO_MATCH_SELL'
                        });
                        this.gameManager.addNotification(seller, 'SUCCESS', `Your item ${itemData.name} (x${fillQty}) was sold! +${sellerProfit} Silver.`);
                        await this.gameManager.saveStateCritical(seller.id, seller.state);
                    }

                    // Update Listing
                    if (fillQty >= listing.amount) {
                        await this.gameManager.supabase.from('market_listings').delete().eq('id', listing.id);
                    } else {
                        await this.gameManager.supabase.from('market_listings').update({
                            amount: listing.amount - fillQty,
                            price: listing.price - cost
                        }).eq('id', listing.id);
                    }

                    // Record History
                    console.log(`[AUTO-MATCH BUY] Recording history: item=${baseItemId}, seller=${listing.seller_id}, buyer=${userId}`);
                    await this.gameManager.supabase.from('market_history').insert([{
                        item_id: baseItemId,
                        item_data: listing.item_data,
                        seller_id: listing.seller_id,
                        buyer_id: userId,
                        seller_name: listing.seller_name,
                        buyer_name: char.name,
                        quantity: fillQty,
                        price_total: cost,
                        price_per_unit: unitPrice,
                        tax_paid: tax,
                        order_type: 'AUTO_MATCH',
                        created_at: new Date().toISOString()
                    }]);

                    this.gameManager.updateGlobalTax(tax, 'MARKET');
                    remainingToBuy -= fillQty;
                    itemsBought += fillQty;
                }
            }
        } catch (autoMatchErr) {
            console.error("[MarketManager] Buy auto-match failed:", autoMatchErr);
        }

        if (totalRefund > 0) {
            this.addClaim(char, {
                type: 'MARKET_REFUND',
                silver: totalRefund,
                message: `Change for auto-filled buy order for ${itemData.name}`,
                timestamp: Date.now()
            });
        }

        if (remainingToBuy > 0) {
            const { error: insertError } = await this.gameManager.supabase
                .from('market_buy_orders')
                .insert({
                    buyer_id: userId,
                    buyer_character_id: char.id,
                    buyer_name: char.name,
                    item_id: itemId, // Store full ID with suffixes so sellers can find it via possibleIds
                    item_data: { ...itemData, quality, stars },
                    amount: remainingToBuy,
                    price_per_unit: parsedPrice,
                    status: 'ACTIVE'
                });

            if (insertError) {
                // Return escrow for remaining if DB fails
                char.state.silver += (remainingToBuy * parsedPrice);
                throw insertError;
            }
        }

        await this.gameManager.saveStateCritical(char.id, char.state);

        const msg = itemsBought > 0
            ? `Instantly bought ${itemsBought} units. ${remainingToBuy > 0 ? `Remaining ${remainingToBuy} units placed as Buy Order.` : 'All units bought!'}${totalRefund > 0 ? ` Refunded ${totalRefund} Silver change.` : ''}`
            : `Buy order created! ${totalCost.toLocaleString()} Silver held in escrow.`;

        return { success: true, message: msg };
    }

    async fillBuyOrder(sellerId, characterId, orderId, quantity) {
        const qtyNum = Math.floor(Number(quantity));
        if (isNaN(qtyNum) || qtyNum <= 0) throw new Error("Invalid quantity");

        const seller = await this.gameManager.getCharacter(sellerId, characterId);
        if (!seller) throw new Error("Seller character not found");

        if (seller.state.isIronman) throw new Error("Ironman characters cannot use the Marketplace.");

        const { data: order, error: fetchError } = await this.gameManager.supabase
            .from('market_buy_orders')
            .select('*')
            .eq('id', orderId)
            .eq('status', 'ACTIVE')
            .single();

        if (fetchError || !order) throw new Error("Buy order not found or already filled");
        if (order.buyer_character_id === seller.id) throw new Error("You cannot fill your own buy order");

        const remaining = order.amount - order.filled;
        if (qtyNum > remaining) throw new Error(`Only ${remaining} units requested in this order`);

        // --- FIX: Parse quality/stars suffixes from the order's item_id ---
        // Buy orders encode quality/stars in item_id (e.g., T2_TOOL_FISHING_Q4, RUNE_XP_WOOD_2STAR)
        // but inventory stores gear by base ID with quality/stars as metadata.
        let lookupId = order.item_id;
        let requiredQuality, requiredStars;

        const qualityMatch = lookupId.match(/^(.+?)_Q(\d)$/);
        if (qualityMatch) {
            lookupId = qualityMatch[1];
            requiredQuality = parseInt(qualityMatch[2]);
        }

        const starMatch = lookupId.match(/^(.+?)_(\d)STAR$/);
        if (starMatch) {
            lookupId = starMatch[1];
            requiredStars = parseInt(starMatch[2]);
        }

        // Also try using quality/stars from order.item_data as fallback
        if (requiredQuality === undefined && order.item_data?.quality !== undefined) {
            requiredQuality = order.item_data.quality;
        }
        if (requiredStars === undefined && order.item_data?.stars !== undefined) {
            requiredStars = order.item_data.stars;
        }

        console.log(`[FILL_ORDER] order.item_id=${order.item_id}, lookupId=${lookupId}, requiredQuality=${requiredQuality}, requiredStars=${requiredStars}`);

        const inventory = seller.state.inventory;

        // --- FIX: Handle items with signatures in inventory ---
        let invKey = null;
        if (inventory[order.item_id]) {
            invKey = order.item_id;
        } else if (inventory[lookupId]) {
            invKey = lookupId;
        } else {
            // Check if any item in inventory matches when stripping signatures (e.g., T1_FISHING_ROD_Q4::Eterno)
            for (const key of Object.keys(inventory)) {
                const keyBase = key.split('::')[0];
                if (keyBase === order.item_id || keyBase === lookupId) {
                    invKey = key;
                    break;
                }
            }
        }

        if (!invKey) throw new Error("Insufficient items in inventory");

        const entry = inventory[invKey];
        const currentQty = typeof entry === 'object' ? (entry?.amount || 0) : (Number(entry) || 0);

        if (currentQty < qtyNum) throw new Error("Insufficient items in inventory");

        // Validate quality/stars match if the order requires a specific quality
        if (typeof entry === 'object') {
            // First check metadata, then fallback to parsing ID if metadata is missing/zero
            let entryQuality = entry.quality !== undefined ? entry.quality : 0;
            let entryStars = entry.stars !== undefined ? entry.stars : 0;

            // Fallback: Parse from invKey if still 0/undefined but order requires it
            if (requiredQuality !== undefined && entryQuality === 0) {
                const qMatch = invKey.match(/_Q(\d)/);
                if (qMatch) entryQuality = parseInt(qMatch[1]);
            }
            if (requiredStars !== undefined && entryStars === 0) {
                const sMatch = invKey.match(/_(\d)STAR/);
                if (sMatch) entryStars = parseInt(sMatch[1]);
            }

            if (requiredQuality !== undefined && entryQuality !== requiredQuality) {
                throw new Error(`Item quality mismatch. Order requires quality ${requiredQuality}, but your item has quality ${entryQuality}.`);
            }
            if (requiredStars !== undefined && entryStars !== requiredStars) {
                throw new Error(`Item stars mismatch. Order requires ${requiredStars} stars, but your item has ${entryStars}.`);
            }
        }

        // Deduct from inventory using the resolved key
        if (typeof inventory[invKey] === 'object' && inventory[invKey] !== null) {
            inventory[invKey].amount -= qtyNum;
            if (inventory[invKey].amount <= 0) delete inventory[invKey];
        } else {
            inventory[invKey] -= qtyNum;
            if (inventory[invKey] <= 0) delete inventory[invKey];
        }

        const totalPrice = qtyNum * order.price_per_unit;
        const tax = Math.floor(totalPrice * 0.20);
        const profit = totalPrice - tax;

        this.addClaim(seller, {
            type: 'SOLD_ITEM',
            silver: profit,
            itemId: lookupId,
            amount: qtyNum,
            timestamp: Date.now(),
            orderType: 'BUY_ORDER'
        });

        this.gameManager.updateGlobalTax(tax, 'MARKET');
        this.gameManager.addNotification(seller, 'SUCCESS', `Filled buy order for ${qtyNum}x ${order.item_data.name}. Received ${profit.toLocaleString()} Silver.`);

        const buyer = await this.gameManager.getCharacter(order.buyer_id, order.buyer_character_id);
        if (buyer) {
            this.addClaim(buyer, {
                type: 'BOUGHT_ITEM',
                itemId: order.item_id,
                amount: qtyNum,
                metadata: { quality: requiredQuality, stars: requiredStars },
                timestamp: Date.now(),
                cost: totalPrice,
                orderType: 'BUY_ORDER'
            });
            this.gameManager.addNotification(buyer, 'SUCCESS', `Your buy order for ${order.item_data.name} was partially filled (x${qtyNum}).`);
            await this.gameManager.saveStateCritical(buyer.id, buyer.state);
        }

        const newFilled = Number(order.filled) + qtyNum;
        const isFullyFilled = newFilled >= order.amount;

        const { error: updateError } = await this.gameManager.supabase
            .from('market_buy_orders')
            .update({
                filled: newFilled,
                status: isFullyFilled ? 'FILLED' : 'ACTIVE'
            })
            .eq('id', orderId);

        if (updateError) throw updateError;

        try {
            console.log(`[MarketManager] fillBuyOrder recording history: buyer=${order.buyer_id}, seller=${sellerId}, itemId=${lookupId}`);
            const { error: historyError } = await this.gameManager.supabase
                .from('market_history')
                .insert([{
                    id: Math.floor(Date.now() * 100) + Math.floor(Math.random() * 100),
                    item_id: lookupId,
                    item_data: order.item_data,
                    seller_id: sellerId,
                    buyer_id: order.buyer_id,
                    seller_name: seller.name,
                    buyer_name: order.buyer_name,
                    quantity: qtyNum,
                    price_total: totalPrice,
                    price_per_unit: order.price_per_unit,
                    tax_paid: tax,
                    created_at: new Date().toISOString()
                }]);
            
            if (historyError) {
                console.error('[MarketManager] fillBuyOrder history insert error:', historyError);
            }
        } catch (e) {
            console.error("History recording failed", e);
        }

        await this.gameManager.saveStateCritical(seller.id, seller.state);
        return { success: true, message: `Successfully filled ${qtyNum}x of the buy order!` };
    }

    async cancelBuyOrder(userId, characterId, orderId) {
        const { data: order, error: fetchError } = await this.gameManager.supabase
            .from('market_buy_orders')
            .select('*')
            .eq('id', orderId)
            .eq('status', 'ACTIVE')
            .single();

        if (fetchError || !order) throw new Error("Buy order not found or already processed");
        if (order.buyer_id !== userId) throw new Error("Permission denied");

        const char = await this.gameManager.getCharacter(userId, characterId);

        const remaining = order.amount - order.filled;
        const escrowedSilver = remaining * order.price_per_unit;

        const createdAt = new Date(order.created_at).getTime();
        const elapsedMs = Date.now() - createdAt;
        const ONE_HOUR_MS = 3600 * 1000;
        let fee = 0;

        if (elapsedMs < ONE_HOUR_MS) {
            fee = Math.floor(escrowedSilver * 0.10);
            this.gameManager.updateGlobalTax(fee, 'MARKET');
        }

        const refund = escrowedSilver - fee;

        const { error: updateError } = await this.gameManager.supabase
            .from('market_buy_orders')
            .update({ status: 'CANCELLED' })
            .eq('id', orderId);

        if (updateError) throw updateError;

        this.addClaim(char, {
            type: 'CANCELLED_BUY_ORDER',
            silver: refund,
            itemId: order.item_id,
            name: order.item_data.name,
            timestamp: Date.now()
        });

        await this.gameManager.saveStateCritical(char.id, char.state);
        return { success: true, message: `Buy order cancelled. ${refund.toLocaleString()} Silver returned to Claims.${fee > 0 ? ` (Fee: ${fee.toLocaleString()} Silver)` : ''}` };
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
