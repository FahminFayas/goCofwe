// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

http.route({
  path: "/stripe",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const signature = request.headers.get("stripe-signature");
      if (!signature) {
        return new Response("No signature", { status: 400 });
      }

      const payload = await request.text();
      
      // Log webhook receipt
      await ctx.runMutation(internal.debug.logWebhook, {
        stage: "received",
        data: { 
          timestamp: new Date().toISOString(),
          hasSignature: !!signature,
          payloadLength: payload.length 
        }
      });

      const result = await ctx.runAction(internal.stripe.handleStripeWebhook, {
        rawBody: payload,
        stripeSignature: signature,
      });

      return new Response(null, { status: 200 });
    } catch (error) {
      console.error("Webhook Error:", error);
      return new Response(
        JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), 
        { status: 400 }
      );
    }
  }),
});

export default http;