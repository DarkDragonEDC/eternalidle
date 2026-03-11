import express from "express";
import { stripe } from "../services/stripe.js";
import { getStoreItem } from "../../shared/orbStore.js";
import { connectedSockets } from "../socket/registry.js";

export const webhookRoutes = (gameManager, io) => {
  const router = express.Router();

  router.post(
    "/stripe",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      let event;

      if (!stripe) {
        return res.status(503).send("Stripe not configured");
      }

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_secret",
        );
      } catch (err) {
        console.error(`[STRIPE] Webhook Signature Error: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }

      console.log(`[STRIPE] Webhook received: ${event.type}`);

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        let { userId, characterId, orbAmount, packageId } =
          session.metadata || {};

        if (!userId || !characterId) {
          console.error(
            "[STRIPE] Error: Missing critical metadata in session",
            session.metadata,
          );
          return res.json({ received: true, error: "missing_metadata" });
        }

        try {
          await gameManager.executeLocked(userId, async () => {
            const char = await gameManager.getCharacter(
              userId,
              characterId,
              false,
              true,
            );

            if (!char) {
              console.error(
                `[STRIPE] Error: Character ${characterId} not found for user ${userId}`,
              );
              return;
            }

            let result;
            let deliveryMessage = "";

            if (packageId.startsWith("MEMBERSHIP")) {
              const pkg = getStoreItem(packageId);
              const qty = pkg?.membershipQty || 1;
              const added = gameManager.inventoryManager.addItemToInventory(
                char,
                "MEMBERSHIP",
                qty,
              );
              if (added) {
                result = {
                  success: true,
                  message: `${qty}x Membership item${qty > 1 ? "s" : ""} added to inventory!`,
                };
              } else {
                gameManager.marketManager.addClaim(char, {
                  type: "PURCHASED_ITEM",
                  itemId: "MEMBERSHIP",
                  amount: qty,
                  name: `Membership x${qty}`,
                  timestamp: Date.now(),
                });
                result = {
                  success: true,
                  message: `Inventory full! ${qty}x Membership item${qty > 1 ? "s" : ""} sent to Market -> Claims tab.`,
                };
              }
              deliveryMessage = result.message;
            } else {
              result = gameManager.orbsManager.addOrbs(
                char,
                parseInt(orbAmount),
                `STRIPE_${packageId}`,
              );
              deliveryMessage = `Payment confirmed! Added ${orbAmount} Orbs.`;
            }

            if (result.success) {
              await gameManager.saveState(char.id, char.state);
              
              // Notify client via room
              io.to(`user:${userId}`).emit("orb_purchase_success", {
                message: deliveryMessage,
                newBalance: char.state.orbs,
              });
              
              // Trigger a full status update for all user sockets
              const status = await gameManager.getStatus(userId, false, characterId);
              io.to(`user:${userId}`).emit("status_update", status);
              
              console.log(`[STRIPE] Delivery success for ${char.name}`);
            } else {
              console.error(`[STRIPE] delivery failed: ${result.error}`);
            }
          });
        } catch (err) {
          console.error("[STRIPE] Critical Error processing delivery:", err);
        }
      }

      res.json({ received: true });
    },
  );

  return router;
};
