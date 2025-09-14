import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner"
import { getUserInfo } from "../../../services/api"

export function Header() {

  const token = localStorage.getItem('market-pro-access-token')
  const [user, setUser] = useState(null)
  const navigate = useNavigate();

  const handleLogout = () =>{
    localStorage.removeItem('market-pro-access-token')
    setUser(null)
    navigate('/login')
  }

  useEffect(()=>{
    const fetchUser = async ()=>{
      try {
        const userData = await getUserInfo(token)
        if (userData){
          setUser(userData)
        }else{
          toast.error("Error fetching user information. Please reload.")
        }
      }catch(error){
        console.log(error)
        toast.error("Error fetching user information. Please reload.")
      }
    }

    fetchUser()
  }, [token])

  return (
    <header className="bg-card border-b border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search for sales invoices, purchase invoices or anything else!"
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Avatar>
              <AvatarFallback>AM</AvatarFallback>
            </Avatar>
            <span className="font-medium">{user && `${user.first_name} ${user.last_name}`}</span>
          </div>
          <Button variant="destructive" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}