export type FormState = {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string | undefined>;
  /** Extra data some forms need (e.g. suggested amounts) */
  data?: Record<string, unknown>;
};

export const initialFormState: FormState = {};
