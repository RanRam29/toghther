import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { UserRole } from "@/lib/types";
import type { FrameworkType, NeedCategory } from "@/lib/constants/child";

/**
 * Persisted draft of the 6-step parent (child-profile) onboarding — P-02.
 * Saved to AsyncStorage after each step so an abandoned onboarding resumes
 * from the last step ("נמשיך מאיפה שעצרנו?").
 */
export interface ChildDraft {
  step: number;
  // Parent base profile
  fullName: string;
  area: string;
  cityId: string;
  phone: string;
  // Child basics (step 1)
  firstName: string;
  age: string;
  // Framework (step 2)
  framework: FrameworkType | "";
  // Required weekly support hours (step 3)
  hoursDays: string[];
  hoursStart: string;
  hoursEnd: string;
  // Needs & diagnosis (step 4)
  category: NeedCategory | "";
  secondaryCategory: NeedCategory | "";
  functioningLevel: number;
  communicationVerbal: boolean;
  diagnosisFull: string;
  // Guided free-text — child_details TIER 2 (step 5)
  whatWorks: string;
  whatTriggers: string;
  winDefinition: string;
}

interface OnboardingState {
  selectedRole: UserRole | null;
  pendingPhone: string;
  childDraft: ChildDraft | null;
  setSelectedRole: (role: UserRole) => void;
  setPendingPhone: (phone: string) => void;
  saveChildDraft: (draft: ChildDraft) => void;
  clearChildDraft: () => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      selectedRole: null,
      pendingPhone: "",
      childDraft: null,
      setSelectedRole: (selectedRole) => set({ selectedRole }),
      setPendingPhone: (pendingPhone) => set({ pendingPhone }),
      saveChildDraft: (childDraft) => set({ childDraft }),
      clearChildDraft: () => set({ childDraft: null }),
      reset: () => set({ selectedRole: null, pendingPhone: "", childDraft: null }),
    }),
    {
      name: "together-onboarding-draft",
      storage: createJSONStorage(() => AsyncStorage),
      // Only the child draft persists; role/phone stay session-scoped.
      partialize: (s) => ({ childDraft: s.childDraft }),
    }
  )
);
