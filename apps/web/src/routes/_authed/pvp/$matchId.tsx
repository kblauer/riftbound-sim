import { createFileRoute } from "@tanstack/react-router";
import { Copy } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { Board } from "@/components/game/board";
import { Button } from "@/components/ui/button";
import { useMatchSocket } from "@/hooks/use-match-socket";
import { useCatalog } from "@/lib/catalog";

export const Route = createFileRoute("/_authed/pvp/$matchId")({ component: PvpMatch });

function PvpMatch() {
  const { matchId } = Route.useParams();
  const { status, view, error, act } = useMatchSocket(matchId);
  const { lookup } = useCatalog();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (view) return <Board view={view} onAction={act} lookup={lookup} />;

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">
        {status === "open" ? "Waiting for your opponent" : "Connecting…"}
      </h1>
      <p className="text-sm text-muted-foreground">Send this page's link to the other player.</p>
      <Button
        variant="secondary"
        onClick={() =>
          navigator.clipboard
            .writeText(window.location.href)
            .then(() => toast.success("Link copied"))
        }
      >
        <Copy /> Copy invite link
      </Button>
    </div>
  );
}
