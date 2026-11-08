# Ma trận QA — FairPay Assistant (một chat mới / mỗi case)

Thứ tự **dễ → khó**. Mỗi dòng: mở assistant → **Chat mới** → gửi đúng câu → ghi nhận kết quả.

## Cách chạy thủ công (UI)

1. Đăng nhập app (`pnpm dev` → http://localhost:3000).
2. Mở **FairPay Assistant** (FAB / panel).
3. Menu ⋮ hoặc **Chat mới** (không reuse thread cũ — thread cũ có thể còn UI/metadata trước fix).
4. Gửi câu trong bảng (copy nguyên văn).
5. Chờ nút gửi bật lại và assistant trả lời xong.
6. Ghi lại:
   - **Surface:** `ChatEntityListCard` (kind), `ReadDigestCard`, `AssistantCapabilitiesCard`, hoặc markdown thuần.
   - **Tool trace:** số tool + tên (label trong bubble).
   - **Navigation:** bấm một hàng → URL đích (`/profile/…`, `/groups/show/…`, `/expenses/show/…`).

## Bảng case (copy-paste)

| ID | Mức | Prompt | UI mong đợi | Tool | Ghi chú navigation |
|----|-----|--------|-------------|------|-------------------|
| L1 | Dễ | `Ai đang nợ tôi?` | `entity_surface` balances | 1× `get_debt_summary` | Hàng balance → profile đối tác |
| L2 | Dễ | `Tôi đang tham gia nhóm nào?` | groups | 1× `fairpay_list_groups` | Hàng nhóm → `/groups/show/{id}` |
| L3 | Dễ | `Tôi có những bạn nào?` | friends | 1× `get_friends` | Hàng bạn → profile |
| L4 | Dễ | `Top 5 khoản chi theo số tiền` | expenses | 1× `get_expenses` | Hàng chi tiêu → `/expenses/show/{id}` |
| L5 | Dễ | `bình luận mới gần đây` | `ChatEntityListCard` **comments** (empty feed → markdown) | 1× `get_recent_expense_comments` | `Mở chi tiêu …` |
| M1 | TB | `Tổng hợp FairPay` | `read_digest` | 5 tool digest | Mỗi section có hàng bấm được (nếu có data) |
| M2 | TB | `bạn có thể làm gì` | capabilities card | **0** tool | Pill gợi ý bấm được |
| H1 | Khó | `chi tiết nhóm House Rent 5` | markdown (chi tiết nhóm) | 2× list groups → details | Không dùng entity list card |
| H2 | Khó | `Who owes me money?` | balances (EN) | 1× debt | Giống L1 |
| H3 | Khó | `FairPay summary` | digest (EN) | 5× digest | Giống M1 |

## Phân tích tự động (orchestrator + mock data)

Chạy:

```bash
pnpm exec vitest run src/modules/ai-chat/orchestrator/__tests__/ai-chat-qa-matrix.test.ts
```

Test xác nhận **intent đầu**, **số tool**, và **loại surface metadata** (`entity_surface` / `read_digest` / `assistant_capabilities`) khớp bảng trên. Đây là lớp “phân tích kỹ thuật”; UI thực tế cần thêm một vòng QA thủ công trên session đã login.

## Khoảng trống sản phẩm (để theo dõi)

- **Thread cũ trong localStorage:** có thể không có `entity_surface` trên message cũ; luôn dùng **chat mới** khi regression UI.

## Kết quả chạy trên Dashboard (localhost, VI assistant chrome)

Ngày 2026-11-08 — session **Admin**, app nav EN, assistant theo `useAiChatDisplayLanguage` → **VI** (sidebar `Cuộc trò chuyện mới`, FAB `Mở Trợ lý FairPay`).

| ID | Pass | Surface / UI | Tools | Ghi chú i18n |
|----|------|----------------|-------|----------------|
| L1 | ✅ | Entity card **Công nợ** + `Mở hồ sơ` | 1 | Hint *Chạm một dòng…* |
| L2 | ✅ | **Nhóm của bạn** + `Mở nhóm …` | 1 | `Xem thêm 2 nhóm` |
| L3 | ✅ | **Bạn bè** + `Mở hồ sơ …` | 1 | `Xem thêm 42 bạn` |
| L4 | ✅ | **Top chi tiêu** + `Mở chi tiêu …` | 1 | Card + chevron rows |
| L5 | ✅ | Empty feed: **Markdown** `Không có bình luận…`; có data: **Bình luận chi phí gần đây** card | 1 | Entity card khi có bình luận |
| M2 | ✅ | **FairPay Assistant làm được gì** + pill shortcuts | 0 | Card + bullet VI |
| M1 | ✅ | **Tổng hợp FairPay** (`ReadDigestCard`: Người nợ bạn, Công nợ, Nhóm, Bạn bè, Top chi tiêu) | 5 | Trong thread `bạn có thể làm gì` sau pill *Tổng hợp đầy đủ* |
| H1 | ✅ | **Markdown** nhóm House Rent 5 (thành viên + Haircut 102 VND) | 2 | `Đã dùng 2 công cụ` |
| H2 | ✅ | Entity **Balances** + `Open profile for …` | 1 | Prompt EN → chrome EN (*Used 1 tools*, *Tap a row…*); card heading EN |
| H3 | ✅ | **FairPay summary** digest EN (You are owed, Balances, Groups, Friends, Top spending) | 5 | `Used 5 tools`, hint EN; section headings EN |

**Lưu ý automation:** Cursor browser tab hay **mất React shell** sau ~5–15s khi digest/WebLLM chạy; thread vẫn lưu localStorage — mở lại assistant → chọn conversation trên sidebar để kiểm tra.

**i18n `displayLanguage`:** Thread EN (H2/H3) → chrome EN (*New Chat*, *Used N tools*); thread VI → chrome VI (*Cuộc trò chuyện mới*, *Đã dùng N công cụ*). Nav app vẫn EN. Dialog close dùng `common.close` theo `displayLanguage`.

**i18n đã chỉnh trong code:** sidebar dùng cùng `displayLanguage` với luồng chat (`Cuộc trò chuyện mới`, `Tìm cuộc trò chuyện…`); FAB `Mở Trợ lý FairPay`; dialog a11y `Trợ lý FairPay` / subtitle VI; `ChatPanelContent` + mobile sheet title qua `t("aiChat.*")`.

## Mẫu ghi kết quả (điền thêm case còn lại)

| ID | Pass? | Surface thực tế | # tools | Lỗi / ghi chú |
|----|-------|-----------------|--------|---------------|
| L3 | | | | |
| L4 | | | | |
| … | | | | |
