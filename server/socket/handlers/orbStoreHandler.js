import { getAllStoreItems, getStoreItem } from "../../../shared/orbStore.js";
import Stripe from "stripe";
import dotenv from "dotenv";
dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export const registerOrbStoreHandlers = (socket, gameManager, io) => {
  socket.on("get_orb_store", async () => {
    try {
      const items = getAllStoreItems();
      socket.emit("orb_store_update", items);
    } catch (err) {
      console.error("Error getting crown store:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("purchase_orb_item", async ({ itemId, quantity }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const qty = Math.max(1, Math.min(Math.floor(Number(quantity) || 1), 100));
        let lastResult = null;
        let successCount = 0;

        for (let i = 0; i < qty; i++) {
          const result = await gameManager.orbsManager.purchaseItem(char, itemId);
          lastResult = result;
          if (!result.success) break;
          successCount++;
        }

        if (successCount > 0) {
          await gameManager.saveState(char.id, char.state);
          socket.emit("orb_purchase_success", {
            ...lastResult,
            success: true,
            message: successCount > 1
              ? `Successfully purchased x${successCount}!`
              : (lastResult.message || 'Purchase successful!')
          });
        } else {
          socket.emit("orb_purchase_error", lastResult);
        }

        socket.emit("status_update", await gameManager.getStatus(socket.user.id, true, socket.data.characterId));
      });
    } catch (err) {
      console.error("Error purchasing crown item:", err);
      socket.emit("error", { message: err.message });
    }
  });

  socket.on("buy_orb_package", async ({ packageId, locale }) => {
    try {
      if (!stripe) return socket.emit("orb_purchase_error", { error: "Payments are not configured on this server." });
      
      await gameManager.executeLocked(socket.user.id, async () => {
        const pkg = getStoreItem(packageId);
        if (!pkg) return socket.emit("orb_purchase_error", { error: "Package not found" });

        const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
        const isBR = (locale || "").toLowerCase().startsWith("pt");
        const currency = isBR && pkg.priceBRL ? "brl" : "usd";
        const unitAmount = currency === "brl" ? Math.round(pkg.priceBRL * 100) : Math.round(pkg.price * 100);

        const paymentMethodTypes = currency === "brl" ? ["card", "boleto"] : undefined;
        const sessionConfig = {
          line_items: [{
            price_data: {
              currency,
              product_data: {
                name: pkg.name,
                description: pkg.description,
                images: ["https://raw.githubusercontent.com/lucide-react/lucide/main/icons/gem.svg"],
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }],
          mode: "payment",
          success_url: `${CLIENT_URL}/?payment=success&package=${packageId}`,
          cancel_url: `${CLIENT_URL}/?payment=cancel`,
          metadata: { userId: socket.user.id, characterId: socket.data.characterId, packageId: packageId, orbAmount: pkg.amount || 0 },
        };

        if (paymentMethodTypes) sessionConfig.payment_method_types = paymentMethodTypes;
        const session = await stripe.checkout.sessions.create(sessionConfig);
        socket.emit("stripe_checkout_session", { url: session.url });
      });
    } catch (err) {
      console.error("Error creating checkout session:", err);
      socket.emit("orb_purchase_error", { error: err.message || "Failed to initiate payment" });
    }
  });

  socket.on("get_orb_balance", async () => {
    try {
      const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
      const balance = gameManager.orbsManager.getOrbs(char);
      socket.emit("orb_balance_update", { orbs: balance });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });

  socket.on("admin_add_orbs", async ({ amount }) => {
    try {
      await gameManager.executeLocked(socket.user.id, async () => {
        const char = await gameManager.getCharacter(socket.user.id, socket.data.characterId);
        const result = gameManager.orbsManager.addOrbs(char, amount, "ADMIN");
        if (result.success) {
          await gameManager.saveState(char.id, char.state);
          socket.emit("orb_balance_update", { orbs: result.newBalance });
        }
        socket.emit("status_update", await gameManager.getStatus(socket.user.id, false, socket.data.characterId));
      });
    } catch (err) { socket.emit("error", { message: err.message }); }
  });
};
