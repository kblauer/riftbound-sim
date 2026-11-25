import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSession, signInWithGoogle } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    if (await getSession()) throw redirect({ to: "/" });
  },
  component: Login,
});

function Login() {
  return (
    <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="text-sm text-muted-foreground">
        This is a private test deployment. Only invited Google accounts can sign in.
      </p>
      <Button
        size="lg"
        disabled={!supabase}
        onClick={() =>
          signInWithGoogle().catch((error: Error) =>
            toast.error(`Sign-in failed: ${error.message}`),
          )
        }
      >
        Continue with Google
      </Button>
      {!supabase && (
        <p className="text-sm text-destructive">
          Sign-in is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
        </p>
      )}
    </div>
  );
}
