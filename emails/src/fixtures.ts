import type { BuildReminderViewModelInput, ReminderDebtBreakdownItem, ReminderGroupBreakdownItem } from "./types";
import { DEFAULT_APP_URL } from "./utils";

export interface ReminderFixture {
  id: string;
  label: string;
  input: BuildReminderViewModelInput;
}

const COMPUTED_AT = "2026-10-30T04:00:00.000Z";

function debt(key: string, name: string, amount: number, email: string | null = null, currency = "VND"): ReminderDebtBreakdownItem {
  return { counterpartyKey: key, counterpartyName: name, counterpartyEmail: email, amount, currency };
}

function group(id: string, name: string, counterparties: ReminderDebtBreakdownItem[]): ReminderGroupBreakdownItem {
  return {
    groupId: id,
    groupName: name,
    subtotalAmount: counterparties.reduce((sum, item) => sum + item.amount, 0),
    currency: counterparties[0]?.currency ?? "VND",
    counterparties,
  };
}

const minh = debt("u-minh", "Minh Tuấn", 350000, "minhtuan@example.com");
const lan = debt("u-lan", "Lan Anh", 250000, "lananh@example.com");
const huy = debt("u-huy", "Quang Huy", 250000, "quanghuy@example.com");

const sampleContext = {
  totalAmount: 850000,
  debtBreakdown: [minh, lan, huy],
  groupBreakdown: [group("g-danang", "Chuyến Đà Nẵng 2026", [minh, lan]), group("g-q2", "Chi phí sinh hoạt Q2", [huy])],
  primaryCurrency: "VND",
  senderDisplayName: "Long",
  primaryGroupName: "Chuyến Đà Nẵng 2026",
  computedAt: COMPUTED_AT,
};

const registered = { name: "An", hasAccount: true };
const guest = { name: "An", hasAccount: false };

const sevenPeople = [
  debt("u-1", "Minh Tuấn", 350000),
  debt("u-2", "Lan Anh", 250000),
  debt("u-3", "Quang Huy", 200000),
  debt("u-4", "Bảo Ngọc", 150000),
  debt("u-5", "Đức Anh", 120000),
  debt("u-6", "Hải Yến", 90000),
  debt("u-7", "Gia Huy", 40000),
];

const twinA = debt("u-long-a", "Long", 300000, "long.a@gmail.com");
const twinB = debt("u-long-b", "Long", 200000, "lnguyen@yahoo.com");

const multiGroupMinh = [debt("u-minh", "Minh Tuấn", 100000), debt("u-minh", "Minh Tuấn", 80000), debt("u-minh", "Minh Tuấn", 20000)];

/** F2: the 850.000 ₫ / 3 người / 2 nhóm sample used across previews. */
export const sampleReminderInput: BuildReminderViewModelInput = {
  recipient: registered,
  appUrl: DEFAULT_APP_URL,
  context: sampleContext,
};

export const reminderFixtures: ReminderFixture[] = [
  {
    id: "F1",
    label: "1 người · registered",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      context: {
        ...sampleContext,
        totalAmount: 350000,
        debtBreakdown: [minh],
        groupBreakdown: [group("g-danang", "Chuyến Đà Nẵng 2026", [minh])],
      },
    },
  },
  { id: "F2", label: "3 người / 2 nhóm · registered", input: sampleReminderInput },
  { id: "F3", label: "3 người / 2 nhóm · guest", input: { recipient: guest, appUrl: DEFAULT_APP_URL, context: sampleContext } },
  {
    id: "F4",
    label: "7 người (overflow)",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      context: {
        ...sampleContext,
        totalAmount: 1200000,
        debtBreakdown: sevenPeople,
        groupBreakdown: [group("g-danang", "Chuyến Đà Nẵng 2026", sevenPeople)],
      },
    },
  },
  {
    id: "F5",
    label: "Trùng tên hiển thị",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      context: {
        ...sampleContext,
        totalAmount: 500000,
        debtBreakdown: [twinA, twinB],
        groupBreakdown: [group("g-danang", "Chuyến Đà Nẵng 2026", [twinA, twinB])],
      },
    },
  },
  {
    id: "F6",
    label: "1 người ở 3 nhóm",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      context: {
        ...sampleContext,
        totalAmount: 200000,
        debtBreakdown: [debt("u-minh", "Minh Tuấn", 200000)],
        groupBreakdown: [
          group("g-danang", "Chuyến Đà Nẵng 2026", [multiGroupMinh[0]]),
          group("g-q2", "Chi phí sinh hoạt Q2", [multiGroupMinh[1]]),
          group("g-bbq", "BBQ cuối tuần", [multiGroupMinh[2]]),
        ],
      },
    },
  },
  {
    id: "F7",
    label: "Guest thiếu sender/group",
    input: {
      recipient: guest,
      appUrl: DEFAULT_APP_URL,
      context: { ...sampleContext, senderDisplayName: null, primaryGroupName: null },
    },
  },
  {
    id: "F8",
    label: "Thiếu computed_at",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      notificationCreatedAt: "2026-10-29T13:30:00.000Z",
      context: { ...sampleContext, computedAt: null },
    },
  },
  {
    id: "F9",
    label: "Multi-currency (skip)",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      context: { ...sampleContext, debtBreakdown: [minh, debt("u-bob", "Bob", 20, null, "USD")] },
    },
  },
  {
    id: "F10",
    label: "Counterparty thiếu tên",
    input: {
      recipient: registered,
      appUrl: DEFAULT_APP_URL,
      context: {
        ...sampleContext,
        totalAmount: 600000,
        debtBreakdown: [minh, debt("u-x", "", 250000, "lananh@gmail.com")],
        groupBreakdown: [group("g-danang", "Chuyến Đà Nẵng 2026", [minh])],
      },
    },
  },
  {
    id: "F12",
    label: "Snapshot total lệch (warn)",
    input: { recipient: registered, appUrl: DEFAULT_APP_URL, context: { ...sampleContext, totalAmount: 900000 } },
  },
];

/** Fixtures that render a real email (F9 is skipped by the worker, F11 is a digest row). */
const RENDERABLE_FIXTURE_IDS = new Set(["F1", "F2", "F3", "F4", "F5", "F6", "F7", "F8", "F10"]);

export const renderableReminderFixtures = reminderFixtures.filter((fixture) => RENDERABLE_FIXTURE_IDS.has(fixture.id));
