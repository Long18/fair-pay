import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "@/components/ui/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WelcomeHeaderProps {
  userName: string;
  message: string;
  creditors?: string[];
  selectedCreditor?: string;
  onCreditorChange?: (creditor: string) => void;
}

export const WelcomeHeader = ({
  userName,
  message,
  creditors = [],
  selectedCreditor,
  onCreditorChange,
}: WelcomeHeaderProps) => {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hi {userName},</h1>
        <p className="text-3xl font-bold text-gray-900 mt-1">{message}</p>
      </div>

      {creditors.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">Select Creditors</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[200px] justify-between border-2 border-green-500 text-gray-900 hover:bg-green-50 font-medium"
              >
                {selectedCreditor || "Select creditor"}
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              {creditors.map((creditor) => (
                <DropdownMenuItem
                  key={creditor}
                  onClick={() => onCreditorChange?.(creditor)}
                >
                  {creditor}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
};
