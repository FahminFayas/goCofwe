// convex/stripe.ts
import { v } from "convex/values";
import { action, internalAction } from "./_generated/server";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

export const handleStripeWebhook = action({
  args: {
    rawBody: v.string(),
    stripeSignature: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        args.rawBody,
        args.stripeSignature,
        webhookSecret
      );
    } catch (err) {
      console.error("Webhook signature verification failed.");
      throw new Error("Webhook signature verification failed.");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (!session.metadata) {
        throw new Error("No metadata found in session");
      }

      const offerId = session.metadata.offerId as Id<"offers">;
      const gigId = session.metadata.gigId as Id<"gigs">;
      const buyerId = session.metadata.buyerId as Id<"users">;
      const sellerId = session.metadata.sellerId as Id<"users">;
      const tier = session.metadata.tier as "Basic" | "Standard" | "Premium";

      if (!offerId || !gigId || !buyerId || !sellerId || !tier) {
        throw new Error("Missing required metadata in session");
      }

      // Get the offer details
      const offer = await ctx.runQuery(internal.offers.getOffer, { 
        gigId, 
        tier 
      });
      
      if (!offer) {
        throw new Error("Offer not found");
      }

      // Create order with full details
      await ctx.runMutation(internal.orders.create, {
        offerId,
        gigId,
        buyerId,
        sellerId,
        fulfillmentStatus: "pending",
        price: offer.price,
        title: offer.title,
        delivery_days: offer.delivery_days,
        revisions: offer.revisions,
        paymentStatus: "paid",
        stripeSessionId: session.id,
      });
    }

    return { success: true };
  },
});

// Update pay action to include tier in metadata
export const pay = action({
  args: { 
    priceId: v.string(), 
    title: v.string(), 
    sellerId: v.id("users"),
    offerId: v.id("offers"),
    gigId: v.id("gigs"),
    buyerId: v.id("users"),
    tier: v.union(v.literal("Basic"), v.literal("Standard"), v.literal("Premium"))
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    const domain = `https://go-cofwe.vercel.app/freelancers`;

    const price = await stripe.prices.retrieve(args.priceId);

    if (price.unit_amount === null) {
      throw new Error("Error: Stripe price doesn't have unit_amount.");
    }

    const stripeAccountId: string | null = await ctx.runQuery(
      internal.users.getStripeAccountId, 
      { userId: args.sellerId }
    );

    if (stripeAccountId === null) {
      throw new Error("Error: Stripe account not found.");
    }

    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: args.title,
              },
              unit_amount: price.unit_amount,
            },
            quantity: 1,
          },
        ],
        metadata: {
          offerId: args.offerId,
          gigId: args.gigId,
          buyerId: args.buyerId,
          sellerId: args.sellerId,
          tier: args.tier,  // Added tier to metadata
        },
        payment_intent_data: {
          application_fee_amount: price.unit_amount * 0.1,
        },
        success_url: `${domain}`,
        cancel_url: `${domain}`,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    return session.url;
  },
});
export const addPrice = internalAction({
    args: {
        tier: v.union(v.literal("Basic"), v.literal("Standard"), v.literal("Premium")),
        price: v.number(),
        title: v.string(),
    },
    handler: async (ctx, args) => {
        const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
            apiVersion: "2023-10-16",
        });

        const price = await stripe.prices.create({
            currency: 'usd',
            unit_amount: args.price * 100,
            product_data: {
                name: "[" + args.tier + "] " + args.title,
            },
        });

        return price;
    },
});


export const setStripeAccountSetupComplete = action({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
            apiVersion: "2023-10-16",
        });

        const user = await ctx.runQuery(api.users.get, { id: args.userId });
        if (!user) {
            throw new Error("User not found");
        }

        if (!user.stripeAccountId) {
            throw new Error("Stripe account not found");
        }

        const account = await stripe.accounts.retrieve(user.stripeAccountId);

        if (account.charges_enabled) {
            await ctx.runMutation(internal.users.updateStripeSetup, { id: args.userId, stripeAccountSetupComplete: true });
        }
        else {
            throw new Error("Stripe account not setup");
        }
    },
});