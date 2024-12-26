"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import qs from "query-string";
import { ChangeEvent, useEffect } from "react";
import { useDebounceValue } from "usehooks-ts";

export const SearchInput = () => {
    const router = useRouter();
    const [value, setValue] = useDebounceValue("", 500);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "f" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                const input = document.querySelector("input");
                input?.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    useEffect(() => {
        const url = qs.stringifyUrl(
            {
                url: "/freelancers", // Update the URL path as needed
                query: {
                    search: value,
                },
            },
            {
                skipEmptyString: true,
                skipNull: true,
            }
        );

        if (value) {
            router.push(url);
        }
    }, [value, router]);

    return (
        <div className="w-full relative flex">
            <Search className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
                className="w-full pl-9"
                placeholder="Search gigs..." // Change the placeholder as needed
                onChange={handleChange}
                value={value}
            />
            <Button onClick={() => router.push(`/freelancers?search=${value}`)} variant={"secondary"} className="ml-2">
                Search
            </Button>
        </div>
    );
};
