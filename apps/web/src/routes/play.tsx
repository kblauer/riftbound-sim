import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";
import { Board } from "@/components/game/board";
import { Button } from "@/components/ui/button";
import { useAiMatch } from "@/hooks/use-ai-match";
import { useCatalog } from "@/lib/catalog";

export const Route = createFileRoute("/play")({ component: PlayAi });

/** A match against the bot. Runs fully in the browser, so it needs no sign-in or server. */
function PlayAi() {
  const { view, act, error, restart } = useAiMatch();
  const { lookup } = useCatalog();

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  return (
    <>
      <Board view={view} onAction={act} lookup={lookup} />
      {view.status === "finished" && (
        <div className="flex justify-center border-t p-3">
          <Button onClick={restart}>New match</Button>
        </div>
      )}
    </>
  );
}
