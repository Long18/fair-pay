export function unparsableModelResponse(language?: string): string {
  return language?.startsWith("vi")
    ? "Không đọc được phản hồi từ mô hình cục bộ. Hãy thử lại."
    : "I could not parse the local model response safely. Please try again.";
}

export function workflowIncompleteMessage(language?: string): string {
  return language?.startsWith("vi")
    ? "Không thể hoàn tất yêu cầu an toàn. Hãy thử lại với ít thay đổi hơn."
    : "I could not complete this workflow safely. Please try again with fewer changes.";
}

export function groupPreviewReadyMessage(language?: string): string {
  return language?.startsWith("vi")
    ? "Preview chi tiêu nhóm đã sẵn sàng — hãy xác nhận trên thẻ bên dưới."
    : "Group expense preview is ready — confirm using the card below.";
}
