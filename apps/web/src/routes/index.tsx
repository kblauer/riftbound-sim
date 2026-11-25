import { createFileRoute, Link } from "@tanstack/react-router";
import { Bot, Swords } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold tracking-tight">riftbound-sim</h1>
      <p className="text-muted-foreground">
        A private test build for playing Riftbound against the AI or another player.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link to="/play" className={buttonVariants({ size: "lg" })}>
          <Bot /> Play vs AI
        </Link>
        <Link to="/pvp" className={buttonVariants({ size: "lg", variant: "secondary" })}>
          <Swords /> Play online
        </Link>
      </div>
    </div>
  );
}
