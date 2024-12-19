"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
// import { Doc } from "@/convex/_generated/dataModel";
import Body from "./_components/body";
import Form from "./_components/form";
import { ConversationType } from "@/types";

interface FormProps {
    params: {
        otherUserName: string;
    };
}

const ConversationPage = ({ params }: FormProps) => {
    const [conversationData, setConversationData] = useState<ConversationType | null>(null);
    
    const get = useMutation(api.conversations.getOrCreateConversation);
    const conv = useQuery(api.conversations.getConversation, { 
        username: params.otherUserName 
    });

    useEffect(() => {
        const callMutation = async () => {
            try {
                const result = await get({ otherUsername: params.otherUserName });
                setConversationData(result);
            } catch (error) {
                console.error('Mutation failed:', error);
            }
        };

        callMutation();
    }, [get, params.otherUserName]);

    if (conversationData === null || conv === undefined) {
        return (
            <div className="text-center text-muted-foreground text-3xl font-semibold p-4 animation-pulse">
                Loading...
            </div>
        );
    }

    return (
        <div className="h-full">
            <div className="h-full flex flex-col">
                <Body messages={conv.messagesWithUsers} />
                <Form
                    userId={conversationData.currentUser._id}
                    conversationId={conversationData.conversation._id}
                />
            </div>
        </div>
    );
};

export default ConversationPage;