import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { CameraIcon, Loader2Icon, XIcon } from "@/components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ProfileAvatarUploadProps {
  currentAvatarUrl?: string | null;
  fullName: string;
  onUpload: (file: File) => Promise<string | void>;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  disabled?: boolean;
}

export const ProfileAvatarUpload = ({
  currentAvatarUrl,
  fullName,
  onUpload,
  size = "lg",
  className,
  disabled = false,
}: ProfileAvatarUploadProps) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-20 w-20",
    lg: "h-24 w-24 sm:h-32 sm:w-32",
    xl: "h-32 w-32 sm:h-40 sm:w-40",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
    xl: 20,
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl sm:text-3xl",
    xl: "text-3xl sm:text-4xl",
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error(t("profile.invalidFileType", "Please select an image file"));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t("profile.fileTooLarge", "File size must be less than 5MB"));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    setIsUploading(true);
    try {
      const result = await onUpload(file);
      if (result) {
        setPreviewUrl(result);
      }
      toast.success(t("profile.avatarUploaded", "Avatar uploaded successfully"));
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(t("profile.avatarUploadError", "Failed to upload avatar"));
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClick = () => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemovePreview = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewUrl(null);
  };

  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={cn("relative inline-block", className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || isUploading}
      />

      <motion.div
        whileHover={!disabled && !isUploading ? { scale: 1.05 } : {}}
        whileTap={!disabled && !isUploading ? { scale: 0.95 } : {}}
        className="relative"
      >
        <Avatar
          className={cn(
            sizeClasses[size],
            "border-4 border-background shadow-xl transition-opacity",
            !disabled && !isUploading && "cursor-pointer hover:opacity-90",
            isUploading && "opacity-50",
            className
          )}
          onClick={handleClick}
        >
          <AvatarImage src={displayUrl || undefined} />
          <AvatarFallback 
            className={cn(
              textSizes[size],
              "bg-gradient-to-br from-primary/20 to-primary/10"
            )}
          >
            {fullName
              ?.split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        {/* Upload Indicator */}
        <AnimatePresence>
          {!disabled && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className={cn(
                "absolute bottom-0 right-0 rounded-full shadow-lg",
                "bg-primary text-primary-foreground",
                size === "sm" ? "p-1" : "p-2"
              )}
            >
              {isUploading ? (
                <Loader2Icon size={iconSizes[size]} className="animate-spin" />
              ) : (
                <CameraIcon size={iconSizes[size]} />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview Remove Button */}
        {previewUrl && !isUploading && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            onClick={handleRemovePreview}
            className={cn(
              "absolute top-0 right-0 rounded-full shadow-lg",
              "bg-destructive text-destructive-foreground",
              "hover:bg-destructive/90 transition-colors",
              size === "sm" ? "p-0.5" : "p-1"
            )}
          >
            <XIcon size={iconSizes[size]} />
          </motion.button>
        )}

        {/* Loading Overlay */}
        {isUploading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}
      </motion.div>

      {/* Helper Text */}
      {!disabled && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          {t("profile.clickToUpload", "Click to upload photo")}
        </p>
      )}
    </div>
  );
};