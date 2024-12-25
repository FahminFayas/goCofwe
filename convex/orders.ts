// convex\orders.ts
import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const create = internalMutation({
  args: {
    offerId: v.id("offers"),
    gigId: v.id("gigs"),
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    fulfillmentStatus: v.string(),
    price: v.number(),
    title: v.string(),
    delivery_days: v.number(),
    revisions: v.number(),
    paymentStatus: v.string(),
    stripeSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("orders", {
      ...args,
      orderDate: Date.now(),
    });
  },
});

export const getOrdersByBuyer = query({
    args: { buyerId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("orders")
            .withIndex("by_buyerId", (q) => q.eq("buyerId", args.buyerId))
            .collect();
    },
});

export const getOrdersByGig = query({
    args: { gigId: v.id("gigs") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("orders")
            .withIndex("by_gigId", (q) => q.eq("gigId", args.gigId))
            .collect();
    },
});