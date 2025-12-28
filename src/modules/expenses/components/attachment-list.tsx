import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Attachment } from "../types";
import { useAttachments } from "../hooks/use-attachments";
import { useState } from "react";
import { formatDate } from "@/lib/locale-utils";

import { DownloadIcon, Trash2Icon, FileImageIcon, EyeIcon } from "@/components/ui/icons";
interface AttachmentListProps {
  attachments: Attachment[];
  canDelete?: boolean;
  onDelete?: (attachmentId: string) => void;
}

export const AttachmentList = ({
  attachments,
  canDelete = false,
  onDelete,
}: AttachmentListProps) => {
  const { downloadAttachment, deleteAttachment, getAttachmentUrl } = useAttachments();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);

  if (attachments.length === 0) {
    return null;
  }

  const handleDelete = async (attachment: Attachment) => {
    setDeletingId(attachment.id);
    const success = await deleteAttachment(attachment);
    if (success && onDelete) {
      onDelete(attachment.id);
    }
    setDeletingId(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatAttachmentDate = (dateString: string): string => {
    return formatDate(dateString, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileImageIcon className="h-5 w-5" />
            Attachments ({attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {attachments.map((attachment) => (
              <Card key={attachment.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Preview */}
                  <div className="aspect-video bg-muted flex items-center justify-center relative group">
                    {isImage(attachment.mime_type) ? (
                      <img
                        src={getAttachmentUrl(attachment.storage_path)}
                        alt={attachment.file_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileIcon className="h-12 w-12 text-muted-foreground" />
                    )}
                    {/* Overlay with actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      {isImage(attachment.mime_type) && (
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => setViewingUrl(getAttachmentUrl(attachment.storage_path))}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => downloadAttachment(attachment)}
                      >
                        <DownloadIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="p-3 space-y-2">
                    <p className="text-sm font-medium truncate" title={attachment.file_name}>
                      {attachment.file_name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {formatFileSize(attachment.file_size)}
                      </Badge>
                      {attachment.mime_type === "application/pdf" && (
                        <Badge variant="outline" className="text-xs">
                          PDF
                        </Badge>
                      )}
                      {isImage(attachment.mime_type) && (
                        <Badge variant="outline" className="text-xs">
                          Image
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatAttachmentDate(attachment.created_at)}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => downloadAttachment(attachment)}
                      >
                        <DownloadIcon className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      {canDelete && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deletingId === attachment.id}
                            >
                              <Trash2Icon className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete "{attachment.file_name}".
                                This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(attachment)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Image Viewer Modal */}
      {viewingUrl && (
        <AlertDialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
          <AlertDialogContent className="max-w-4xl">
            <AlertDialogHeader>
              <AlertDialogTitle>View Receipt</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="max-h-[70vh] overflow-auto">
              <img
                src={viewingUrl}
                alt="Receipt"
                className="w-full h-auto"
              />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
};
