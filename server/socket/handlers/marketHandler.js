import { supabase } from "../../services/supabase.js";

export const registerMarketHandlers = (socket, gameManager, io) => {
  socket.on("get_market_listings", async (filters) => {
    try {
      console.log(`[MARKET] Request received from ${socket.user?.id}. Filters:`, filters);
      const result = await gameManager.marketManager.getMarketListings(filters);
      const eventName = (filters && (filters.seller_id || filters.seller_character_id)) ? "my_market_listings_update" : "market_listings_update";
      console.log(`[MARKET] Sending ${eventName} to user. Listings count: ${result.listings?.length}`);
      socket.emit(eventName, result);
    } catch (err) { 
      console.error("[MARKET] Error getting listings:", err);
      socket.emit("error", { message: err.message }); 
    }
  });

  socket.on("get_item_market_price", async ({ itemId }) => {
    try {
      const baseId = itemId.split("::")[0];
      let quality, stars;
      if (itemId.includes("_Q")) quality = parseInt(itemId.split("_Q")[1]);
      if (itemId.includes("_S")) stars = parseInt(itemId.split("_S")[1]);

      const { data: listings } = await supabase.from("market_listings").select("price, amount, item_id, item_data").or(`item_id.eq.${baseId},item_id.like.${baseId}::%`);
      let lowestPrice = null;
      if (listings?.length > 0) {
        const filtered = listings.filter(l => (quality === undefined || l.item_data?.quality === quality) && (stars === undefined || l.item_data?.stars === stars));
        if (filtered.length > 0) lowestPrice = Math.min(...filtered.map(l => Math.floor(l.price / l.amount)));
      }

      const { data: buyOrders } = await supabase.from("market_buy_orders").select("price_per_unit, item_data").eq("item_id", baseId).eq("status", "ACTIVE");
      let highestBuyOrder = null;
      if (buyOrders?.length > 0) {
        const filtered = buyOrders.filter(o => (quality === undefined || o.item_data?.quality === quality) && (stars === undefined || o.item_data?.stars === stars));
        if (filtered.length > 0) highestBuyOrder = Math.max(...filtered.map(o => o.price_per_unit));
      }

      socket.emit("item_market_price", { itemId, lowestPrice, highestBuyOrder });
    } catch (err) {
      console.error("[MARKET PRICE] Error:", err);
      socket.emit("item_market_price", { itemId, lowestPrice: null, highestBuyOrder: null });
    }
  });

  socket.on("list_market_item", async ({ itemId, amount, price, metadata }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.listMarketItem(socket.user.id, socket.data.characterId, itemId, amount, price, metadata);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        io.emit("market_listings_update", await gameManager.marketManager.getMarketListings());
      });
    } catch (err) { 
      socket.emit("error", { message: err.message }); 
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("buy_market_item", async ({ listingId, quantity }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.buyMarketItem(socket.user.id, socket.data.characterId, listingId, quantity);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        io.emit("market_listings_update", await gameManager.marketManager.getMarketListings());
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("cancel_listing", async ({ listingId }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.cancelMarketListing(socket.user.id, socket.data.characterId, listingId);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        io.emit("market_listings_update", await gameManager.getMarketListings());
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("get_buy_orders", async (filters) => {
    try {
      const orders = await gameManager.marketManager.getBuyOrders(filters);
      socket.emit("buy_orders_update", orders);
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("create_buy_order", async ({ itemId, amount, pricePerUnit }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.createBuyOrder(socket.user.id, socket.data.characterId, itemId, amount, pricePerUnit);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        io.emit("buy_orders_update", await gameManager.marketManager.getBuyOrders());
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("fill_buy_order", async ({ orderId, quantity }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.fillBuyOrder(socket.user.id, socket.data.characterId, orderId, quantity);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        io.emit("buy_orders_update", await gameManager.marketManager.getBuyOrders());
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("cancel_buy_order", async ({ orderId }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.marketManager.cancelBuyOrder(socket.user.id, socket.data.characterId, orderId);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
        io.emit("buy_orders_update", await gameManager.marketManager.getBuyOrders());
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("claim_market_item", async ({ claimId }) => {
    try {
      if (socket.user.is_anonymous) throw new Error("Market is locked for Guest accounts.");
      await gameManager.executeLocked(socket.user.id, async () => {
        const result = await gameManager.claimMarketItem(socket.user.id, socket.data.characterId, claimId);
        socket.emit("market_action_success", result);
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      socket.emit("error", { message: err.message });
      try { socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId)); } catch (e) {}
    }
  });

  socket.on("get_market_history", async () => {
    try {
      const history = await gameManager.marketManager.getGlobalHistory();
      socket.emit("market_history_update", history);
    } catch (err) { socket.emit("error", { message: "Failed to fetch market history." }); }
  });

  socket.on("get_my_market_history", async () => {
    try {
      const history = await gameManager.marketManager.getPersonalHistory(socket.user.id);
      socket.emit("my_market_history_update", history);
    } catch (err) { socket.emit("error", { message: "Failed to fetch your market history." }); }
  });
};
