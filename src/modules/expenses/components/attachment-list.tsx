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

import { DownloadIcon, Trash2Icon, FileImageIcon, EyeIcon, FileIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
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
  const { tap, warning } = useHaptics();
  const { downloadAttachment, deleteAttachment, getAttachmentUrl } = useAttachments();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());

  if (attachments.length === 0) {
    return null;
  }

  const handleDelete = async (attachment: Attachment) => {
    warning();
    setDeletingId(attachment.id);
    const success = await deleteAttachment(attachment);
    if (success && onDelete) {
      onDelete(attachment.id);
    }
    setDeletingId(null);
  };

  const handleImageLoad = (attachmentId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(attachmentId);
      return next;
    });
  };

  const handleImageError = (attachmentId: string) => {
    setLoadingImages(prev => {
      const next = new Set(prev);
      next.delete(attachmentId);
      return next;
    });
    setErrorImages(prev => {
      const next = new Set(prev);
      next.add(attachmentId);
      return next;
    });
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {attachments.map((attachment) => {
          const isLoadingImage = loadingImages.has(attachment.id);
          const hasErrorImage = errorImages.has(attachment.id);
          const imageUrl = getAttachmentUrl(attachment.storage_path);

          return (
            <div
              key={attachment.id}
              className="group relative rounded-xl border-2 border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-primary/50 transition-all duration-200"
            >
              {/* Image Preview */}
              <div className="relative bg-muted">
                {isImage(attachment.mime_type) && !hasErrorImage ? (
                  <div className="relative w-full" style={{ aspectRatio: '3/4' }}>
                    {/* Loading Skeleton */}
                    {isLoadingImage && (
                      <div className="absolute inset-0 animate-pulse bg-muted flex items-center justify-center">
                        <FileImageIcon className="h-12 w-12 text-muted-foreground/50" />
                      </div>
                    )}

                    <img
                      src={imageUrl}
                      alt={attachment.file_name}
                      className="w-full h-full object-contain bg-muted"
                      loading="lazy"
                      onLoad={() => handleImageLoad(attachment.id)}
                      onError={() => handleImageError(attachment.id)}
                      style={{ display: isLoadingImage ? 'none' : 'block' }}
                    />

                    {/* Hover Overlay with Actions */}
                    {!isLoadingImage && (
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => { tap(); setViewingUrl(imageUrl); }}
                          className="shadow-lg"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="secondary"
                          onClick={() => { tap(); downloadAttachment(attachment); }}
                          className="shadow-lg"
                        >
                          <DownloadIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex flex-col items-center justify-center p-6">
                    {hasErrorImage ? (
                      <>
                        <div className="rounded-full bg-destructive/10 p-4 mb-3">
                          <FileIcon className="h-12 w-12 text-destructive" />
                        </div>
                        <p className="text-xs text-destructive font-medium text-center">
                          Failed to load image
                        </p>
                      </>
                    ) : (
                      <>
                        <FileIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        {attachment.mime_type === "application/pdf" && (
                          <Badge variant="outline" className="mt-2">PDF</Badge>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* File Info */}
              <div className="p-4 space-y-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium truncate leading-tight" title={attachment.file_name}>
                    {attachment.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatAttachmentDate(attachment.created_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {formatFileSize(attachment.file_size)}
                  </Badge>
                  {isImage(attachment.mime_type) && !hasErrorImage && (
                    <Badge variant="outline" className="text-xs">
                      Image
                    </Badge>
                  )}
                  {attachment.mime_type === "application/pdf" && (
                    <Badge variant="outline" className="text-xs">
                      PDF
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => { tap(); downloadAttachment(attachment); }}
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
                          {deletingId === attachment.id ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2Icon className="h-4 w-4" />
                          )}
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
            </div>
          );
        })}
      </div>

      {/* Image Viewer Modal */}
      {viewingUrl && (
        <AlertDialog open={!!viewingUrl} onOpenChange={() => setViewingUrl(null)}>
          <AlertDialogContent className="max-w-4xl max-h-[90vh]">
            <AlertDialogHeader>
              <AlertDialogTitle>View Receipt</AlertDialogTitle>
            </AlertDialogHeader>
            <div className="max-h-[70vh] overflow-auto rounded-lg bg-muted p-2">
              <img
                src={viewingUrl}
                alt="Receipt"
                className="w-full h-auto"
                loading="eager"
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
