import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  CopyIcon,
  ExternalLinkIcon,
  MailIcon,
  MessageSquareIcon,
  SendIcon,
  ShareIcon,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { copyShareLinkWithTracking, shareWithTracking } from "@/lib/share-tracking";
import {
  DEFAULT_UTM_SHARE_CONFIG,
  findUtmTemplate,
  sortUtmPlatforms,
  type UtmPlatform,
  type UtmShareConfig,
} from "@/lib/utm-config";

interface SharePlatformPickerProps {
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shareUrl: string | (() => string);
  destinationUrl?: string | (() => string);
  title?: string;
  text?: string;
  entityType: string;
  entityId?: string | null;
  campaign: string;
  content: string;
  templateKey?: string;
  pagePath?: string;
  successMessage?: string;
  copyMessage?: string;
  errorMessage?: string;
  className?: string;
}

function resolveValue(value: string | (() => string) | undefined, fallback: string) {
  if (typeof value === "function") return value();
  return value ?? fallback;
}

function getPlatformIcon(platform: UtmPlatform) {
  switch (platform.icon_key ?? platform.platform_key) {
    case "email":
      return MailIcon;
    case "sms":
    case "messenger":
      return MessageSquareIcon;
    case "telegram":
      return SendIcon;
    default:
      return ExternalLinkIcon;
  }
}

function useUtmShareConfig() {
  return useQuery({
    queryKey: ["utm-share-config"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_utm_share_config");
      if (error) throw error;
      return data as unknown as UtmShareConfig;
    },
    retry: false,
    staleTime: 60_000,
  });
}

export function SharePlatformPicker({
  trigger,
  open,
  onOpenChange,
  shareUrl,
  destinationUrl,
  title,
  text,
  entityType,
  entityId,
  campaign,
  content,
  templateKey,
  pagePath,
  successMessage = "Share link opened",
  copyMessage = "Link copied to clipboard",
  errorMessage = "Failed to share link",
  className,
}: SharePlatformPickerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled = open !== undefined;
  const dialogOpen = controlled ? open : internalOpen;
  const setDialogOpen = onOpenChange ?? setInternalOpen;
  const { data } = useUtmShareConfig();
  const config = data ?? DEFAULT_UTM_SHARE_CONFIG;
  const template = findUtmTemplate(config.templates, templateKey);
  const allowedPlatformSignature = (template?.allowed_platforms ?? []).join("\u0000");

  const { platforms, copyEnabled, nativeEnabled } = useMemo(() => {
    const allowedPlatforms = new Set(allowedPlatformSignature ? allowedPlatformSignature.split("\u0000") : []);
    const enabled = sortUtmPlatforms(config.platforms).filter((platform) => {
      if (!platform.enabled) return false;
      if (platform.method !== "platform") return false;
      if (!platform.intent_url_template) return false;
      return allowedPlatforms.size === 0 || allowedPlatforms.has(platform.platform_key);
    });

    return {
      platforms: enabled,
      copyEnabled: config.platforms.some((platform) => platform.platform_key === "copy_link" && platform.enabled),
      nativeEnabled: config.platforms.some((platform) => platform.platform_key === "native_share" && platform.enabled),
    };
  }, [allowedPlatformSignature, config.platforms]);

  const shareBase = {
    title,
    text,
    entityType,
    entityId,
    campaign: template?.campaign ?? campaign,
    content: template?.content ?? content,
    templateKey: template?.template_key ?? templateKey,
    pagePath,
  };

  const runPlatformShare = async (platform: UtmPlatform) => {
    const url = resolveValue(shareUrl, "/");
    const result = await shareWithTracking({
      ...shareBase,
      shareUrl: url,
      destinationUrl: resolveValue(destinationUrl, url),
      platform,
    });

    if (result.status === "opened" || result.status === "shared") {
      toast.success(successMessage);
      setDialogOpen(false);
    } else if (result.status === "failed") {
      toast.error(errorMessage);
    }
  };

  const runCopy = async () => {
    const url = resolveValue(shareUrl, "/");
    const result = await copyShareLinkWithTracking({
      ...shareBase,
      shareUrl: url,
      destinationUrl: resolveValue(destinationUrl, url),
      content: "copy_link_button",
    });

    if (result.status === "copied") {
      toast.success(copyMessage);
      setDialogOpen(false);
    } else {
      toast.error(errorMessage);
    }
  };

  const runNative = async () => {
    const url = resolveValue(shareUrl, "/");
    const result = await shareWithTracking({
      ...shareBase,
      shareUrl: url,
      destinationUrl: resolveValue(destinationUrl, url),
      fallbackContent: "copy_link_button",
    });

    if (result.status === "shared" || result.status === "copied") {
      toast.success(result.status === "copied" ? copyMessage : successMessage);
      setDialogOpen(false);
    } else if (result.status === "failed" && (result.error as { name?: string })?.name !== "AbortError") {
      toast.error(errorMessage);
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className={cn("max-w-lg", className)}>
        <DialogHeader>
          <DialogTitle>Share with tracking</DialogTitle>
          <DialogDescription>
            Pick a platform to use that platform as UTM source. Native share cannot reveal the selected app.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Platforms</div>
              <Badge variant="outline">utm_source = platform</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {platforms.map((platform) => {
                const Icon = getPlatformIcon(platform);
                return (
                  <Button
                    key={platform.platform_key}
                    type="button"
                    variant="outline"
                    className="h-12 justify-start gap-2"
                    onClick={() => void runPlatformShare(platform)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="truncate">{platform.label}</span>
                  </Button>
                );
              })}
              {platforms.length === 0 ? (
                <div className="col-span-full rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No enabled platform templates. Use DevTool UTM setup to enable platforms.
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Utility actions</div>
              <Badge variant="secondary">share_method only</Badge>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {copyEnabled ? (
                <Button type="button" variant="secondary" className="h-12 justify-start gap-2" onClick={() => void runCopy()}>
                  <CopyIcon className="h-4 w-4" />
                  Copy tracked link
                </Button>
              ) : null}
              {nativeEnabled ? (
                <Button type="button" variant="secondary" className="h-12 justify-start gap-2" onClick={() => void runNative()}>
                  <ShareIcon className="h-4 w-4" />
                  Native share
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
