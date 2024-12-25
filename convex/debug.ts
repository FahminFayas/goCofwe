// convex/debug.ts
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const logWebhook = internalMutation({
  args: {
    stage: v.string(),
    data: v.any()
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhookLogs", {
      stage: args.stage,
      data: args.data,
      timestamp: Date.now()
    });
  }
});