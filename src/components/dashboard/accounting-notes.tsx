import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@/components/ui/icons";
interface Note {
  date: string;
  year: string;
  message: string;
  type?: "success" | "warning" | "info";
}

interface AccountingNotesProps {
  notes: Note[];
  onAddNote?: () => void;
}

export const AccountingNotes = ({ notes, onAddNote }: AccountingNotesProps) => {
  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-red-500">▶</span>
          Accounting notes
        </CardTitle>
        {onAddNote && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onAddNote}
            className="text-sm text-red-400 hover:text-red-500 hover:bg-red-50"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            New note
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {notes.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No notes yet</p>
        ) : (
          notes.map((note, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center min-w-[50px]">
                <div className="text-sm font-semibold text-gray-900">{note.date}</div>
                <div className="text-xs text-gray-500">{note.year}</div>
              </div>
              <div className="flex items-start gap-2 flex-1">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  note.type === "success" ? "bg-green-500" :
                  note.type === "warning" ? "bg-yellow-500" :
                  "bg-red-500"
                }`} />
                <p className="text-sm text-gray-700 flex-1">{note.message}</p>
              </div>
            </div>
          ))
        )}
        {notes.length > 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-full"
          >
            Show more
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
