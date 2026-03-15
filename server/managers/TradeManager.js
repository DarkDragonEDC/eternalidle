import { ITEMS, resolveItem, calculateItemSellPrice } from '../../shared/items.js';

export class TradeManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;
    }

    async _getTradeTaxRate(senderId, receiverId) {
        if (!senderId || !receiverId || senderId === 'undefined' || receiverId === 'undefined') return 0.15;
        // Default tax is 15%
        const BASE_TAX = 0.15;

        try {
            // Check if they are Best Friends
            const { data, error } = await this.supabase
                .from('friends')
                .select('is_best_friend, created_at')
                .or(`and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`)
                .eq('status', 'ACCEPTED')
                .maybeSingle();

            if (error || !data || !data.is_best_friend) return BASE_TAX;

            // Calculate days of friendship
            const friendsSince = new Date(data.created_at);
            const daysDiff = Math.floor((Date.now() - friendsSince.getTime()) / (1000 * 60 * 60 * 24));

            // Logic: Base 15%, -2% every 20 days
            if (daysDiff >= 165) return 0;
            if (daysDiff >= 140) return 0.01;
            if (daysDiff >= 120) return 0.03;
            if (daysDiff >= 100) return 0.05;
            if (daysDiff >= 80) return 0.07;
            if (daysDiff >= 60) return 0.09;
            if (daysDiff >= 40) return 0.11;
            if (daysDiff >= 20) return 0.13;

            return BASE_TAX;
        } catch (err) {
            console.error("[TRADE-TAX] Error fetching friendship for tax rate:", err);
            return BASE_TAX;
        }
    }

    calculateOfferTax(offer, rate = 0.15) {
        if (!offer) return 0;
        let totalValue = offer.silver || 0;

        if (offer.items && offer.items.length > 0) {
            offer.items.forEach(it => {
                const def = ITEMS[it.id] || resolveItem(it.id);
                const itemData = { ...def, ...it };
                const pricePerUnit = calculateItemSellPrice(itemData, it.id);
                totalValue += (pricePerUnit * it.amount);
            });
        }

        const tax = Math.floor(totalValue * rate);
        return tax;
    }

    async createTrade(sender, receiverName) {
        // Resolve receiver
        const { data: receiverData, error: searchError } = await this.supabase
            .from('characters')
            .select('*')
            .ilike('name', receiverName)
            .maybeSingle();

        if (searchError || !receiverData) throw new Error(`Player '${receiverName}' not found.`);
        if (receiverData.id === sender.id) throw new Error("You cannot trade with yourself.");

        // Check for Ironman restrictions (Name-based or Flag-based)
        const isSenderIronman = (sender.name.toLowerCase() === 'ironman' || sender.name.toLowerCase().startsWith('[im]')) || sender.state?.isIronman;
        const isReceiverIronman = (receiverData.name.toLowerCase() === 'ironman' || receiverData.name.toLowerCase().startsWith('[im]')) || receiverData.state?.isIronman;

        if (isSenderIronman) throw new Error("Ironman characters cannot trade.");
        if (isReceiverIronman) throw new Error("You cannot trade with an Ironman character.");

        // Check if there's already a pending trade between these two
        const { data: existing } = await this.supabase
            .from('trade_sessions')
            .select('id')
            .eq('status', 'PENDING')
            .or(`and(sender_id.eq.${sender.id},receiver_id.eq.${receiverData.id}),and(sender_id.eq.${receiverData.id},receiver_id.eq.${sender.id})`)
            .maybeSingle();

        if (existing) {
            // Return the existing trade instead of throwing an error
            const existingTrade = await this.getTrade(existing.id);
            return existingTrade;
        }

        // Ensure names are not null
        const sName = sender.name || (sender.state ? sender.state.name : null) || 'Unknown';
        const rName = receiverData.name || (receiverData.state ? receiverData.state.name : null) || 'Unknown';


        const { data, error } = await this.supabase
            .from('trade_sessions')
            .insert({
                sender_id: sender.id,
                receiver_id: receiverData.id,
                sender_name: sName,
                receiver_name: rName,
                status: 'PENDING'
            })
            .select()
            .single();

        if (error) {
            console.error("[TRADE-CREATE] DB Error:", error.message);
            throw error;
        }

        // Return enriched trade data
        return await this.getTrade(data.id);
    }

    async getTrade(tradeId, options = {}) {
        const { skipTax = false, skipNames = false } = options;
        if (!tradeId || tradeId === 'undefined' || tradeId === 'null') throw new Error("Invalid Trade ID");
        
        const { data, error } = await this.supabase
            .from('trade_sessions')
            .select('*')
            .eq('id', tradeId)
            .single();
        if (error) throw error;

        // Inject tax rate for the client
        if (!skipTax) {
            data.tax_rate = await this._getTradeTaxRate(data.sender_id, data.receiver_id);
        }

        // Refresh Names (In case they changed or were 'Unknown')
        if (!skipNames) {
            const { data: chars } = await this.supabase
                .from('characters')
                .select('id, name')
                .in('id', [data.sender_id, data.receiver_id]);

            if (chars) {
                const sMap = new Map(chars.map(c => [c.id, c.name]));
                if (sMap.has(data.sender_id)) data.sender_name = sMap.get(data.sender_id);
                if (sMap.has(data.receiver_id)) data.receiver_name = sMap.get(data.receiver_id);
            }
        }

        return data;
    }

    async updateOffer(char, tradeId, items, silver) {
        // Fetch full trade data to broadcast (including names and tax for UI consistency)
        const updatedTrade = await this.getTrade(tradeId, { skipTax: false, skipNames: false });
        if (updatedTrade.status !== 'PENDING') throw new Error("Trade is no longer active.");

        const isSender = updatedTrade.sender_id === char.id;
        const isReceiver = updatedTrade.receiver_id === char.id;
        if (!isSender && !isReceiver) throw new Error("Not authorized.");

        // Validate items and silver in player's inventory
        if (silver > (char.state.silver || 0)) throw new Error("Insufficient silver.");

        let enrichedItems = [];
        if (items && items.length > 0) {
            const req = {};
            enrichedItems = items.map(it => {
                const baseId = it.id.split('::')[0];
                req[baseId] = (req[baseId] || 0) + it.amount;

                let merged = { ...it };
                const inventoryItem = char.state.inventory[it.id];

                if (inventoryItem && typeof inventoryItem === 'object') {
                    const { amount: stockAmount, ...metadata } = inventoryItem;
                    merged = { ...metadata, ...it };
                }

                if (!merged.name) {
                    const def = ITEMS[baseId] || resolveItem(baseId);
                    if (def) merged.name = def.name;
                }

                return merged;
            });

            if (!this.gameManager.inventoryManager.hasItems(char, req)) {
                throw new Error("Insufficient items in inventory.");
            }
        }

        const updateData = {};
        if (isSender) {
            updateData.sender_offer = { items: enrichedItems, silver };
        } else {
            updateData.receiver_offer = { items: enrichedItems, silver };
        }
        updateData.sender_accepted = false;
        updateData.receiver_accepted = false;
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await this.supabase
            .from('trade_sessions')
            .update(updateData)
            .eq('id', tradeId)
            .select()
            .single();

        if (error) throw error;
        
        // Enrich the updated data with tax (avoiding extra db calls where possible)
        data.tax_rate = updatedTrade.tax_rate;
        // Names are already in updateData or known from previous fetch
        data.sender_name = updatedTrade.sender_name;
        data.receiver_name = updatedTrade.receiver_name;
        
        return data;
    }

    async acceptTrade(char, tradeId) {
        // 1. Update our acceptance first to ensure it's in DB
        const isSender = (await this.getTrade(tradeId)).sender_id === char.id;
        const updateData = {};
        if (isSender) updateData.sender_accepted = true;
        else updateData.receiver_accepted = true;
        updateData.updated_at = new Date().toISOString();

        const { data: updated, error } = await this.supabase
            .from('trade_sessions')
            .update(updateData)
            .eq('id', tradeId)
            .select()
            .single();

        if (error) throw error;
        if (updated.status !== 'PENDING') return await this.getTrade(tradeId);

        // 2. Now check if BOTH are accepted based on the updated DB state
        if (updated.sender_accepted && updated.receiver_accepted) {
            // EXECUTE TRADE
            return await this.executeTrade(tradeId);
        } else {
            // Partial accept - return full trade with names/tax etc
            return await this.getTrade(tradeId);
        }
    }

    async executeTrade(tradeId) {
        const trade = await this.getTrade(tradeId);
        if (trade.status !== 'PENDING') throw new Error("Trade session closed.");

        // We need BOTH players online or at least loaded in cache to manage locks
        // However, if one is offline, we can still process it since we're the server.
        // BUT to prevent race conditions with character state, we should use executeLocked for both.

        return await this.gameManager.executeLocked(trade.sender_id, async () => {
            return await this.gameManager.executeLocked(trade.receiver_id, async () => {
                // Re-fetch characters to ensure fresh state
                const sender = await this.gameManager.getCharacter(null, trade.sender_id, true);
                const receiver = await this.gameManager.getCharacter(null, trade.receiver_id, true);

                if (!sender || !receiver) throw new Error("Error loading characters for trade.");

                // Validate offers again with fresh state
                const sOffer = trade.sender_offer;
                const rOffer = trade.receiver_offer;

                // Calculate Taxes relative to friendship
                const taxRate = await this._getTradeTaxRate(sender.id, receiver.id);
                const sTax = this.calculateOfferTax(sOffer, taxRate);
                const rTax = this.calculateOfferTax(rOffer, taxRate);


                // Validate Silver (Price + Tax)
                if ((sOffer.silver + sTax) > (sender.state.silver || 0)) throw new Error(`${sender.name} has insufficient silver to cover offer + ${taxRate * 100}% tax (${sTax.toLocaleString()} Silver tax).`);
                if ((rOffer.silver + rTax) > (receiver.state.silver || 0)) throw new Error(`${receiver.name} has insufficient silver to cover offer + ${taxRate * 100}% tax (${rTax.toLocaleString()} Silver tax).`);

                // ... item validation ...
                const sItemsReq = {};
                sOffer.items.forEach(it => {
                    const baseId = it.id.split('::')[0];
                    sItemsReq[baseId] = (sItemsReq[baseId] || 0) + it.amount;
                });
                if (!this.gameManager.inventoryManager.hasItems(sender, sItemsReq)) throw new Error(`${sender.name} has insufficient items.`);

                const rItemsReq = {};
                rOffer.items.forEach(it => {
                    const baseId = it.id.split('::')[0];
                    rItemsReq[baseId] = (rItemsReq[baseId] || 0) + it.amount;
                });
                if (!this.gameManager.inventoryManager.hasItems(receiver, rItemsReq)) throw new Error(`${receiver.name} has insufficient items.`);

                // TRANSFER SILVER & CHARGE TAX
                sender.state.silver = (sender.state.silver || 0) - (sOffer.silver + sTax) + rOffer.silver;
                receiver.state.silver = (receiver.state.silver || 0) - (rOffer.silver + rTax) + sOffer.silver;

                // Update Global Taxometer
                if (sTax + rTax > 0) {
                    this.gameManager.updateGlobalTax(sTax + rTax, 'TRADE');
                }

                // CONSUME ITEMS
                this.gameManager.inventoryManager.consumeItems(sender, sItemsReq);
                this.gameManager.inventoryManager.consumeItems(receiver, rItemsReq);

                // ADD ITEMS (Safety via Claims if inventory full)
                const deliver = (targetChar, items, fromName) => {
                    items.forEach(it => {
                        // Pass the full item object to preserve metadata like craftedBy
                        const added = this.gameManager.inventoryManager.addItemToInventory(targetChar, it.id, it.amount, it);

                        if (!added) {
                            // Inventory Full - Send to Claims
                            this.gameManager.marketManager.addClaim(targetChar, {
                                type: 'BOUGHT_ITEM', // Reuse bought item type for simplicity or add 'TRADE_ITEM'
                                itemId: it.id,
                                amount: it.amount,
                                name: `Trade from ${fromName}`,
                                itemData: it, // Store full item data for claim retrieval
                                timestamp: Date.now()
                            });
                        }
                    });
                };

                deliver(sender, rOffer.items, receiver.name);
                deliver(receiver, sOffer.items, sender.name);

                // Update Status
                const { error: updateError } = await this.supabase
                    .from('trade_sessions')
                    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
                    .eq('id', tradeId);

                if (updateError) throw updateError;

                // Persist both immediately
                await this.gameManager.saveStateCritical(sender.id, sender.state);
                await this.gameManager.saveStateCritical(receiver.id, receiver.state);
 
                // --- Record Trade History ---
                try {
                    // Sanitize items: only store essential fields, not full metadata blobs
                    const sanitizeItems = (items) => (items || []).map(it => ({
                        id: it.id,
                        name: it.name || resolveItem(it.id?.split('::')[0])?.name || it.id,
                        amount: it.amount || 1
                    }));

                    const { error: historyError } = await this.supabase
                        .from('trade_history')
                        .insert([{
                            trade_id: tradeId,
                            sender_id: trade.sender_id,
                            receiver_id: trade.receiver_id,
                            sender_name: sender.name,
                            receiver_name: receiver.name,
                            sender_items: sanitizeItems(sOffer.items),
                            sender_silver: sOffer.silver,
                            sender_tax: sTax,
                            receiver_items: sanitizeItems(rOffer.items),
                            receiver_silver: rOffer.silver,
                            receiver_tax: rTax,
                            created_at: new Date().toISOString()
                        }]);
                    if (historyError) {
                        console.error('[TradeManager] Error recording trade history:', historyError);
                    } else {
                        console.log(`[TradeManager] Recorded trade history for trade ${tradeId}`);
                    }
                } catch (historyErr) {
                    console.error('[TradeManager] Exception recording trade history:', historyErr);
                }

                return { success: true, status: 'COMPLETED', trade_id: tradeId, sender_id: trade.sender_id, receiver_id: trade.receiver_id };
            });
        });
    }

    async cancelTrade(char, tradeId) {
        if (!tradeId || tradeId === 'undefined' || tradeId === 'null') throw new Error("Invalid Trade ID");
        const { data, error } = await this.supabase
            .from('trade_sessions')
            .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
            .eq('id', tradeId)
            .or(`sender_id.eq.${char.id},receiver_id.eq.${char.id}`)
            .select('sender_id, receiver_id')
            .single();

        if (error) throw error;
        return { success: true, status: 'CANCELLED', trade_id: tradeId, sender_id: data.sender_id, receiver_id: data.receiver_id };
    }

    async getPersonalTradeHistory(characterId) {
        if (!characterId || characterId === 'undefined') return [];
        const { data, error } = await this.supabase
            .from('trade_history')
            .select('*')
            .or(`sender_id.eq.${characterId},receiver_id.eq.${characterId}`)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;
        return (data || []).map(tx => ({
            ...tx,
            role: tx.sender_id === characterId ? 'SENDER' : 'RECEIVER'
        }));
    }

    async getActiveTrades(characterId) {
        if (!characterId || characterId === 'undefined') return [];
        const { data, error } = await this.supabase
            .from('trade_sessions')
            .select('*')
            .eq('status', 'PENDING')
            .or(`sender_id.eq.${characterId},receiver_id.eq.${characterId}`)
            .order('updated_at', { ascending: false });

        if (error) throw error;
        
        // Enrich with tax rates for the client
        const enriched = await Promise.all((data || []).map(async (trade) => {
            trade.tax_rate = await this._getTradeTaxRate(trade.sender_id, trade.receiver_id);
            return trade;
        }));

        return enriched;
    }
}
