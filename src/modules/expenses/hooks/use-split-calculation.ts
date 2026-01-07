import { useState, useCallback, useMemo } from "react";
import { ParticipantSplit } from "../types";

export interface SplitCalculation {
  participants: ParticipantSplit[];
  addParticipant: (userId: string) => void;
  removeParticipant: (userId: string) => void;
  setSplitValue: (userId: string, value: number) => void;
  recalculate: (amount: number, method: 'equal' | 'exact' | 'percentage') => void;
  isValid: boolean;
  totalSplit: number;
}

export const useSplitCalculation = (initialSplits?: ParticipantSplit[]): SplitCalculation => {
  const [participants, setParticipants] = useState<ParticipantSplit[]>(initialSplits || []);

  const addParticipant = useCallback((userId: string) => {
    // Guard against undefined/null userId
    if (!userId) {
      console.warn('[useSplitCalculation] Attempted to add participant with invalid userId:', userId);
      return;
    }

    setParticipants(prev => {
      if (prev.find(p => p.user_id === userId)) {
        return prev;
      }
      return [...prev, { user_id: userId, split_value: 0, computed_amount: 0 }];
    });
  }, []);

  const removeParticipant = useCallback((userId: string) => {
    setParticipants(prev => prev.filter(p => p.user_id !== userId));
  }, []);

  const setSplitValue = useCallback((userId: string, value: number) => {
    setParticipants(prev =>
      prev.map(p =>
        p.user_id === userId
          ? { ...p, split_value: value }
          : p
      )
    );
  }, []);

  const recalculate = useCallback((amount: number, method: 'equal' | 'exact' | 'percentage') => {
    setParticipants(prev => {
      if (prev.length === 0 || amount <= 0) return prev;

      switch (method) {
        case 'equal': {
          const perPerson = Math.round((amount / prev.length) * 100) / 100;
          const remainder = Math.round((amount - perPerson * prev.length) * 100) / 100;

          return prev.map((p, index) => ({
            ...p,
            split_value: undefined,
            computed_amount: index === 0 ? perPerson + remainder : perPerson,
          }));
        }

        case 'exact': {
          return prev.map(p => ({
            ...p,
            computed_amount: p.split_value || 0,
          }));
        }

        case 'percentage': {
          return prev.map(p => {
            const percentage = p.split_value || 0;
            const computed = Math.round((amount * percentage / 100) * 100) / 100;
            return {
              ...p,
              computed_amount: computed,
            };
          });
        }

        default:
          return prev;
      }
    });
  }, []);

  const totalSplit = useMemo(() => {
    return participants.reduce((sum, p) => sum + (p.computed_amount || 0), 0);
  }, [participants]);

  const isValid = useMemo(() => {
    if (participants.length === 0) return false;
    // Allow small rounding differences (1 cent)
    return Math.abs(totalSplit) > 0;
  }, [participants.length, totalSplit]);

  return {
    participants,
    addParticipant,
    removeParticipant,
    setSplitValue,
    recalculate,
    isValid,
    totalSplit,
  };
};
