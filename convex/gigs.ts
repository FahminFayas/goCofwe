import { v } from "convex/values";
import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Define the FullGigType directly in the Convex backend
// since we can't import from the frontend types
type FullGigType = Doc<"gigs"> & {
    storageId?: Id<"_storage"> | undefined;
    favorited: boolean;
    offer: Doc<"offers">;
    reviews: Doc<"reviews">[];
    seller: Doc<"users">;
};


export const get = query({
    args: {
        search: v.optional(v.string()),
        favorites: v.optional(v.string()),
        filter: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        const title = args.search?.trim();
        
        let gigs = [];

        // Get initial gigs based on search or get all published gigs
        if (title) {
            gigs = await ctx.db
                .query("gigs")
                .withSearchIndex("search_title", (q) =>
                    q.search("title", title)
                )
                .collect();
        } else {
            gigs = await ctx.db
                .query("gigs")
                .withIndex("by_published", (q) => q.eq("published", true))
                .order("desc")
                .collect();
        }

        // Apply category/subcategory filter if provided
        if (args.filter) {
            const filterTerm = args.filter.trim();
            
            // First try exact match
            const subcategory = await ctx.db
                .query("subcategories")
                .withIndex("by_name", (q) => q.eq("name", filterTerm))
                .unique();

            if (!subcategory) {
                // If no exact match, try case-insensitive search
                const allSubcategories = await ctx.db
                    .query("subcategories")
                    .collect();
                
                const matchingSubcategory = allSubcategories.find(
                    sub => sub.name.toLowerCase() === filterTerm.toLowerCase()
                );

                if (matchingSubcategory) {
                    gigs = gigs.filter(gig => gig.subcategoryId === matchingSubcategory._id);
                } else {
                    // If still no match, try partial matches
                    const matchingSubcategories = allSubcategories.filter(
                        sub => sub.name.toLowerCase().includes(filterTerm.toLowerCase())
                    );
                    
                    if (matchingSubcategories.length > 0) {
                        const subcategoryIds = new Set(matchingSubcategories.map(sub => sub._id));
                        gigs = gigs.filter(gig => subcategoryIds.has(gig.subcategoryId));
                    }
                }
            } else {
                gigs = gigs.filter(gig => gig.subcategoryId === subcategory._id);
            }
        }

        // Handle favorites if user is authenticated
        if (identity) {
            const gigsWithFavorite = await Promise.all(gigs.map(async (gig) => {
                const favorite = await ctx.db
                    .query("userFavorites")
                    .withIndex("by_user_gig", (q) =>
                        q.eq("userId", gig.sellerId)
                            .eq("gigId", gig._id)
                    )
                    .unique();
                
                return {
                    ...gig,
                    favorited: !!favorite,
                };
            }));

            // Filter by favorites if requested
            if (args.favorites === "true") {
                gigs = gigsWithFavorite.filter(gig => gig.favorited);
            } else {
                gigs = gigsWithFavorite;
            }
        }

        // Add additional gig data
        const gigsWithFullData = await Promise.all(gigs.map(async (gig) => {
            const image = await ctx.db
                .query("gigMedia")
                .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                .first();

            const seller = await ctx.db
                .query("users")
                .filter((q) => q.eq(q.field("_id"), gig.sellerId))
                .unique();

            if (!seller) {
                throw new Error("Seller not found");
            }

            const reviews = await ctx.db
                .query("reviews")
                .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                .collect();

            const offer = await ctx.db
                .query("offers")
                .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                .first();

            return {
                ...gig,
                storageId: image?.storageId,
                seller,
                reviews,
                offer
            };
        }));

        return gigsWithFullData;
    },
});

export const getBySellerName = query({
    args: {
        sellerName: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", args.sellerName))
            .unique();

        if (!user) {
            return null;
        }

        const gigs = await ctx.db
            .query("gigs")
            .withIndex("by_sellerId", (q) => q.eq("sellerId", user._id))
            .collect();

        return gigs;
    },
});


export const getGigsWithImages = query({
    args: { sellerUsername: v.string() },
    handler: async (ctx, args) => {

        const seller = await ctx.db.query("users")
            .withIndex("by_username", (q) => q.eq("username", args.sellerUsername))
            .unique();

        if (seller === null) {
            throw new Error("Seller not found");
        }

        const gigs = await ctx.db.query("gigs")
            .withIndex("by_sellerId", (q) => q.eq("sellerId", seller._id))
            .collect();

        if (gigs === null) {
            throw new Error("Gigs not found");
        }

        const gigsWithImages = await Promise.all(gigs.map(async (gig) => {

            // get images
            const images = await ctx.db.query("gigMedia")
                .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                .collect();

            const imagesWithUrls = await Promise.all(images.map(async (image) => {
                const imageUrl = await ctx.storage.getUrl(image.storageId);
                if (!imageUrl) {
                    throw new Error("Image not found");
                }
                return { ...image, url: imageUrl };
            }));

            const gigWithImages = {
                ...gig,
                images: imagesWithUrls,
            };

            return gigWithImages;
        }));

        return gigsWithImages;
    },
});



export const getGigsWithOrderAmountAndRevenue = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (!user) {
            throw new Error("Couldn't authenticate user");
        }

        const gigs = await ctx.db
            .query("gigs")
            .withIndex("by_sellerId", (q) => q.eq("sellerId", user._id))
            .order("desc")
            .collect();

        const gigsWithOrderAmount = await Promise.all(
            gigs.map(async (gig) => {
                const orders = await ctx.db
                    .query("orders")
                    .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                    .collect();

                const orderAmount = orders.length;

                return {
                    ...gig,
                    orderAmount,
                };
            })
        );

        const gigsWithOrderAmountAndRevenue = await Promise.all(
            gigsWithOrderAmount.map(async (gig) => {
                const offers = await ctx.db
                    .query("offers")
                    .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                    .collect();

                const totalRevenue = offers.reduce((acc, offer) => acc + offer.price, 0);

                return {
                    ...gig,
                    totalRevenue,
                };
            })
        );

        // get images
        const gigsFull = await Promise.all(gigsWithOrderAmountAndRevenue.map(async (gig) => {
            const image = await ctx.db
                .query("gigMedia")
                .withIndex("by_gigId", (q) => q.eq("gigId", gig._id))
                .first();

            if (image) {
                const url = await ctx.storage.getUrl(image.storageId);
                return {
                    ...gig,
                    ImageUrl: url
                };
            }
            return {
                ...gig,
                ImageUrl: null
            };
        }));




        return gigsFull
    },
});