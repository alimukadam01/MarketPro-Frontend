import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Package } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "../../../services/AuthProvider";

interface EntryShellProps {
  /** "entry" for the data entry person, "review" for the owner checking a page. */
  mode: "entry" | "review";
  title: ReactNode;
  /** Pills and the timer, beside the title. */
  aside?: ReactNode;
  /** The buttons at the right end of the title row. */
  actions?: ReactNode;
  /** Where the arrow beside the title goes. */
  backTo?: string;
  loading?: boolean;
  /** The page below the title row. It fills the rest of the screen. */
  children: ReactNode;
  /** Rendered outside the layout, so a dialog never sits inside a form. */
  dialogs?: ReactNode;
}

/**
 * The frame of the backlog entry screens: no sidebar - a data entry account
 * has nowhere else to go - and a bar with the user and Log out, or for the
 * owner a way back to the Backlog page. The screen itself never scrolls;
 * its columns do, each on its own.
 */
export function EntryShell({
  mode,
  title,
  aside,
  actions,
  backTo,
  loading = false,
  children,
  dialogs,
}: EntryShellProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` : "";

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="shrink-0 bg-card border-b border-border px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">MARKET Pro</span>
          <span className="w-px h-5 bg-border" />
          <span className="text-sm text-muted-foreground">{mode === "review" ? "Review" : "Data entry"}</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user && `${user.first_name} ${user.last_name}`}</span>
          </div>
          {mode === "review" ? (
            <Button variant="outline" size="sm" onClick={() => navigate("/backlog")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Backlog
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={logout}>
              <LogOut className="w-4 h-4 mr-2" />
              Log out
            </Button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-6 gap-6">
        <div className="shrink-0 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0 flex-wrap">
            {backTo && (
              <ArrowLeft
                className="w-5 h-5 shrink-0 text-muted-foreground cursor-pointer hover:text-primary"
                onClick={() => navigate(backTo)}
              />
            )}
            <h1 className="text-2xl font-semibold leading-8 truncate">{title}</h1>
            {aside}
            {loading && <Spinner size={18} label="Loading" color="hsl(var(--spinner))" />}
          </div>
          {actions && <div className="flex items-center gap-3 flex-wrap">{actions}</div>}
        </div>

        <div className="flex-1 min-h-0">{children}</div>
      </div>

      {dialogs}
    </div>
  );
}

export default EntryShell;
