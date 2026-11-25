import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Toaster } from "sonner";
import { Button } from "@/components/ui/button";
import { signOut, useAuth } from "@/lib/auth";

export const Route = createRootRoute({ component: RootLayout });

function RootLayout() {
  const { session, ready } = useAuth();
  const name = session?.user.user_metadata.full_name ?? session?.user.email;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/" className="font-semibold tracking-tight">
            riftbound-sim
          </Link>
          <Link to="/play" className="text-muted-foreground [&.active]:text-foreground">
            Play vs AI
          </Link>
          <Link to="/pvp" className="text-muted-foreground [&.active]:text-foreground">
            Play online
          </Link>
        </nav>
        {ready &&
          (session ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden text-muted-foreground sm:inline">{name}</span>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>
                <LogOut /> Sign out
              </Button>
            </div>
          ) : (
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Sign in
            </Link>
          ))}
      </header>

      <main className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </main>

      <footer className="border-t px-4 py-2 text-center text-xs text-muted-foreground">
        riftbound-sim was created under Riot Games' "Legal Jibber Jabber" policy using assets owned
        by Riot Games. Riot Games does not endorse or sponsor this project. Card data and images via{" "}
        <a href="https://rifthunt.com" className="underline" target="_blank" rel="noreferrer">
          RiftHunt
        </a>
        .
      </footer>
      <Toaster theme="dark" position="top-center" />
    </div>
  );
}
