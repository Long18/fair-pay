import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { supabaseClient } from "@/utility/supabaseClient";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2Icon } from "@/components/ui/icons";
import { LoadingBeam } from "@/components/ui/loading-beam";
import { useHaptics } from "@/hooks/use-haptics";

// ─── Zod Schema ───────────────────────────────────────────────────

const donationSettingsSchema = z.object({
  is_enabled: z.boolean(),
  avatar_image_url: z
    .string()
    .url("URL ảnh avatar không hợp lệ")
    .or(z.literal("")),
  qr_code_image_url: z
    .string()
    .url("URL ảnh QR code không hợp lệ")
    .or(z.literal("")),
  cta_text_en: z.string().min(1, "CTA text (EN) không được để trống"),
  cta_text_vi: z.string().min(1, "CTA text (VI) không được để trống"),
  donate_message_en: z.string().min(1, "Thông điệp (EN) không được để trống"),
  donate_message_vi: z.string().min(1, "Thông điệp (VI) không được để trống"),
  bank_name: z.string(),
  account_number: z.string(),
  account_holder: z.string(),
});

type DonationSettingsFormValues = z.infer<typeof donationSettingsSchema>;

// ─── Image Preview ────────────────────────────────────────────────

function ImagePreview({ url }: { url: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [url]);

  if (!url || hasError) return null;

  try {
    new URL(url);
  } catch {
    return null;
  }

  return (
    <img
      src={url}
      alt="Preview"
      className="mt-2 h-20 w-20 rounded-md border object-cover"
      onError={() => setHasError(true)}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────

const SETTINGS_QUERY_KEY = ["admin", "donation-settings"];

export function AdminDonationSettings() {
  const queryClient = useQueryClient();
  const { tap, success } = useHaptics();

  const { data: settings, isLoading } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("donation_settings")
        .select("*")
        .single();
      if (error) {
        if (error.code === "PGRST116") return null; // no rows
        throw error;
      }
      return data;
    },
    staleTime: 60_000,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      if (!settings?.id) throw new Error("No donation settings row found");
      const { data, error } = await supabaseClient
        .from("donation_settings")
        .update(values)
        .eq("id", settings.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SETTINGS_QUERY_KEY });
    },
  });

  const form = useForm<DonationSettingsFormValues>({
    resolver: zodResolver(donationSettingsSchema),
    defaultValues: {
      is_enabled: false,
      avatar_image_url: "",
      qr_code_image_url: "",
      cta_text_en: "",
      cta_text_vi: "",
      donate_message_en: "",
      donate_message_vi: "",
      bank_name: "",
      account_number: "",
      account_holder: "",
    },
  });

  // Populate form when data loads
  useEffect(() => {
    if (!settings) return;
    const ctaText = settings.cta_text ?? { en: "", vi: "" };
    const donateMsg = settings.donate_message ?? { en: "", vi: "" };
    const bankInfo = settings.bank_info ?? {
      bank_name: "",
      account_number: "",
      account_holder: "",
    };

    form.reset({
      is_enabled: settings.is_enabled ?? false,
      avatar_image_url: settings.avatar_image_url ?? "",
      qr_code_image_url: settings.qr_code_image_url ?? "",
      cta_text_en: ctaText.en ?? "",
      cta_text_vi: ctaText.vi ?? "",
      donate_message_en: donateMsg.en ?? "",
      donate_message_vi: donateMsg.vi ?? "",
      bank_name: bankInfo.bank_name ?? "",
      account_number: bankInfo.account_number ?? "",
      account_holder: bankInfo.account_holder ?? "",
    });
  }, [settings, form]);

  const onSubmit = useCallback(
    (values: DonationSettingsFormValues) => {
      updateMutation.mutate(
        {
          is_enabled: values.is_enabled,
          avatar_image_url: values.avatar_image_url || null,
          qr_code_image_url: values.qr_code_image_url || null,
          cta_text: { en: values.cta_text_en, vi: values.cta_text_vi },
          donate_message: {
            en: values.donate_message_en,
            vi: values.donate_message_vi,
          },
          bank_info: values.bank_name
            ? {
                bank_name: values.bank_name,
                account_number: values.account_number,
                account_holder: values.account_holder,
              }
            : null,
        },
        {
          onSuccess: () => {
            success();
            toast.success("Đã lưu cài đặt quyên góp thành công");
          },
          onError: (error) => {
            toast.error(
              `Lỗi: ${error.message ?? "Không thể lưu cài đặt"}`
            );
          },
        }
      );
    },
    [updateMutation]
  );

  const avatarUrl = form.watch("avatar_image_url");
  const qrCodeUrl = form.watch("qr_code_image_url");
  const isSaving = updateMutation.isPending;

  if (isLoading) {
    return (
      <LoadingBeam text="Đang tải cài đặt..." />
    );
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* ── Cài đặt chung ── */}
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt chung</CardTitle>
              <CardDescription>
                Bật hoặc tắt tính năng quyên góp trên ứng dụng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="is_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Bật quyên góp
                      </FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={(v) => { tap(); field.onChange(v); }}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Hình ảnh ── */}
          <Card>
            <CardHeader>
              <CardTitle>Hình ảnh</CardTitle>
              <CardDescription>
                Ảnh avatar và mã QR hiển thị trên widget quyên góp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="avatar_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avatar URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/avatar.png"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <ImagePreview url={field.value} />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="qr_code_image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>QR Code URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://example.com/qr-code.png"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <ImagePreview url={field.value} />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Nội dung ── */}
          <Card>
            <CardHeader>
              <CardTitle>Nội dung</CardTitle>
              <CardDescription>
                Nội dung CTA và thông điệp quyên góp theo ngôn ngữ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="vi" className="w-full">
                <TabsList>
                  <TabsTrigger value="vi">VI</TabsTrigger>
                  <TabsTrigger value="en">EN</TabsTrigger>
                </TabsList>

                <TabsContent value="vi" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="cta_text_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CTA Text (VI)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ủng hộ FairPay"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="donate_message_vi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Thông điệp quyên góp (VI)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Cảm ơn bạn đã ủng hộ..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>

                <TabsContent value="en" className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="cta_text_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CTA Text (EN)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Support FairPay"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="donate_message_en"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Donate Message (EN)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Thank you for your support..."
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* ── Thông tin ngân hàng ── */}
          <Card>
            <CardHeader>
              <CardTitle>Thông tin ngân hàng</CardTitle>
              <CardDescription>
                Thông tin tài khoản ngân hàng nhận quyên góp
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="bank_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên ngân hàng</FormLabel>
                    <FormControl>
                      <Input placeholder="Vietcombank" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số tài khoản</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567890" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="account_holder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chủ tài khoản</FormLabel>
                    <FormControl>
                      <Input placeholder="NGUYEN VAN A" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* ── Submit ── */}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving && (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSaving ? "Đang lưu..." : "Lưu cài đặt"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
