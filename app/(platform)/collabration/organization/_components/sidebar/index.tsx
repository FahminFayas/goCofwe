import Link from "next/link";
import { List } from "./list";
import { NewButton } from "./new-button";
import { Hint } from "@/components/hint";
import { StepBack } from "lucide-react";
export const Sidebar = () => {
    return (
        <aside className="fixed z-[1] left-0 bg-blue-950 h-full w-[60px] flex p-3 flex-col gap-y-4 text-white">
            <NewButton />
            <List />
            <div className="aspect-square">
        <Hint label="Hire Freelancer" side="right" align="start" sideOffset={18}>
          <Link
            href="/freelancers"
            target="_blank"
            rel="noreferrer noopener"
            className="bg-white/25 h-full w-full flex items-center justify-center rounded-md opacity-60 hover:opacity-100 transition"
          >
            <StepBack className="text-white h-5 w-5" />
            </Link>
        </Hint>
      </div>
        </aside>
    );
};

export default Sidebar;
