export type AccessLevel = "PUBLIC" | "AUTHENTICATED" | "CUSTOM";

export type AccessGrants = {
  unitIds: string[];
  userIds: string[];
};

export type AccessOption = {
  id: string;
  label: string;
  photoUrl?: string | null;
  photoFocusX?: number;
  photoFocusY?: number;
  photoZoom?: number;
};

export type AccessOptions = {
  units: AccessOption[];
  users: AccessOption[];
};

export const emptyAccessGrants = (): AccessGrants => ({ unitIds: [], userIds: [] });
