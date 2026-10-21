import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useAuth } from '../../../services/AuthProvider'

export function Header() {

  const { user } = useAuth()

  return (
    <header className="bg-card border-b border-border p-4">
      {/* Three columns, the outer two equal, so the search sits at the true
          centre of the header whatever the user's name takes up. */}
      <div className="grid grid-cols-[1fr_minmax(0,36rem)_1fr] items-center gap-4">
        <div aria-hidden="true" />

        {/* Search everything: see components/search/GlobalSearch. */}
        <div className="w-full">
          <GlobalSearch />
        </div>

        <div className="flex items-center justify-self-end space-x-4">
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
