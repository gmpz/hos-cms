export type AnnouncementDisplayMode = "MODAL" | "SPLASH";
export type AnnouncementContentMode = "TEXT" | "IMAGE";
export type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "UNPUBLISHED";
export type SplashFrequency = "ALWAYS" | "SESSION" | "INTERVAL" | "ONCE_PER_CAMPAIGN";
export type ModalFrequency = SplashFrequency;

export type SplashSnapshot = {
  title: string;
  description: string;
  contentMode: AnnouncementContentMode;
  imageMediaId: string | null;
  imageAlt: string;
  buttonLabel: string;
  splashFrequency: SplashFrequency;
  splashIntervalHours: number;
};

export type ModalSnapshot = {
  title: string;
  description: string;
  contentMode: AnnouncementContentMode;
  imageMediaId: string | null;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
  openInNewTab: boolean;
  modalFrequency: ModalFrequency;
  modalIntervalHours: number;
  priority: number;
};

export type AnnouncementDto = {
  id: string;
  title: string;
  description: string;
  displayMode: AnnouncementDisplayMode;
  contentMode: AnnouncementContentMode;
  imageMediaId: string | null;
  imageUrl: string | null;
  imageAlt: string;
  buttonLabel: string;
  buttonUrl: string;
  openInNewTab: boolean;
  allowSuppression: boolean;
  repeatAfterDays: number;
  modalFrequency: ModalFrequency;
  modalIntervalHours: number;
  splashFrequency: SplashFrequency;
  splashIntervalHours: number;
  splashCookieVersion: number;
  modalCookieVersion: number;
  hasUnpublishedChanges: boolean;
  publishedSplash: (SplashSnapshot & { imageUrl: string | null }) | null;
  publishedModal: (ModalSnapshot & { imageUrl: string | null }) | null;
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  status: AnnouncementStatus;
  revision: number;
  publishedAt: string | null;
  deletedAt: string | null;
  updatedAt: string;
};

export type PublicAnnouncement = Pick<AnnouncementDto,
  "id" | "title" | "description" | "displayMode" | "contentMode" | "imageUrl" |
  "imageAlt" | "buttonLabel" | "buttonUrl" | "openInNewTab" | "modalFrequency" |
  "modalIntervalHours" | "priority" | "modalCookieVersion"
>;

