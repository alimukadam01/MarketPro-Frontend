import { useLocation, useNavigate } from "react-router-dom";
import { Copy, Monitor } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sidebarItems } from "@/components/layout/sidebar-items";
import { PhoneShell } from "./PhoneShell";

/** "Sales" for /sales and /sales/update-invoice; null when no section owns the path. */
const sectionName = (pathname: string) => {
  const sections = [...sidebarItems, { name: "Employees", href: "/employees" }];
  const match = sections.find((item) =>
    item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)));
  return match ? match.name : null;
};

/**
 * What a phone shows in place of any page other than the dashboard and the
 * upload form (ProtectedRoute). In place, not a redirect, so the address bar
 * keeps the link that was opened and Copy link hands it on to a computer.
 */
export default function PhoneBlocked() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const name = sectionName(pathname);

  const copyLink = async () => {
    try {
      // Missing on a plain-http address, where browsers withhold the clipboard.
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied.");
    } catch (error) {
      console.log("Error copying the link:", error);
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <PhoneShell centered>
      <div className="flex flex-col items-center gap-3.5 text-center">
        <span className="w-[72px] h-[72px] rounded-full bg-primary/10 text-primary flex items-center justify-center">
          <Monitor className="w-[34px] h-[34px]" />
        </span>
        <h1 className="text-[22px] font-bold">{name ? `${name} needs a computer` : "This page needs a computer"}</h1>
        <p className="text-[15px] leading-relaxed text-muted-foreground">
          On a phone, MarketPro shows the dashboard and lets you upload pages.
          Open this link on a computer to {name ? `see ${name}` : "use it"}.
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-lg border bg-card py-1 pl-3.5 pr-1">
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {window.location.host}{pathname}
        </span>
        <Button type="button" variant="secondary" className="h-10 gap-1.5" onClick={copyLink}>
          <Copy className="w-4 h-4" />
          Copy link
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        <Button className="h-12 text-[15px]" onClick={() => navigate("/")}>Go to dashboard</Button>
        <Button variant="outline" className="h-12 text-[15px]" onClick={() => navigate("/backlog/upload")}>Upload pages</Button>
      </div>
    </PhoneShell>
  );
}
