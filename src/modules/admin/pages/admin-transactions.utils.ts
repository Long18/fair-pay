type SettlementSplit = {
  id: string;
  computed_amount: number;
  is_settled: boolean;
  settled_amount: number;
};

export function getExpenseSettlementStatus(
  splits: Pick<SettlementSplit, "is_settled">[],
  fallbackStatus: boolean,
) {
  if (splits.length === 0) {
    return fallbackStatus;
  }

  return splits.every((split) => split.is_settled);
}

export function applySplitSettlementChange(
  splits: SettlementSplit[],
  splitId: string,
  isSettled: boolean,
) {
  return splits.map((split) =>
    split.id === splitId
      ? {
          ...split,
          is_settled: isSettled,
          settled_amount: isSettled ? split.computed_amount : 0,
        }
      : split,
  );
}

export function applySplitSettlementChangeTyped<T extends SettlementSplit>(
  splits: T[],
  splitId: string,
  isSettled: boolean,
) {
  return applySplitSettlementChange(splits, splitId, isSettled) as T[];
}
