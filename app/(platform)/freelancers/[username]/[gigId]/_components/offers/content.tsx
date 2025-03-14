// app\(platform)\freelancers\[username]\[gigId]\_components\offers\content.tsx
import { Loading } from "@/components/auth/loading"
import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api"
import { Doc, Id } from "@/convex/_generated/dataModel"
import { useAction, useQuery } from "convex/react"
import { Clock, RefreshCcw } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface OffersProps {
    offer: Doc<"offers">
    sellerId: Id<"users">
    editUrl: string
}

export const Content = ({
    offer,
    sellerId,
    editUrl
}: OffersProps) => {
    const orderNow = useAction(api.stripe.pay);
    const router = useRouter();
    const currentUser = useQuery(api.users.getCurrentUser);
    const seller = useQuery(api.users.get, { id: sellerId });

    if (currentUser === undefined || seller === undefined) return <Loading />;

    if (seller === null) return <div>Not found</div>;

    const handleOrderNow = async () => {
        try {
          if (!currentUser) {
            toast.error("Please log in to place an order");
            return;
          }
      
          const result = await orderNow({
            priceId: offer.stripePriceId,
            title: offer.title,
            sellerId,
            offerId: offer._id,
            gigId: offer.gigId,
            buyerId: currentUser._id,
            tier: offer.tier  // Add this line
          });
      
          if (!result.url) throw new Error("Error: Stripe session error.");
          router.push(result.url);
        } catch (error: unknown) {
          if (error instanceof Error) {
            toast.error(error.message);
          } else {
            toast.error("An unknown error occurred.");
          }
        }
      };

    const handleSendMessage = () => {
        router.push(`/freelancers/inbox/${seller.username}`);
    }

    const revisionText = offer.revisions === 1 ? "Revision" : "Revisions";
    return (
        <div className="space-y-4 bg-white">
            <div className="flex pb-4 font-bold items-center">
                <h1>{offer.title}</h1>
                <p className="ml-auto text-2xl">${offer.price}</p>
            </div>
            <p>{offer.description}</p>
            <div className="flex flex-col font-semibold text-zinc-700 space-y-2">
                <div className="flex space-x-2">
                    <Clock />
                    <p>{offer.delivery_days} Days Delivery</p>
                </div>
                <div className="flex space-x-2">
                    <RefreshCcw />
                    <p>{offer.revisions} {revisionText}</p>
                </div>
            </div>
            {(currentUser?._id !== sellerId) && (
                <>
                    <Button className="w-full" onClick={handleOrderNow}>Pay Now</Button>
                    <Button className="w-full" onClick={handleSendMessage} variant={"ghost"}>Send Message</Button>
                </>
            )}
            {(currentUser?._id === sellerId) && (
                <Button className="w-full">
                    <Link href={editUrl}>
                        Edit
                    </Link>
                </Button>
            )}
        </div>
    )
}