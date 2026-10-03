import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom';
import {
  LogOut
} from "lucide-react";
import { SearchField } from "@/components/ui/search-field";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import SearchItemsProvider from "@/components/ui/search-item-provider"
import { toast } from "sonner"
import { getUserInfo, globalSearch } from "../../../services/api"
import { useAuth } from '../../../services/AuthProvider'
import { useDebouncedSearch } from "@/hooks/use-debounced-search"

export function Header() {

  const { token } = useAuth()
  const { user } = useAuth()
  const [searchResults, setSearchResults] = useState([])
  const [isSearchResOpen, setIsSearchResOpen] = useState(false)
  const containerRef = useRef(null)

  // Receives the query the hook has already formatted, so an emptied box arrives
  // here as null. It used to arrive as no call at all, which left the previous
  // query's results hanging open under an empty field until a click elsewhere.
  const performGlobalSearch = async (searchQuery) => {
    if (!token) return;

    if (!searchQuery) {
      setIsSearchResOpen(false);
      return;
    }
    setIsSearchResOpen(true);

    try {
      const res = await globalSearch(token, searchQuery);
      if (res) {
        setSearchResults(res);
      }
    } catch (error) {
      toast.error("Failed to perform search. Please contact admin.");
      console.error("Failed to perform search:", error);
    }
  }

  const { searchTerm, setSearchTerm, searching } = useDebouncedSearch(performGlobalSearch);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsSearchResOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsSearchResOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md relative" ref={containerRef}>
          <div className="relative">
            <SearchField
              placeholder="Search for sales invoices, purchase invoices or anything else!"
              className="w-full"
              value={searchTerm}
              onChange={setSearchTerm}
              pending={searching}
              onFocus={() => {
                if (searchResults.length > 0) setIsSearchResOpen(true);
              }}
            />
          </div>

          {isSearchResOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-popover border border-border rounded-lg shadow-lg z-50 max-h-[500px] overflow-y-auto">
              <ScrollArea className="h-full max-h-[500px]">
                <div className="p-4">
                  {searchResults && searchResults.length > 0 && searchResults.map((result) => (
                    <div>
                      <SearchItemsProvider result={result} toggleResults={setIsSearchResOpen}/>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
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