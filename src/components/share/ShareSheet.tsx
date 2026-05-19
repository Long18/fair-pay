import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShareIcon } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

interface ShareSheetProps {
  url: string;
  title: string;
  imageUrl?: string;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ZaloIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-sm bg-[#0068FF] text-[11px] font-extrabold text-white",
        className,
      )}
      aria-hidden
    >
      Z
    </span>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 items-center justify-center rounded-sm bg-[#1877F2] text-[11px] font-extrabold text-white",
        className,
      )}
      aria-hidden
    >
      f
    </span>
  );
}

export function ShareSheet({
  url,
  title,
  imageUrl,
  trigger,
  open,
  onOpenChange,
}: ShareSheetProps) {
  const { t } = useTranslation();
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = open !== undefined;
  const dialogOpen = controlled ? open : internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;

  const handleZalo = () => {
    const shareUrl = `https://zalo.me/app/social/story/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setDialogOpen(false);
  };

  const handleFacebook = () => {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, "_blank", "noopener,noreferrer");
    setDialogOpen(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t("share.copied", "Copied!"));
      setDialogOpen(false);
    } catch {
      toast.error(t("common.error", "Error"));
    }
  };

  const handleDownloadImage = async () => {
    if (!imageUrl) return;
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = "fairpay-share.png";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setDialogOpen(false);
    } catch {
      toast.error(t("common.error", "Error"));
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="max-w-sm gap-0 p-0">
        <DialogHeader className="px-5 pb-3 pt-5">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShareIcon className="h-4 w-4 text-muted-foreground" />
            {t("share.title", "Share")}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 px-5 pb-5">
          <button
            type="button"
            onClick={handleZalo}
            className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted active:bg-muted/80"
          >
            <ZaloIcon />
            {t("share.zalo", "Share on Zalo")}
          </button>

          <button
            type="button"
            onClick={handleFacebook}
            className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted active:bg-muted/80"
          >
            <FacebookIcon />
            {t("share.facebook", "Share on Facebook")}
          </button>

          <button
            type="button"
            onClick={() => void handleCopyLink()}
            className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted active:bg-muted/80"
          >
            <span className="flex h-5 w-5 items-center justify-center text-base" aria-hidden>
              🔗
            </span>
            {t("share.copyLink", "Copy link")}
          </button>

          {imageUrl ? (
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              className="flex cursor-pointer items-center gap-3 rounded-xl border bg-background px-4 py-3 text-sm font-medium transition-colors hover:bg-muted active:bg-muted/80"
            >
              <span className="flex h-5 w-5 items-center justify-center text-base" aria-hidden>
                ⬇️
              </span>
              {t("share.downloadImage", "Download image")}
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
