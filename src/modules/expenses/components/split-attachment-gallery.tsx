import { useState, useEffect } from "react";
import { Attachment } from "../types";
import { useAttachments } from "../hooks/use-attachments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageZoomViewer } from "@/components/ui/image-zoom-viewer";
import { EyeIcon, DownloadIcon, FileIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";

interface SplitAttachmentGalleryProps {
  attachments: Attachment[];
  userName: string;
}

export const SplitAttachmentGallery = ({
  attachments,
  userName,
}: SplitAttachmentGalleryProps) => {
  const { tap } = useHaptics();
  const { downloadAttachment, getAttachmentUrl } = useAttachments();
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  const [viewingFileName, setViewingFileName] = useState<string>("");
  const [signedUrls, setSignedUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    const fetchUrls = async () => {
      const entries = await Promise.all(
        attachments.map(async (a) => {
          const url = await getAttachmentUrl(a.storage_path);
          return [a.storage_path, url] as [string, string];
        })
      );
      if (!cancelled) {
        setSignedUrls(new Map(entries));
      }
    };
    fetchUrls();
    return () => { cancelled = true; };
  }, [attachments]);

  if (attachments.length === 0) {
    return null;
  }

  const isImage = (mimeType: string) => mimeType.startsWith("image/");

  const handleView = (attachment: Attachment) => {
    tap();
    setViewingUrl(signedUrls.get(attachment.storage_path) ?? null);
    setViewingFileName(attachment.file_name);
  };

  return (
    <>
      <div className="mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            Payment Proof ({attachments.length})
          </Badge>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden border-2 border-border hover:border-primary transition-all group cursor-pointer"
              onClick={() => {
                if (isImage(attachment.mime_type)) {
                  handleView(attachment);
                }
              }}
            >
              {isImage(attachment.mime_type) ? (
                <img
                  src={signedUrls.get(attachment.storage_path) ?? ""}
                  alt={attachment.file_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted flex items-center justify-center">
                  <FileIcon className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                {isImage(attachment.mime_type) && (
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      tap();
                      handleView(attachment);
                    }}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    tap();
                    downloadAttachment(attachment);
                  }}
                >
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </div>
              {!isImage(attachment.mime_type) && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] px-1 py-0.5 truncate">
                  {attachment.file_name}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <ImageZoomViewer
        src={viewingUrl ?? ""}
        alt={viewingFileName}
        open={!!viewingUrl}
        onClose={() => {
          setViewingUrl(null);
          setViewingFileName("");
        }}
        title={`Payment Proof - ${userName}`}
      />
    </>
  );
};
