import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authed/pvp/")({ component: PvpLobby });

/** Invite-link matchmaking: create a match id, then share the page URL with the opponent. */
function PvpLobby() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Play online</h1>
      <p className="text-sm text-muted-foreground">
        Create a match, then send the link to your opponent. The match starts when you have both
        opened it.
      </p>
      <Button
        size="lg"
        onClick={() => navigate({ to: "/pvp/$matchId", params: { matchId: crypto.randomUUID() } })}
      >
        Create match
      </Button>
    </div>
  );
}
