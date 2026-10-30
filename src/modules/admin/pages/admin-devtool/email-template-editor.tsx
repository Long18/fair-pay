import "@react-email/editor/themes/default.css";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { EmailEditor } from "@react-email/editor";
import {
  cleanEditorHtml,
  defaultDebtReminderContent,
  defaultInviteContent,
  sampleReminderInput,
  type RenderedEmail,
} from "@fairpay/emails";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CopyIcon, DownloadIcon, RotateCcwIcon } from "@/components/ui/icons";
import { buildInviteEmailPreview } from "@/modules/admin/email/invite-email";
import { buildReminderEmailPreview } from "@/modules/admin/email/reminder-email";
import { useRenderedEmail } from "@/modules/admin/email/use-rendered-email";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { useAdminTranslation } from "../../i18n";
import { EmailPreviewFrame, EmailPreviewViewportToggle } from "./email-preview-ui";
import type { PreviewViewport } from "./types";

type TemplateId = "invite" | "debt-reminder";
type TemplateContent = Record<string, string>;
type Drafts = Record<TemplateId, TemplateContent>;

const DRAFTS_STORAGE_KEY = "fairpay_admin_email_template_drafts";

const TEMPLATES: Record<TemplateId, { file: string; defaults: TemplateContent; placeholders: string[] }> = {
  invite: {
    file: "invite.static.json",
    defaults: { ...defaultInviteContent },
    placeholders: ["inviterName", "appUrl"],
  },
  "debt-reminder": {
    file: "debt-reminder.static.json",
    defaults: { ...defaultDebtReminderContent },
    placeholders: ["total", "counterpartyCount", "namesPreview", "asOf", "userName", "senderName", "groupName", "n", "year"],
  },
};

const isRichField = (key: string) => key.endsWith("Html");

function readStoredDrafts(): Drafts {
  const defaults: Drafts = { invite: TEMPLATES.invite.defaults, "debt-reminder": TEMPLATES["debt-reminder"].defaults };
  try {
    const raw = window.localStorage.getItem(DRAFTS_STORAGE_KEY);
    if (!raw) return defaults;
    const stored = JSON.parse(raw) as Partial<Drafts>;
    return {
      invite: { ...defaults.invite, ...stored.invite },
      "debt-reminder": { ...defaults["debt-reminder"], ...stored["debt-reminder"] },
    };
  } catch {
    return defaults;
  }
}

function serializeContent(content: TemplateContent): string {
  return `${JSON.stringify(content, null, 2)}\n`;
}

interface PreviewRequest {
  template: TemplateId;
  content: TemplateContent;
  appUrl: string;
}

function renderTemplatePreview({ template, content, appUrl }: PreviewRequest): Promise<RenderedEmail> {
  if (template === "invite") {
    return buildInviteEmailPreview({ emails: [], inviterName: "Long", appUrl, content });
  }
  return buildReminderEmailPreview({ ...sampleReminderInput, appUrl, content });
}

