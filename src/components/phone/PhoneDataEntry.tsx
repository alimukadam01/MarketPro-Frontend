import { LogOut, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../../services/AuthProvider";
import { PhoneLogo } from "./PhoneShell";

/**
 * A data entry account on a phone, whatever page it opens: entering pages
 * needs a computer, so it is offered only Log out.
 */
export default function PhoneDataEntry() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("mp-business-id");
    logout();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="h-14 shrink-0 flex items-center gap-2.5 border-b bg-card px-4">
        <PhoneLogo />
        <span className="text-[15px] font-semibold">MarketPro</span>
      </header>
      <main className="flex-1 flex flex-col justify-center gap-8 px-6 pt-6 pb-10">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <span className="w-[72px] h-[72px] rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Monitor className="w-[34px] h-[34px]" />
          </span>
          <h1 className="text-[22px] font-bold">Data entry needs a computer</h1>
          <p className="text-[15px] leading-relaxed text-muted-foreground">
            Entering pages needs a bigger screen. Sign in on a computer to carry on with your queue.
          </p>
        </div>
        <div className="flex flex-col gap-2.5">
          {user?.email && <span className="text-center text-[13px] text-muted-foreground">Signed in as {user.email}</span>}
          <Button variant="outline" className="h-12 gap-2 text-[15px]" onClick={handleLogout}>
            <LogOut className="w-[18px] h-[18px]" />
            Log out
          </Button>
        </div>
      </main>
    </div>
  );
}
