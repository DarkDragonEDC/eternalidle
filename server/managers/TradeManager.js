import { ITEMS, resolveItem, calculateItemSellPrice } from '../../shared/items.js';

export class TradeManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.supabase = gameManager.supabase;
    }

    calculateOfferTax(offer) {
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

        const tax = Math.floor(totalValue * 0.15);
        console.log(`[TRADE-TAX] Calculated tax for offer: ${tax} (Items+Silver Value: ${totalValue})`);
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
        const isSenderIronman = (sender.name.toLowerCase() === 'ironman' || sender.name.toLowerCase().includes('[im]')) || sender.is_ironman;
        const isReceiverIronman = (receiverData.name.toLowerCase() === 'ironman' || receiverData.name.toLowerCase().includes('[im]')) || receiverData.is_ironman;

        if (isSenderIronman) throw new Error("Ironman characters cannot trade.");
        if (isReceiverIronman) throw new Error("You cannot trade with an Ironman character.");

        // Check if there's already a pending trade between these two
        const { data: existing } = await this.supabase
            .from('trade_sessions')
            .select('id')
            .eq('status', 'PENDING')
            .or(`and(sender_id.eq.${sender.id},receiver_id.eq.${receiverData.id}),and(sender_id.eq.${receiverData.id},receiver_id.eq.${sender.id})`)
            .maybeSingle();

        if (existing) throw new Error("A trade session already exists with this player.");

        // Ensure names are not null
        const sName = sender.name || (sender.state ? sender.state.name : null) || 'Unknown';
        const rName = receiverData.name || (receiverData.state ? receiverData.state.name : null) || 'Unknown';

        console.log(`[TRADE-CREATE] ${sName} (${sender.id}) inviting ${rName} (${receiverData.id})`);

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
        return data;
    }

    async getTrade(tradeId) {
        if (!tradeId || tradeId === 'undefined' || tradeId === 'null') throw new Error("Invalid Trade ID");
        const { data, error } = await this.supabase
            .from('trade_sessions')
            .select('*')
            .eq('id', tradeId)
            .single();
        if (error) throw error;
        return data;
    }

    async updateOffer(char, tradeId, items, silver) {
        const trade = await this.getTrade(tradeId);
        if (trade.status !== 'PENDING') throw new Error("Trade is no longer active.");

        const isSender = trade.sender_id === char.id;
        const isReceiver = trade.receiver_id === char.id;
        if (!isSender && !isReceiver) throw new Error("Not authorized.");

        // Validate items and silver in player's inventory
        // Validate items and silver in player's inventory
        if (silver > (char.state.silver || 0)) throw new Error("Insufficient silver.");

        let enrichedItems = [];
        if (items && items.length > 0) {
            const req = {};
            enrichedItems = items.map(it => {
                const baseId = it.id.split('::')[0];
                req[baseId] = (req[baseId] || 0) + it.amount;

                // Enrich with Metadata from Inventory
                // The client sends { id, amount }, but we want { id, amount, craftedAt, ... }
                // We trust the client's ID to find the inventory slot.
                const inventoryItem = char.state.inventory[it.id];

                if (inventoryItem && typeof inventoryItem === 'object') {
                    // It's a metadata object in inventory. Merge it.
                    // We must preserve the transaction amount, but take other metadata.
                    // Avoid overwriting 'amount' from the trade offer with 'amount' from inventory (total stock).
                    const { amount: stockAmount, ...metadata } = inventoryItem;
                    return { ...metadata, ...it };
                }

                return it;
            });

            if (!this.gameManager.inventoryManager.hasItems(char, req)) {
                throw new Error("Insufficient items in inventory.");
            }
        } else {
            enrichedItems = [];
        }

        const updateData = {};
        if (isSender) {
            updateData.sender_offer = { items: enrichedItems, silver };
            updateData.sender_accepted = false;
            updateData.receiver_accepted = false; // Reset both as requested
        } else {
            updateData.receiver_offer = { items: enrichedItems, silver };
            updateData.sender_accepted = false;
            updateData.receiver_accepted = false; // Reset both as requested
        }
        updateData.updated_at = new Date().toISOString();

        const { data, error } = await this.supabase
            .from('trade_sessions')
            .update(updateData)
            .eq('id', tradeId)
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async acceptTrade(char, tradeId) {
        const trade = await this.getTrade(tradeId);
        if (trade.status !== 'PENDING') throw new Error("Trade is no longer active.");

        const isSender = trade.sender_id === char.id;
        const isReceiver = trade.receiver_id === char.id;
        if (!isSender && !isReceiver) throw new Error("Not authorized.");

        const updateData = {};
        if (isSender) updateData.sender_accepted = true;
        else updateData.receiver_accepted = true;

        // Check if both accepted now
        const isSelfAccepted = true;
        const isOtherAccepted = isSender ? trade.receiver_accepted : trade.sender_accepted;

        if (isSelfAccepted && isOtherAccepted) {
            // EXECUTE TRADE
            return await this.executeTrade(tradeId);
        } else {
            const { data, error } = await this.supabase
                .from('trade_sessions')
                .update(updateData)
                .eq('id', tradeId)
                .select()
                .single();
            if (error) throw error;
            return data;
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

                // Calculate Taxes
                const sTax = this.calculateOfferTax(sOffer);
                const rTax = this.calculateOfferTax(rOffer);

                console.log(`[TRADE-EXECUTE] ${sender.name} offer: ${sOffer.silver} silver, ${sOffer.items.length} items. Tax: ${sTax}`);
                console.log(`[TRADE-EXECUTE] ${receiver.name} offer: ${rOffer.silver} silver, ${rOffer.items.length} items. Tax: ${rTax}`);

                // Validate Silver (Price + Tax)
                if ((sOffer.silver + sTax) > (sender.state.silver || 0)) throw new Error(`${sender.name} has insufficient silver to cover offer + 15% tax (${sTax.toLocaleString()} Silver tax).`);
                if ((rOffer.silver + rTax) > (receiver.state.silver || 0)) throw new Error(`${receiver.name} has insufficient silver to cover offer + 15% tax (${rTax.toLocaleString()} Silver tax).`);

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
                console.log(`[TRADE-SILVER] Before - ${sender.name}: ${sender.state.silver}, ${receiver.name}: ${receiver.state.silver}`);
                sender.state.silver = (sender.state.silver || 0) - (sOffer.silver + sTax) + rOffer.silver;
                receiver.state.silver = (receiver.state.silver || 0) - (rOffer.silver + rTax) + sOffer.silver;
                console.log(`[TRADE-SILVER] After - ${sender.name}: ${sender.state.silver}, ${receiver.name}: ${receiver.state.silver}`);

                // Update Global Taxometer
                if (sTax + rTax > 0) {
                    console.log(`[TRADE-TAX] Updating global tax with: ${sTax + rTax}`);
                    this.gameManager.updateGlobalTax(sTax + rTax, 'TRADE');
                } else {
                    console.log(`[TRADE-TAX] No tax to update (sTax: ${sTax}, rTax: ${rTax})`);
                }

                // CONSUME ITEMS
                this.gameManager.inventoryManager.consumeItems(sender, sItemsReq);
                this.gameManager.inventoryManager.consumeItems(receiver, rItemsReq);

                // ADD ITEMS (Safety via Claims if inventory full)
                const deliver = (targetChar, items, fromName) => {
                    console.log(`[TRADE-DEBUG] Delivering items to ${targetChar.name} from ${fromName}`);
                    items.forEach(it => {
                        console.log(`[TRADE-DEBUG] Processing item:`, JSON.stringify(it));
                        // Pass the full item object to preserve metadata like craftedBy
                        const added = this.gameManager.inventoryManager.addItemToInventory(targetChar, it.id, it.amount, it);
                        console.log(`[TRADE-DEBUG] Added to inventory? ${added}`);

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

                // Persist both
                await this.gameManager.saveState(sender.id, sender.state);
                await this.gameManager.saveState(receiver.id, receiver.state);

                this.gameManager.markDirty(sender.id);
                this.gameManager.markDirty(receiver.id);

                return { success: true, status: 'COMPLETED', sender_id: trade.sender_id, receiver_id: trade.receiver_id };
            });
        });
    }

    async cancelTrade(char, tradeId) {
        if (!tradeId || tradeId === 'undefined' || tradeId === 'null') throw new Error("Invalid Trade ID");
        const { error } = await this.supabase
            .from('trade_sessions')
            .update({ status: 'CANCELLED', updated_at: new Date().toISOString() })
            .eq('id', tradeId)
            .or(`sender_id.eq.${char.id},receiver_id.eq.${char.id}`);

        if (error) throw error;
        return { success: true, status: 'CANCELLED' };
    }
}
