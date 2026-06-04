export type CreateCambioSessionState = {
  error: string | null;
  fieldError: string | null;
  value: string;
};

export const INITIAL_CREATE_STATE: CreateCambioSessionState = {
  error: null,
  fieldError: null,
  value: "",
};
