import { v } from "convex/values";
import { action, internalAction, ActionCtx } from "./_generated/server";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Type definitions
interface OrderData {
  offerId: Id<"offers">;
  gigId: Id<"gigs">;
  buyerId: Id<"users">;
  sellerId: Id<"users">;
  fulfillmentStatus: string;
  price: number;
  title: string;
  delivery_days: number;
  revisions: number;
  paymentStatus: string;
  stripeSessionId: string;
  orderDate: number;
}

interface PaymentActionResult {
  url: string | null;
}

interface WebhookResult {
  success: boolean;
  orderId?: Id<"orders">;
  message?: string;
  error?: string;
}

// Payment creation action with type annotations
export const pay = action({
  args: {
    priceId: v.string(),
    title: v.string(),
    sellerId: v.id("users"),
    offerId: v.id("offers"),
    gigId: v.id("gigs"),
    buyerId: v.id("users"),
    tier: v.union(v.literal("Basic"), v.literal("Standard"), v.literal("Premium")),
  },
  handler: async (
    ctx: ActionCtx,
    args: {
      priceId: string;
      title: string;
      sellerId: Id<"users">;
      offerId: Id<"offers">;
      gigId: Id<"gigs">;
      buyerId: Id<"users">;
      tier: "Basic" | "Standard" | "Premium";
    }
  ): Promise<PaymentActionResult> => {
    const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    console.log("Starting payment process:", args);

    const domain = process.env.NEXT_PUBLIC_CONVEX_URL || "https://go-cofwe.vercel.app/freelancers";

    const price = await stripe.prices.retrieve(args.priceId);
    if (!price.unit_amount) {
      throw new Error("Price unit amount is missing");
    }

    const stripeAccountId: string | null = await ctx.runQuery(
      internal.users.getStripeAccountId,
      { userId: args.sellerId }
    );

    if (!stripeAccountId) {
      throw new Error("Stripe account not found");
    }

    console.log("Creating checkout session with metadata:", {
      offerId: args.offerId,
      gigId: args.gigId,
      buyerId: args.buyerId,
      sellerId: args.sellerId,
      tier: args.tier,
    });

    const session: Stripe.Checkout.Session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
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
          tier: args.tier,
        },
        payment_intent_data: {
          application_fee_amount: Math.floor(price.unit_amount * 0.1),
        },
        success_url: `${domain}`,
        cancel_url: `${domain}`,
      },
      {
        stripeAccount: stripeAccountId,
      }
    );

    return { url: session.url };
  },
});

// Webhook handler with type annotations
export const handleStripeWebhook = internalAction({
  args: {
    rawBody: v.string(),
    stripeSignature: v.string(),
  },
  handler: async (
    ctx: ActionCtx,
    args: { rawBody: string; stripeSignature: string }
  ): Promise<WebhookResult> => {
    const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    try {
      console.log("Webhook received", {
        timestamp: new Date().toISOString(),
        signatureLength: args.stripeSignature.length,
      });

      const event = stripe.webhooks.constructEvent(
        args.rawBody,
        args.stripeSignature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );

      console.log("Event constructed:", {
        type: event.type,
        id: event.id,
      });

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        
        console.log("Processing completed session:", {
          sessionId: session.id,
          metadata: session.metadata,
        });

        if (!session.metadata) {
          throw new Error("Session metadata is missing");
        }

        const offer = await ctx.runQuery(internal.offers.getOffer, {
          gigId: session.metadata.gigId as Id<"gigs">,
          tier: session.metadata.tier as "Basic" | "Standard" | "Premium",
        });

        console.log("Offer retrieved:", { 
          hasOffer: !!offer,
          offer 
        });

        if (!offer) {
          throw new Error("Offer not found");
        }

        const orderData: OrderData = {
          offerId: session.metadata.offerId as Id<"offers">,
          gigId: session.metadata.gigId as Id<"gigs">,
          buyerId: session.metadata.buyerId as Id<"users">,
          sellerId: session.metadata.sellerId as Id<"users">,
          fulfillmentStatus: "pending",
          price: offer.price,
          title: offer.title,
          delivery_days: offer.delivery_days,
          revisions: offer.revisions,
          paymentStatus: "paid",
          stripeSessionId: session.id,
          orderDate: Date.now(),
        };

        console.log("Creating order with data:", orderData);

        const orderId: Id<"orders"> = await ctx.runMutation(
          internal.orders.create, 
          orderData
        );

        console.log("Order created successfully:", { orderId });

        return { success: true, orderId };
      }

      console.log("Unhandled event type:", event.type);
      return { success: true, message: `Unhandled event type: ${event.type}` };

    } catch (err) {
      console.error("Webhook Error:", {
        error: err instanceof Error ? err.message : "Unknown error",
        stack: err instanceof Error ? err.stack : undefined,
      });

      return { 
        success: false, 
        error: err instanceof Error ? err.message : "Unknown error" 
      };
    }
  },
});
export const addPrice = internalAction({
  args: {
    tier: v.union(
      v.literal("Basic"),
      v.literal("Standard"),
      v.literal("Premium")
    ),
    price: v.number(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.NEXT_STRIPE_SECRET_KEY!, {
      apiVersion: "2023-10-16",
    });

    const price = await stripe.prices.create({
      currency: "usd",
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
      await ctx.runMutation(internal.users.updateStripeSetup, {
        id: args.userId,
        stripeAccountSetupComplete: true,
      });
    } else {
      throw new Error("Stripe account not setup");
    }
  },
});
