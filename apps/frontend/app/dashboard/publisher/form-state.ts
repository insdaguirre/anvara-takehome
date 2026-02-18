export interface AdSlotFormValues {
  id?: string;
  name: string;
  description: string;
  type: string;
  basePrice: string;
  isAvailable: boolean;
}

export interface AdSlotFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: AdSlotFormValues;
}

export const INITIAL_AD_SLOT_FORM_STATE: AdSlotFormState = {};
