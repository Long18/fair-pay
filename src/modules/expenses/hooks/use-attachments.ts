import { useState } from "react";
import { supabaseClient } from "@/utility/supabaseClient";
import { toast } from "sonner";
import { Attachment } from "../types";

export interface UploadAttachmentParams {
  file: File;
  expenseId: string;
  userId: string;
}

export const useAttachments = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  /**
   * Upload a file to Supabase Storage and create attachment record
   */
  const uploadAttachment = async ({
    file,
    expenseId,
    userId,
  }: UploadAttachmentParams): Promise<Attachment | null> => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generate unique file path: {userId}/{expenseId}/{timestamp}_{filename}
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `${userId}/${expenseId}/${timestamp}_${sanitizedFileName}`;

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabaseClient
        .storage
        .from("receipts")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (storageError) {
        throw new Error(`Storage upload failed: ${storageError.message}`);
      }

      setUploadProgress(50);

      // Create attachment record in database
      const { data: attachmentData, error: attachmentError } = await supabaseClient
        .from("attachments")
        .insert({
          expense_id: expenseId,
          storage_path: storagePath,
          file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
          created_by: userId,
        })
        .select()
        .single();

      if (attachmentError) {
        // Rollback: delete the uploaded file
        await supabaseClient.storage.from("receipts").remove([storagePath]);
        throw new Error(`Database insert failed: ${attachmentError.message}`);
      }

      setUploadProgress(100);
      return attachmentData as Attachment;
    } catch (error) {
      console.error("Upload attachment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload attachment");
      return null;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000);
    }
  };

  /**
   * Upload multiple attachments
   */
  const uploadAttachments = async (
    files: File[],
    expenseId: string,
    userId: string
  ): Promise<Attachment[]> => {
    const results: Attachment[] = [];

    for (const file of files) {
      const result = await uploadAttachment({ file, expenseId, userId });
      if (result) {
        results.push(result);
      }
    }

    if (results.length > 0) {
      toast.success(`${results.length} file(s) uploaded successfully`);
    }

    return results;
  };

  /**
   * Delete an attachment (removes from storage and database)
   */
  const deleteAttachment = async (attachment: Attachment): Promise<boolean> => {
    try {
      // Delete from database first
      const { error: dbError } = await supabaseClient
        .from("attachments")
        .delete()
        .eq("id", attachment.id);

      if (dbError) {
        throw new Error(`Database delete failed: ${dbError.message}`);
      }

      // Then delete from storage
      const { error: storageError } = await supabaseClient
        .storage
        .from("receipts")
        .remove([attachment.storage_path]);

      if (storageError) {
        console.error("Storage delete failed (file may not exist):", storageError);
        // Don't throw - database record is already deleted
      }

      toast.success("Attachment deleted");
      return true;
    } catch (error) {
      console.error("Delete attachment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete attachment");
      return false;
    }
  };

  /**
   * Get public URL for viewing an attachment
   */
  const getAttachmentUrl = (storagePath: string): string => {
    const { data } = supabaseClient
      .storage
      .from("receipts")
      .getPublicUrl(storagePath);

    return data.publicUrl;
  };

  /**
   * Download an attachment
   */
  const downloadAttachment = async (attachment: Attachment): Promise<void> => {
    try {
      const { data, error } = await supabaseClient
        .storage
        .from("receipts")
        .download(attachment.storage_path);

      if (error) {
        throw new Error(`Download failed: ${error.message}`);
      }

      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error) {
      console.error("Download attachment error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to download attachment");
    }
  };

  return {
    uploadAttachment,
    uploadAttachments,
    deleteAttachment,
    getAttachmentUrl,
    downloadAttachment,
    isUploading,
    uploadProgress,
  };
};
