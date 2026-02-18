export interface CampaignFormValues {
  id?: string;
  name: string;
  description: string;
  budget: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface CampaignFormState {
  success?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: CampaignFormValues;
}

export const INITIAL_CAMPAIGN_FORM_STATE: CampaignFormState = {};
