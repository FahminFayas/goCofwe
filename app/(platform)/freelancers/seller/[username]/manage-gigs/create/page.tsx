"use client";

import { CreateForm } from "./_components/create-form";
// import { useMutation } from "convex/react";
// import { api } from "@/convex/_generated/api";
// import { use, useEffect } from "react";

interface CreateGigProps {
    params: {
        username: string;
    }
}

const CreateGig = ({
    params
}: CreateGigProps) => {
    // const insertSubcategories = useMutation(api.seedSubcategories.create);
    // useEffect(() => {
    //     insertSubcategories({}); // seed subcategories
    // });
    return (
        <div className="flex justify-center">
            <CreateForm
                username={params.username}
            />
        </div>
    );
}
export default CreateGig;