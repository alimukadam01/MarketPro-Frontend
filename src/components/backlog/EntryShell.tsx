import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LogOut, Package } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import DynamicBreadCrumb from "@/components/layout/DynamicBreadCrumb";
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
 * The frame of the backlog entry screens. The screen itself never scrolls;
 * its columns do, each on its own.
 *
 * A data entry account gets a bare bar - the user and Log out, no sidebar and
 * no search - because it has nowhere else to go. Everyone else (the owner
 * reviewing a page, or entering one themselves) keeps MarketPro's own
 * sidebar, header and search, as on every other page.
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` : "";

  // One line, never two: the pills and the "Entered by" line give way
  // (truncate) before the buttons wrap under them, which cost the page
  // below a whole row of height.
  const titleRow = (
    <div className="shrink-0 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0 overflow-hidden whitespace-nowrap">
        {backTo && (
          <ArrowLeft
            className="w-5 h-5 shrink-0 text-muted-foreground cursor-pointer hover:text-primary"
            onClick={() => navigate(backTo)}
          />
        )}
        <h1 className="text-2xl font-semibold leading-8 shrink-0">{title}</h1>
        {aside}
        {loading && <Spinner size={18} label="Loading" color="hsl(var(--spinner))" />}
      </div>
      {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
    </div>
  );

  if (user?.role !== "backlog") {
    // The InvoiceScreen frame: h-screen beside the sidebar, so only the
    // columns inside scroll.
    return (
      <div className="min-h-screen bg-background">
        <Sidebar onCollapseChange={setSidebarCollapsed} />
        <div className={`${sidebarCollapsed ? "ml-16" : "ml-64"} transition-all duration-300 flex flex-col h-screen`}>
          <Header />
          <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-6 gap-6">
            <div className="shrink-0">
              <DynamicBreadCrumb />
            </div>
            {titleRow}
            {/* Scrolls only when the screen is too short for the page's own
                minimum: the entry screens keep their item lists that tall
                rather than squeezing them out of sight. The px-1 inset keeps
                focus rings at the edges from being clipped. */}
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">{children}</div>
          </div>
        </div>
        {dialogs}
      </div>
    );
  }

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
          <Button variant="ghost" size="sm" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col px-6 pt-6 pb-6 gap-6">
        {titleRow}

        {/* Scrolls only when the screen is too short for the page's own
                minimum: the entry screens keep their item lists that tall
                rather than squeezing them out of sight. The px-1 inset keeps
                focus rings at the edges from being clipped. */}
            <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">{children}</div>
      </div>

      {dialogs}
    </div>
  );
}

export default EntryShell;
