import { Doc, Id } from "../convex/_generated/dataModel";

export type ImageWithUrlType = Doc<"gigMedia"> & {
    url: string
};

export type FullGigType = Doc<"gigs"> & {
    storageId?: Id<"_storage"> | undefined;
    favorited: boolean;
    offer: Doc<"offers">;
    reviews: Doc<"reviews">[];
    seller: Doc<"users">;
}

export type MessageWithUserType = {
    user: Doc<"users">;
} & Doc<"messages">;

export type ConversationType = {
    currentUser: Doc<"users">;
    otherUser: Doc<"users">;
    conversation: Doc<"conversations">;
    messagesWithUsers: MessageWithUserType[];
};

export type GigWithImageType = Doc<"gigs"> & {
    images: Doc<"gigMedia">[]
};


export type UserWithCountryType = Doc<"users"> & {
    country: Doc<"countries"> | null;
    languages: Doc<"languages">[];
};

export type ReviewFullType = Doc<"reviews"> & {
    author: UserWithCountryType
    image: ImageWithUrlType
    offers: Doc<"offers">[]
    gig: Doc<"gigs">
};

export type CategoriesFullType = Doc<"categories"> & {

};