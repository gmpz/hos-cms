import type { EntityId } from "@/types/content";

export interface ThemeTokens {
  primary: string;
  secondary: string;
  accent: string;
  emergency: string;
  background: string;
  text: string;
}
export interface SiteSettings {
  id: "site";
  name: string;
  englishName: string;
  logoMediaId: EntityId | null;
  logoFocusX: number;
  logoFocusY: number;
  logoZoom: number;
  homepageId: EntityId | null;
  address: string;
  mapUrl: string;
  facebookUrl: string;
  youtubeUrl: string;
  lineUrl: string;
  phone: string;
  email: string;
  theme: ThemeTokens;
  revision: number;
}
export const defaultTheme = {
  primary: "#176B5B",
  secondary: "#45AFA3",
  accent: "#E2A13B",
  emergency: "#C83E3E",
  background: "#FFFFFF",
  text: "#2C332F",
} satisfies ThemeTokens;
