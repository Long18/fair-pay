import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileImage, File as FileIcon } from "lucide-react";
import { toast } from "sonner";

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

export const AttachmentUpload = ({
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSizeMB = 5,
}: AttachmentUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
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
    if (attachments.length >= maxFiles) {
      return `Maximum ${maxFiles} files allowed.`;
    }

    return null;
  };

  const handleFiles = (files: FileList | null) => {
    if (!files) return;

    const newAttachments: AttachmentFile[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      const error = validateFile(file);
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
      toast.success(`${newAttachments.length} file(s) added`);
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
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-6 text-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-4" />
          <p className="text-sm font-medium mb-2">
            Drop receipt images or PDFs here
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            or click to browse (max {maxSizeMB}MB per file, up to {maxFiles} files)
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
            onClick={() => fileInputRef.current?.click()}
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
                          <FileIcon className="h-8 w-8 text-red-500" />
                        ) : (
                          <FileImage className="h-8 w-8 text-muted-foreground" />
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
                      onClick={() => removeAttachment(index)}
                    >
                      <X className="h-4 w-4" />
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
