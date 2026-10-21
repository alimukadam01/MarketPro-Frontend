import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useAuth } from '../../../services/AuthProvider'

export function Header() {

  const { user } = useAuth()

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        {/* Search everything: see components/search/GlobalSearch. */}
        <div className="flex-1 max-w-md">
          <GlobalSearch />
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarFallback>{user && `${user.first_name[0]} ${user.last_name[0]}`}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user && `${user.first_name} ${user.last_name}`}</span>
          </div>
        </div>
      </div>
    </header >
  );
}
