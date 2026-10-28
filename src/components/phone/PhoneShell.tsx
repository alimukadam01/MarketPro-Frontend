import { ChevronDown, LogOut, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "../../../services/AuthProvider";

/** The sidebar's mark: the box icon on a rounded square. */
export function PhoneLogo() {
  return (
    <div className="w-8 h-8 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
      <Package className="w-5 h-5" />
    </div>
  );
}

/** The name pill in the top bar. It opens a menu holding Log out. */
function AccountMenu() {
  const { user, logout } = useAuth();
  const name = user ? `${user.first_name} ${user.last_name}` : "";
  const initials = user ? `${user.first_name?.[0] ?? ""}${user.last_name?.[0] ?? ""}` : "";

  const handleLogout = () => {
    localStorage.removeItem("mp-business-id");
    logout();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group h-11 min-w-0 flex items-center gap-2 rounded-full border bg-card pl-1.5 pr-2.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:border-primary/50 data-[state=open]:bg-primary/5">
        <span className="w-[30px] h-[30px] shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
          {initials}
        </span>
        <span className="truncate">{name}</span>
        <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span>{name}</span>
          {user?.email && <span className="text-xs font-normal text-muted-foreground">{user.email}</span>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="h-11 gap-2 font-semibold text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface PhoneShellProps {
  children: React.ReactNode;
  /** Pinned to the bottom of the screen under the page, e.g. a form's submit button. */
  footer?: React.ReactNode;
  /** Centre the page in the space, for the one-message screens. */
  centered?: boolean;
}

/**
 * The frame of every phone screen: a top bar with the mark, the business and
 * the account menu, then the page. In place of the sidebar and the header,
 * which are built for a computer.
 */
export function PhoneShell({ children, footer, centered = false }: PhoneShellProps) {
  const businessName = localStorage.getItem("mp-business-name");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-40 h-14 shrink-0 flex items-center justify-between gap-3 border-b bg-card pl-4 pr-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PhoneLogo />
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="text-[15px] font-semibold">MarketPro</span>
            {businessName && <span className="truncate text-xs text-muted-foreground">{businessName}</span>}
          </div>
        </div>
        <AccountMenu />
      </header>
      <main className={cn("flex-1 flex flex-col px-4 py-5", centered ? "justify-center gap-7 px-6" : "gap-5")}>
        {children}
      </main>
      {footer && (
        <div className="sticky bottom-0 z-30 border-t bg-card px-4 py-3">
          {footer}
        </div>
      )}
    </div>
  );
}
