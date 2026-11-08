export function buildCapabilitiesMessage(language?: string): string {
  const vi = language?.startsWith("vi") ?? false;

  if (vi) {
    return [
      "**FairPay Assistant — việc tôi làm được (dữ liệu thật từ tài khoản bạn):**",
      "",
      "1. **Công nợ** — ai nợ ai, số dư với từng người",
      "2. **Nhóm** — nhóm bạn tham gia; chi tiết một nhóm (nếu bạn gửi tên nhóm)",
      "3. **Bạn bè** — danh sách bạn FairPay",
      "4. **Chi tiêu** — khoản chi gần đây / top chi",
      "5. **Bình luận** — feed bình luận trên chi phí gần đây (không phải bình luận nhóm)",
      "6. **Preview chi nhóm** — bạn mô tả số tiền + ngữ cảnh → thẻ xác nhận trong chat (không tự thanh toán)",
      "",
      "**Không làm qua chat:** settle/thanh toán, xác nhận commit tiền, đổi cài đặt.",
      "",
      "Thử ngay: gõ **\"Tổng hợp FairPay\"** để xem nợ + nhóm + bạn bè + chi + bình luận trong một câu trả lời.",
      "Hoặc hỏi cụ thể: *Ai đang nợ tôi?* · *Tôi tham gia nhóm nào?* · *Top 5 chi tiêu*",
    ].join("\n");
  }

  return [
    "**FairPay Assistant — what I can do (real data from your account):**",
    "",
    "1. **Balances & debt** — who owes whom",
    "2. **Groups** — your groups; details for a named group",
    "3. **Friends** — your FairPay connections",
    "4. **Expenses** — recent / top spending",
    "5. **Comments** — recent expense comment feed (not group chat)",
    "6. **Group expense preview** — you describe amount & context → confirm via the chat card (no auto payment)",
    "",
    "**Not in chat:** settle/pay, money commit, settings changes.",
    "",
    "Try: **\"FairPay summary\"** for debt + groups + friends + expenses + comments in one reply.",
    "Or ask: *Who owes me?* · *Which groups am I in?* · *Top 5 expenses*",
  ].join("\n");
}
