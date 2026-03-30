import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { UploadIcon, XIcon, FileImageIcon, FileIcon } from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
export interface AttachmentFile {
  file: File;
  preview?: string;
}

interface AttachmentUploadProps {
  attachments: AttachmentFile[];
  onAttachmentsChange: (attachments: AttachmentFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
];

const getClipboardFileName = (file: File) => {
  if (file.name) return file.name;

  const extension = file.type.split("/")[1] || "bin";
  return `clipboard-${Date.now()}.${extension}`;
};

export const AttachmentUpload = ({
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSizeMB = 5,
}: AttachmentUploadProps) => {
  const { tap } = useHaptics();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File, nextCount: number): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: File type not allowed. Please upload images or PDF files.`;
    }

    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      return `${file.name}: File size exceeds ${maxSizeMB}MB limit.`;
    }

    // Check total count
    if (nextCount > maxFiles) {
      return `Maximum ${maxFiles} files allowed.`;
    }

    return null;
  };

  const handleFiles = (files: FileList | File[] | null, source: "browse" | "drop" | "paste" = "browse") => {
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((rawFile) => {
      const file = rawFile.name
        ? rawFile
        : new File([rawFile], getClipboardFileName(rawFile), {
            type: rawFile.type,
            lastModified: Date.now(),
          });

      const error = validateFile(file, attachments.length + newAttachments.length + 1);
      if (error) {
        errors.push(error);
        return;
      }

      // Create preview for images
      let preview: string | undefined;
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }

      newAttachments.push({ file, preview });
    });

    if (errors.length > 0) {
      errors.forEach((error) => toast.error(error));
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
      const sourceLabel = source === "paste" ? "from clipboard" : "";
      toast.success(`${newAttachments.length} file(s) added ${sourceLabel}`.trim());
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const clipboardFiles = Array.from(e.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);

    if (clipboardFiles.length === 0) return;

    e.preventDefault();
    handleFiles(clipboardFiles, "paste");
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    if (attachment.preview) {
      URL.revokeObjectURL(attachment.preview);
    }
    onAttachmentsChange(attachments.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`border-2 border-dashed transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 focus-within:border-primary/60 focus-within:bg-primary/5"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        tabIndex={0}
        role="group"
        aria-label="Attachment upload area"
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-6 text-center">
          <UploadIcon className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium mb-2">
            Drop receipt images or PDFs here
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or click to browse (max {maxSizeMB}MB per file, up to {maxFiles} files)
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Tip: click this box and press Ctrl+V or Cmd+V to paste from clipboard
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { tap(); fileInputRef.current?.click(); }}
          >
            Browse Files
          </Button>
        </CardContent>
      </Card>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            Attachments ({attachments.length}/{maxFiles})
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {attachments.map((attachment, index) => (
              <Card key={index} className="relative">
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    {/* Preview or Icon */}
                    {attachment.preview ? (
                      <img
                        src={attachment.preview}
                        alt={attachment.file.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        {attachment.file.type === "application/pdf" ? (
                          <FileIcon className="h-8 w-8 text-destructive" />
                        ) : (
                          <FileImageIcon className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                    )}

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {attachment.file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatFileSize(attachment.file.size)}
                        </Badge>
                        {attachment.file.type.startsWith("image/") && (
                          <Badge variant="outline" className="text-xs">
                            Image
                          </Badge>
                        )}
                        {attachment.file.type === "application/pdf" && (
                          <Badge variant="outline" className="text-xs">
                            PDF
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Remove Button */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => { tap(); removeAttachment(index); }}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
