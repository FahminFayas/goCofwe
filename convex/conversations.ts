import { v } from "convex/values";
import { mutation, query } from "./_generated/server";


import { Doc, Id } from "./_generated/dataModel";

type MessageWithUser = Doc<"messages"> & {
    user: Doc<"users">;
};

type ConversationResponse = {
    currentUser: Doc<"users">;
    otherUser: Doc<"users">;
    conversation: Doc<"conversations">;
    messagesWithUsers: MessageWithUser[];
};

export const getByUser = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        // current user
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();
        if (!currentUser) {
            throw new Error("Couldn't authenticate user");
        }

        const conversations = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.or(
                    q.eq(q.field("participantOneId"), currentUser._id),
                    q.eq(q.field("participantTwoId"), currentUser._id)
                )
            )
            .collect();
        return conversations;
    }
});



export const getConversation = query({
    args: { username: v.string() },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        // current user
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();
        if (!currentUser) {
            throw new Error("Couldn't authenticate user");
        }

        // other user
        const otherUser = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.username))
            .unique();

        const conversation = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.or(
                    q.and(
                        q.eq(q.field("participantOneId"), currentUser._id),
                        q.eq(q.field("participantTwoId"), otherUser?._id)
                    ),
                    q.and(
                        q.eq(q.field("participantOneId"), otherUser?._id),
                        q.eq(q.field("participantTwoId"), currentUser._id)
                    )
                )
            )
            .unique();

        const messages = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("conversationId"), conversation?._id))
            .collect();

        const messagesWithUsersRelation = messages.map(async (message: any) => {
            const user = await ctx.db.query("users")
                .filter((q: any) => q.eq(q.field("_id"), message.userId))
                .unique();
            return {
                ...message,
                user
            }
        });

        const messagesWithUsers = await Promise.all(messagesWithUsersRelation);

        return {
            currentUser,
            otherUser,
            conversation,
            messagesWithUsers
        };
    }
});




export const getOrCreateConversation = mutation({
    args: { otherUsername: v.string() },
    handler: async (ctx, args): Promise<ConversationResponse> => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!currentUser) {
            throw new Error("Couldn't authenticate user");
        }

        const otherUser = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.otherUsername))
            .unique();

        if (!otherUser) {
            throw new Error("User not found");
        }

        let conversation = await ctx.db
            .query("conversations")
            .filter((q) =>
                q.or(
                    q.and(
                        q.eq(q.field("participantOneId"), currentUser._id),
                        q.eq(q.field("participantTwoId"), otherUser._id)
                    ),
                    q.and(
                        q.eq(q.field("participantOneId"), otherUser._id),
                        q.eq(q.field("participantTwoId"), currentUser._id)
                    )
                )
            )
            .unique();

        if (!conversation) {
            const conversationId = await ctx.db.insert("conversations", {
                participantOneId: currentUser._id,
                participantTwoId: otherUser._id,
            });

            conversation = await ctx.db.get(conversationId);
            
            if (!conversation) {
                throw new Error("Failed to create conversation");
            }
        }

        const messages = await ctx.db
            .query("messages")
            .filter((q) => q.eq(q.field("conversationId"), conversation._id))
            .collect();

        const messagesWithUsers = await Promise.all(
            messages.map(async (message) => {
                const user = await ctx.db
                    .query("users")
                    .filter((q) => q.eq(q.field("_id"), message.userId))
                    .unique();

                if (!user) {
                    throw new Error("Message user not found");
                }

                return {
                    ...message,
                    user,
                } as MessageWithUser;
            })
        );

        return {
            currentUser,
            otherUser,
            conversation,
            messagesWithUsers,
        };
    },
});