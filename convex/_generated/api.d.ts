/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as board from "../board.js";
import type * as boards from "../boards.js";
import type * as categories from "../categories.js";
import type * as conversations from "../conversations.js";
import type * as debug from "../debug.js";
import type * as gig from "../gig.js";
import type * as gigMedia from "../gigMedia.js";
import type * as gigs from "../gigs.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as offers from "../offers.js";
import type * as orders from "../orders.js";
import type * as reviews from "../reviews.js";
import type * as seedCategories from "../seedCategories.js";
import type * as seedSubcategories from "../seedSubcategories.js";
import type * as skills from "../skills.js";
import type * as stripe from "../stripe.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  board: typeof board;
  boards: typeof boards;
  categories: typeof categories;
  conversations: typeof conversations;
  debug: typeof debug;
  gig: typeof gig;
  gigMedia: typeof gigMedia;
  gigs: typeof gigs;
  http: typeof http;
  messages: typeof messages;
  offers: typeof offers;
  orders: typeof orders;
  reviews: typeof reviews;
  seedCategories: typeof seedCategories;
  seedSubcategories: typeof seedSubcategories;
  skills: typeof skills;
  stripe: typeof stripe;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
