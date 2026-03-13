export class StatsManager {
    constructor(gameManager) {
        this.gm = gameManager;
        this.supabase = gameManager.supabase;
    }

    async loadGlobalStats() {
        try {
            const { data, error } = await this.supabase
                .from('global_stats')
                .select('*')
                .eq('id', 'global')
                .maybeSingle();

            if (data) {
                this.gm.globalStats = {
                    total_market_tax: Number(data.total_market_tax) || 0,
                    market_tax_total: Number(data.market_tax_total) || 0,
                    trade_tax_total: Number(data.trade_tax_total) || 0,
                    tax_24h_ago: Number(data.tax_24h_ago) || 0,
                    history: Array.isArray(data.history) ? data.history : []
                };

                // CRITICAL: If tax_24h_ago is 0 but we have a total, initialize the baseline 
                if (this.gm.globalStats.tax_24h_ago === 0 && this.gm.globalStats.total_market_tax > 0) {
                    console.log(`[StatsManager] Initializing tax_24h_ago baseline to: ${this.gm.globalStats.total_market_tax}`);
                    this.gm.globalStats.tax_24h_ago = this.gm.globalStats.total_market_tax;

                    if (this.gm.globalStats.market_tax_total < 1000 && this.gm.globalStats.trade_tax_total === 0) {
                        const total = this.gm.globalStats.total_market_tax;
                        this.gm.globalStats.market_tax_total = Math.floor(total * 0.80);
                        this.gm.globalStats.trade_tax_total = Math.floor(total * 0.20);
                    }

                    if (this.gm.onGlobalStatsUpdate) {
                        this.gm.onGlobalStatsUpdate(this.gm.globalStats);
                    }

                    this.supabase
                        .from('global_stats')
                        .update({
                            tax_24h_ago: this.gm.globalStats.tax_24h_ago,
                            market_tax_total: this.gm.globalStats.market_tax_total,
                            trade_tax_total: this.gm.globalStats.trade_tax_total,
                            last_snapshot_at: new Date().toISOString()
                        })
                        .eq('id', 'global')
                        .catch(err => console.error('[DB] Error initializing tax baseline:', err));
                }
            } else if (!error) {
                console.log('[StatsManager] Global stats record missing in DB. Initializing default...');
                this.gm.globalStats = {
                    total_market_tax: 0,
                    market_tax_total: 0,
                    trade_tax_total: 0,
                    tax_24h_ago: 0,
                    history: []
                };

                await this.supabase
                    .from('global_stats')
                    .insert([{
                        id: 'global',
                        total_market_tax: 0,
                        market_tax_total: 0,
                        trade_tax_total: 0,
                        tax_24h_ago: 0,
                        history: [],
                        last_snapshot_at: new Date().toISOString()
                    }]);
            }
        } catch (err) {
            console.error('[DB] Error loading global stats:', err);
        }
    }

    async updateGlobalTax(amount, source = 'MARKET') {
        if (!amount || amount <= 0) return;

        try {
            if (this.gm.statsPromise) await this.gm.statsPromise;

            if (!this.gm.globalStats) {
                console.warn('[StatsManager] Cannot update tax, globalStats not initialized.');
                return;
            }

            const taxAmount = Math.floor(amount);
            this.gm.globalStats.total_market_tax += taxAmount;

            if (source === 'TRADE') {
                this.gm.globalStats.trade_tax_total = (this.gm.globalStats.trade_tax_total || 0) + taxAmount;
            } else {
                this.gm.globalStats.market_tax_total = (this.gm.globalStats.market_tax_total || 0) + taxAmount;
            }

            const updateFields = {
                total_market_tax: this.gm.globalStats.total_market_tax,
                updated_at: new Date().toISOString()
            };

            if (source === 'TRADE') {
                updateFields.trade_tax_total = this.gm.globalStats.trade_tax_total;
            } else {
                updateFields.market_tax_total = this.gm.globalStats.market_tax_total;
            }

            await this.supabase
                .from('global_stats')
                .update(updateFields)
                .eq('id', 'global');

            if (this.gm.onGlobalStatsUpdate) {
                this.gm.onGlobalStatsUpdate(this.gm.globalStats);
            }

        } catch (err) {
            console.error('[DB] Error updating global tax:', err);
        }
    }

    async checkTaxSnapshot() {
        try {
            if (this.gm.statsPromise) await this.gm.statsPromise;

            const { data, error } = await this.supabase
                .from('global_stats')
                .select('*')
                .eq('id', 'global')
                .single();

            if (error) return;

            const now = new Date();
            const lastSnapshotAt = data.last_snapshot_at ? new Date(data.last_snapshot_at) : null;

            const isNewDay = !lastSnapshotAt || (
                now.getUTCDate() !== lastSnapshotAt.getUTCDate() ||
                now.getUTCMonth() !== lastSnapshotAt.getUTCMonth() ||
                now.getUTCFullYear() !== lastSnapshotAt.getUTCFullYear()
            );

            if (isNewDay) {
                const newTotal = Number(data.total_market_tax) || 0;
                const oldTotal = Number(data.tax_24h_ago) || 0;
                const dailyIncrease = Math.max(0, newTotal - oldTotal);

                let history = Array.isArray(data.history) ? data.history : [];
                history.push({
                    date: now.toISOString(),
                    amount: dailyIncrease
                });

                if (history.length > 7) history = history.slice(-7);

                await this.supabase
                    .from('global_stats')
                    .update({
                        tax_24h_ago: newTotal,
                        last_snapshot_at: now.toISOString(),
                        history: history
                    })
                    .eq('id', 'global');

                this.gm.globalStats.tax_24h_ago = newTotal;
                this.gm.globalStats.history = history;

                if (this.gm.onGlobalStatsUpdate) {
                    this.gm.onGlobalStatsUpdate(this.gm.globalStats);
                }
            }
        } catch (err) {
            console.error('[StatsManager] Error in checkTaxSnapshot:', err);
        }
    }
}
