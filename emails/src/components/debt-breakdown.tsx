import { Img } from "react-email";
import type { ReminderDebtBreakdownItem, ReminderDebtTransaction, ReminderGroupBreakdownItem } from "../types";
import { formatCurrency, formatDate, getInitials, normalizeHref } from "../utils";

const MAX_TRANSACTIONS = 5;

function TransactionRows({ transactions, fallbackCurrency }: { transactions: ReminderDebtTransaction[]; fallbackCurrency: string }) {
  return (
    <>
      {transactions.slice(0, MAX_TRANSACTIONS).map((transaction, index) => {
        const date = formatDate(transaction.expenseDate);
        return (
          <tr key={`${transaction.description}-${index}`}>
            <td style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0" }}>
              <div style={{ fontSize: "13px", lineHeight: 1.45, fontWeight: 600, color: "#334155" }}>
                {transaction.description || "Chi phí"}
              </div>
              {date ? <div style={{ fontSize: "11px", lineHeight: 1.45, color: "#94a3b8" }}>{date}</div> : null}
            </td>
            <td
              align="right"
              style={{ padding: "8px 0", borderTop: "1px solid #e2e8f0", whiteSpace: "nowrap", fontSize: "13px", fontWeight: 700, color: "#0f172a" }}
            >
              {formatCurrency(transaction.amount, transaction.currency || fallbackCurrency)}
            </td>
          </tr>
        );
      })}
    </>
  );
}

export function CounterpartyRows({ counterparties, compact }: { counterparties: ReminderDebtBreakdownItem[]; compact?: boolean }) {
  const cellPadding = compact ? "10px 0" : "12px 0";

  return (
    <>
      {counterparties.map((item, index) => {
        const currency = item.currency || "VND";
        const transactions = item.transactions || [];
        return (
          <tbody key={`${item.counterpartyName}-${index}`}>
            <tr>
              <td style={{ padding: cellPadding, borderBottom: "1px solid #eef2f7" }}>
                <div style={{ fontSize: "13px", lineHeight: 1.5, color: "#475569" }}>Bạn cần trả / You owe</div>
                <div style={{ fontSize: "15px", lineHeight: 1.45, fontWeight: 700, color: "#0f172a" }}>
                  {item.counterpartyName || "Không rõ"}
                </div>
                {item.counterpartyEmail ? (
                  <div style={{ fontSize: "12px", lineHeight: 1.45, color: "#64748b" }}>{item.counterpartyEmail}</div>
                ) : null}
              </td>
              <td align="right" style={{ padding: cellPadding, borderBottom: "1px solid #eef2f7", whiteSpace: "nowrap" }}>
                <div style={{ fontSize: "16px", lineHeight: 1.45, fontWeight: 800, color: "#f43f5e" }}>
                  {formatCurrency(item.amount, currency)}
                </div>
              </td>
            </tr>
            {transactions.length ? (
              <tr>
                <td colSpan={2} style={{ padding: "0 0 14px", borderBottom: "1px solid #eef2f7" }}>
                  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation" style={{ borderRadius: "14px", background: "#ffffff", padding: "2px 12px" }}>
                    <tbody>
                      <TransactionRows transactions={transactions} fallbackCurrency={currency} />
                    </tbody>
                  </table>
                </td>
              </tr>
            ) : null}
          </tbody>
        );
      })}
    </>
  );
}

function GroupAvatar({ group }: { group: ReminderGroupBreakdownItem }) {
  const name = group.groupName || "Group";
  if (group.groupAvatarUrl) {
    return (
      <Img
        src={group.groupAvatarUrl}
        width="48"
        height="48"
        alt={name}
        style={{ display: "block", width: "48px", height: "48px", borderRadius: "999px", objectFit: "cover", border: "1px solid #e2e8f0" }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      style={{
        width: "48px",
        height: "48px",
        borderRadius: "999px",
        background: "#e0e7ff",
        color: "#4338ca",
        fontSize: "16px",
        lineHeight: "48px",
        fontWeight: 800,
        textAlign: "center",
      }}
    >
      {getInitials(group.groupName || "FairPay")}
    </div>
  );
}

function GroupHeader({ group }: { group: ReminderGroupBreakdownItem }) {
  return (
    <table className="group-header-table" width="100%" cellPadding={0} cellSpacing={0} role="presentation">
      <tbody>
        <tr>
          <td className="group-header-avatar" width="58" valign="top">
            <GroupAvatar group={group} />
          </td>
          <td valign="middle">
            <div style={{ fontSize: "12px", lineHeight: 1.5, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800 }}>
              Group
            </div>
            <div style={{ fontSize: "17px", lineHeight: 1.4, fontWeight: 800, color: "#0f172a" }}>
              {group.groupName || "Direct / Ngoài group"}
            </div>
          </td>
          <td className="group-header-amount" align="right" valign="middle" style={{ whiteSpace: "nowrap" }}>
            <div style={{ fontSize: "11px", lineHeight: 1.5, color: "#64748b" }}>Chưa settle / Outstanding</div>
            <div style={{ fontSize: "18px", lineHeight: 1.3, fontWeight: 900, color: "#f43f5e" }}>
              {formatCurrency(group.subtotalAmount, group.currency || "VND")}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function GroupDebtSections({ groups, appUrl }: { groups: ReminderGroupBreakdownItem[]; appUrl: string }) {
  return (
    <>
      {groups.map((group, index) => {
        const groupHref = group.groupId ? normalizeHref(appUrl, `/groups/${group.groupId}`) : undefined;
        return (
          <table
            key={`${group.groupId ?? group.groupName}-${index}`}
            className="group-card"
            data-email-block="group-debt-card"
            width="100%"
            cellPadding={0}
            cellSpacing={0}
            role="presentation"
            style={{ marginTop: "14px", border: "1px solid #e2e8f0", borderRadius: "20px", background: "#ffffff", padding: "0 16px" }}
          >
            <tbody>
              <tr>
                <td style={{ padding: "16px 0 12px" }}>
                  {groupHref ? (
                    <a href={groupHref} style={{ display: "block", textDecoration: "none", color: "inherit" }}>
                      <GroupHeader group={group} />
                    </a>
                  ) : (
                    <GroupHeader group={group} />
                  )}
                </td>
              </tr>
              <tr>
                <td>
                  <table width="100%" cellPadding={0} cellSpacing={0} role="presentation">
                    <CounterpartyRows counterparties={group.counterparties} compact />
                  </table>
                </td>
              </tr>
            </tbody>
          </table>
        );
      })}
    </>
  );
}

export function LegacyDebtList({ debts }: { debts: ReminderDebtBreakdownItem[] }) {
  return (
    <table
      data-email-block="legacy-debt-list"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      role="presentation"
      style={{ marginTop: "14px", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "0 16px", background: "#ffffff" }}
    >
      <CounterpartyRows counterparties={debts} />
    </table>
  );
}