export function AdminEmailTemplateEditor() {
  const { tAdmin } = useAdminTranslation();
  const [template, setTemplate] = useState<TemplateId>("invite");
  const [drafts, setDrafts] = useState<Drafts>(readStoredDrafts);
  const [richField, setRichField] = useState<string | null>(null);
  const [viewport, setViewport] = useState<PreviewViewport>("desktop");
  const [editorEpoch, setEditorEpoch] = useState(0);

  const { file, defaults, placeholders } = TEMPLATES[template];
  const content = drafts[template];
  const fieldKeys = useMemo(() => Object.keys(defaults), [defaults]);
  const plainFields = fieldKeys.filter((key) => !isRichField(key));
  const richFields = fieldKeys.filter(isRichField);
  const activeRichField = richField && richFields.includes(richField) ? richField : richFields[0];
  const isEdited = serializeContent(content) !== serializeContent(defaults);

  useEffect(() => {
    try {
      window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // Storage full or disabled; the in-memory draft still drives the preview.
    }
  }, [drafts]);

  // Functional updates: the editor may hold on to the first onUpdate it receives.
  const updateField = useCallback((target: TemplateId, key: string, value: string) => {
    setDrafts((prev) => (
      prev[target][key] === value ? prev : { ...prev, [target]: { ...prev[target], [key]: value } }
    ));
  }, []);

  const previewRequest = useMemo<PreviewRequest>(
    () => ({ template, content, appUrl: window.location.origin }),
    [template, content],
  );
  const deferredRequest = useDeferredValue(previewRequest);
  const preview = useRenderedEmail(deferredRequest, renderTemplatePreview);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(serializeContent(content));
      toast.success(tAdmin("layout.devtoolTools.emailTemplates.copied"));
    } catch {
      toast.error(tAdmin("layout.devtoolTools.emailTemplates.copyFailed"));
    }
  }, [content, tAdmin]);

  const handleDownload = useCallback(() => {
    const url = URL.createObjectURL(new Blob([serializeContent(content)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = file;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [content, file]);

  const handleReset = useCallback(() => {
    setDrafts((prev) => ({ ...prev, [template]: defaults }));
    setEditorEpoch((epoch) => epoch + 1);
  }, [defaults, template]);

  return (
    <div className="space-y-4">
      <AdminPageHeader
        density="section"
        title={tAdmin("layout.devtoolTools.emailTemplates.title")}
        description={tAdmin("layout.devtoolTools.emailTemplates.description")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={!isEdited}>
              <RotateCcwIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {tAdmin("layout.devtoolTools.emailTemplates.reset")}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              <CopyIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {tAdmin("layout.devtoolTools.emailTemplates.copyJson")}
            </Button>
            <Button type="button" size="sm" onClick={handleDownload}>
              <DownloadIcon className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {tAdmin("layout.devtoolTools.emailTemplates.downloadJson")}
            </Button>
          </div>
        }
      />

      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[14rem] flex-1 space-y-1.5">
              <Label htmlFor="email-template-select">{tAdmin("layout.devtoolTools.emailTemplates.template")}</Label>
              <Select value={template} onValueChange={(value) => setTemplate(value as TemplateId)}>
                <SelectTrigger id="email-template-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invite">{tAdmin("layout.devtoolTools.emailTemplates.templateInvite")}</SelectItem>
                  <SelectItem value="debt-reminder">
                    {tAdmin("layout.devtoolTools.emailTemplates.templateDebtReminder")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {isEdited ? <Badge variant="secondary">{tAdmin("layout.devtoolTools.emailTemplates.edited")}</Badge> : null}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <span>{tAdmin("layout.devtoolTools.emailTemplates.placeholders")}:</span>
            {placeholders.map((token) => (
              <code key={token} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground">
                {`{{${token}}}`}
              </code>
            ))}
          </div>

          {activeRichField ? (
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">{tAdmin("layout.devtoolTools.emailTemplates.richContent")}</p>
              <div className="flex flex-wrap gap-1" role="group" aria-label={tAdmin("layout.devtoolTools.emailTemplates.richContent")}>
                {richFields.map((key) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant={key === activeRichField ? "secondary" : "ghost"}
                    className="h-7 px-2 font-mono text-xs"
                    aria-pressed={key === activeRichField}
                    onClick={() => setRichField(key)}
                  >
                    {key}
                  </Button>
                ))}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">{tAdmin("layout.devtoolTools.emailTemplates.richHint")}</p>
            <div className="min-h-40 rounded-md border bg-white p-3 text-slate-900">
              <EmailEditor
                key={`${template}:${activeRichField}:${editorEpoch}`}
                content={content[activeRichField] ?? ""}
                onUpdate={(ref) => updateField(template, activeRichField, cleanEditorHtml(ref.editor?.getHTML() ?? ""))}
              />
            </div>
          </div>
          ) : null}

          <div className="space-y-3 rounded-lg border p-3">
            <p className="text-sm font-medium">{tAdmin("layout.devtoolTools.emailTemplates.textFields")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {plainFields.map((key) => {
                const value = content[key] ?? "";
                const inputId = `email-template-${template}-${key}`;
                return (
                  <div key={key} className="min-w-0 space-y-1">
                    <Label htmlFor={inputId} className="font-mono text-xs">
                      {key}
                    </Label>
                    {value.length > 60 ? (
                      <Textarea
                        id={inputId}
                        value={value}
                        rows={3}
                        onChange={(event) => updateField(template, key, event.target.value)}
                      />
                    ) : (
                      <Input id={inputId} value={value} onChange={(event) => updateField(template, key, event.target.value)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            {tAdmin("layout.devtoolTools.emailTemplates.exportHint", { file })}
          </p>
        </section>

        <section className="flex min-h-[32rem] min-w-0 flex-col gap-2 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">{tAdmin("layout.devtoolTools.emailTemplates.livePreview")}</p>
              <p className="truncate text-xs text-muted-foreground" translate="no">
                {preview?.subject ?? "…"}
              </p>
            </div>
            <EmailPreviewViewportToggle value={viewport} onChange={setViewport} tAdmin={tAdmin} />
          </div>
          <EmailPreviewFrame
            html={preview?.html ?? ""}
            title={tAdmin("layout.devtoolTools.emailTemplates.previewFrame")}
            viewport={viewport}
            tall
          />
        </section>
      </div>
    </div>
  );
}
