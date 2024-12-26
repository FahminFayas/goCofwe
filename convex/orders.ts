import { v } from "convex/values";
import { query, internalMutation } from "./_generated/server";

export const create = internalMutation({
  args: {
    offerId: v.id("offers"),
    buyerId: v.id("users"),
    sellerId: v.id("users"),
    paymentStatus: v.string(),
    gigId: v.id("gigs"),
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
    throw new Error("getOrdersByGig is no longer needed as 'gigId' is removed from orders.");
  },
});
