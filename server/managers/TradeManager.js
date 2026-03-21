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
                .select('id, name, guild_members(guilds(tag))')
                .in('id', [data.sender_id, data.receiver_id]);

            if (chars) {
                const sMap = new Map(chars.map(c => [c.id, c.name]));
                const tagMap = new Map(chars.map(c => {
                    const gm = Array.isArray(c.guild_members) ? c.guild_members[0] : c.guild_members;
                    return [c.id, gm?.guilds?.tag || null];
                }));
                
                if (sMap.has(data.sender_id)) data.sender_name = sMap.get(data.sender_id);
                if (sMap.has(data.receiver_id)) data.receiver_name = sMap.get(data.receiver_id);

                if (tagMap.has(data.sender_id)) data.sender_guild_tag = tagMap.get(data.sender_id);
                if (tagMap.has(data.receiver_id)) data.receiver_guild_tag = tagMap.get(data.receiver_id);
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

            const missing = this.gameManager.inventoryManager.getMissingItems(char, req);
            if (missing.length > 0) {
                const m = missing[0];
                throw new Error(`Insufficient items: ${m.amountNeeded}x ${m.name} (You have: ${m.amountOwned})`);
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

                if (!sender || !receiver) {
                    console.error(`[TradeManager:executeTrade] Character loading failed: sender=${sender? 'Found':'NOT FOUND'}, receiver=${receiver? 'Found':'NOT FOUND'}`);
                    throw new Error("Error loading characters for trade.");
                }

                console.log(`[TradeManager:executeTrade] ${tradeId} - Validating silver and items for ${sender.name} and ${receiver.name}`);

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
                const sMissing = this.gameManager.inventoryManager.getMissingItems(sender, sItemsReq);
                if (sMissing.length > 0) {
                    const m = sMissing[0];
                    throw new Error(`${sender.name} has insufficient items: ${m.amountNeeded}x ${m.name} (Has: ${m.amountOwned})`);
                }

                const rItemsReq = {};
                rOffer.items.forEach(it => {
                    const baseId = it.id.split('::')[0];
                    rItemsReq[baseId] = (rItemsReq[baseId] || 0) + it.amount;
                });
                const rMissing = this.gameManager.inventoryManager.getMissingItems(receiver, rItemsReq);
                if (rMissing.length > 0) {
                    const m = rMissing[0];
                    throw new Error(`${receiver.name} has insufficient items: ${m.amountNeeded}x ${m.name} (Has: ${m.amountOwned})`);
                }

                // TRANSFER SILVER (Tax is already charged in acceptTrade)
                sender.state.silver = (sender.state.silver || 0) - sOffer.silver + rOffer.silver;
                receiver.state.silver = (receiver.state.silver || 0) - rOffer.silver + sOffer.silver;

                // Update Global Taxometer
                if (sTax + rTax > 0) {
                    this.gameManager.updateGlobalTax(sTax + rTax, 'TRADE');
                }

                // CONSUME ITEMS
                console.log(`[TradeManager:executeTrade] ${tradeId} - Consuming items from sender and receiver`);
                this.gameManager.inventoryManager.consumeItems(sender, sItemsReq);
                this.gameManager.inventoryManager.consumeItems(receiver, rItemsReq);

                // ADD ITEMS (Safety via Claims if inventory full)
                console.log(`[TradeManager:executeTrade] ${tradeId} - Delivering items to sender and receiver`);
                const deliver = (targetChar, items, fromName) => {
                    items.forEach(it => {
                        // Only pass metadata if it has unique properties (craftedBy, quality, stars, enhancement)
                        // This prevents standard stackables (Plank, Food, Potions) from becoming objects unnecessarily.
                        const hasMetadata = it.craftedBy || it.quality > 0 || it.stars > 0 || it.enhancement > 0;
                        const added = this.gameManager.inventoryManager.addItemToInventory(targetChar, it.id, it.amount, hasMetadata ? it : null);

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

                            // Notify the receiver about the claim
                            this.gameManager.addNotification(targetChar, 'MARKET', `Inventory Full: ${it.amount}x ${it.name} sent to Market -> Claims.`);
                        }
                    });
                };

                deliver(sender, rOffer.items, receiver.name);
                deliver(receiver, sOffer.items, sender.name);

                // Add general success notifications
                this.gameManager.addNotification(sender, 'TRADE', `Trade with ${receiver.name} completed.`);
                this.gameManager.addNotification(receiver, 'TRADE', `Trade with ${sender.name} completed.`);

                // Update Status
                const { error: updateError } = await this.supabase
                    .from('trade_sessions')
                    .update({ status: 'COMPLETED', updated_at: new Date().toISOString() })
                    .eq('id', tradeId);

                if (updateError) {
                    console.error(`[TradeManager:executeTrade] ${tradeId} - Database update failed:`, updateError);
                    throw updateError;
                }

                console.log(`[TradeManager:executeTrade] ${tradeId} - Persisting sender and receiver states`);
                // Persist both immediately
                await this.gameManager.saveStateCritical(sender.id, sender.state);
                await this.gameManager.saveStateCritical(receiver.id, receiver.state);
                console.log(`[TradeManager:executeTrade] ${tradeId} - SUCCESS! Trade completed.`);
 
                // --- Record Trade History with Anti-Boosting logic ---
                try {
                    const sanitizeItems = (items) => (items || []).map(it => {
                        const baseId = it.id?.split('::')[0];
                        const def = resolveItem(baseId);
                        return {
                            id: it.id,
                            name: it.name || def?.name || it.id,
                            amount: it.amount || 1,
                            tier: it.tier || def?.tier || 1,
                            stars: it.stars || 0
                        };
                    });

                    const senderIP = await this.gameManager.getUserIP(trade.sender_id);
                    const receiverIP = await this.gameManager.getUserIP(trade.receiver_id);

                    const valSender = this.calculateOfferTax(sOffer, 1.0); // Abuse tax calc for total value (rate=1.0)
                    const valReceiver = this.calculateOfferTax(rOffer, 1.0);

                    let isSuspicious = false;
                    let suspicionReason = "";

                    // 1. Same IP Check (Multi-account boosting)
                    if (senderIP !== 'unknown' && senderIP === receiverIP) {
                        isSuspicious = true;
                        suspicionReason = "IP MATCH (Multi-account); ";
                    }

                    // 2. High Value Imbalance Check (One-sided trade)
                    const totalTradeValue = valSender + valReceiver;
                    if (totalTradeValue > 10000) { // Only flag significant trades
                        const gap = Math.abs(valSender - valReceiver);
                        const gapPercent = gap / Math.max(valSender, valReceiver, 1);
                        
                        if (gapPercent > 0.9) {
                            // Check if they are long-term best friends
                            const taxRate = await this._getTradeTaxRate(trade.sender_id, trade.receiver_id);
                            if (taxRate > 0.05) { // Not even close to max friendship (0%)
                                isSuspicious = true;
                                suspicionReason += `ONE-SIDED TRADE (${(gapPercent * 100).toFixed(0)}% imbalance); `;
                            }
                        }
                    }

                    // 3. Multi-stage Boosting Check (48h Flow)
                    if (!isSuspicious && totalTradeValue > 50000) {
                        const { data: recentHistory } = await this.supabase
                            .from('trade_history')
                            .select('sender_id, total_value_sender, total_value_receiver')
                            .or(`and(sender_id.eq.${trade.sender_id},receiver_id.eq.${trade.receiver_id}),and(sender_id.eq.${trade.receiver_id},receiver_id.eq.${trade.sender_id})`)
                            .gte('created_at', new Date(Date.now() - 48 * 3600000).toISOString());

                        if (recentHistory && recentHistory.length >= 2) {
                            let netFlow = 0; // Relative to sender_id
                            recentHistory.forEach(h => {
                                if (h.sender_id === trade.sender_id) netFlow += (h.total_value_sender - h.total_value_receiver);
                                else netFlow += (h.total_value_receiver - h.total_value_sender);
                            });
                            // Add current trade
                            netFlow += (valSender - valReceiver);

                            if (Math.abs(netFlow) > 1000000) { // Flag if net flow > 1M silver value in 48h
                                isSuspicious = true;
                                suspicionReason += "ACCUMULATED FLOW > 1M (48h); ";
                            }
                        }
                    }

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
                            sender_ip: senderIP,
                            receiver_ip: receiverIP,
                            total_value_sender: valSender,
                            total_value_receiver: valReceiver,
                            is_suspicious: isSuspicious,
                            suspicion_reason: suspicionReason.trim() || null,
                            created_at: new Date().toISOString()
                        }]);

                    if (historyError) console.error('[TradeManager] Error recording trade history:', historyError);
                    if (isSuspicious) console.log(`[ANTI-BOOST] Suspicious trade ${tradeId} flagged: ${suspicionReason}`);

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
