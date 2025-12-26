import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGetIdentity } from "@refinedev/core";
import { Profile } from "@/modules/profile/types";

export function DashboardHero() {
  const { data: identity } = useGetIdentity<Profile>();
  const firstName = identity?.full_name?.split(" ")[0] || "there";

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Hi {firstName},</h2>
        <p className="text-muted-foreground mt-1 text-base">
          Here is your balance overview for <span className="font-medium text-foreground">this month</span>.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-muted-foreground hidden md:inline-block">View context:</span>
        <Select defaultValue="all">
          <SelectTrigger className="w-[180px] bg-background shadow-sm">
            <SelectValue placeholder="Select context" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Contexts</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="work">Work Trip</SelectItem>
            <SelectItem value="friends">Friends</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
