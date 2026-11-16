import "server-only";

import { MediaKind, Prisma } from "@prisma/client";
import type { AnnouncementDto } from "@/features/announcements/types";
import type {
  ModalFrequency,
  SplashFrequency,
} from "@/features/announcements/types";
import { prisma } from "@/server/database/prisma";
import { mediaPublicUrl } from "@/server/media/storage";

export class AnnouncementInputError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const announcementInclude = {
  imageMedia: { select: { fileName: true, name: true } },
} as const;
export type AnnouncementRow = Prisma.AnnouncementGetPayload<{
  include: typeof announcementInclude;
}>;

export function announcementToDto(row: AnnouncementRow): AnnouncementDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    displayMode: row.displayMode,
    contentMode: row.contentMode,
    imageMediaId: row.imageMediaId,
    imageUrl: row.imageMedia ? mediaPublicUrl(row.imageMedia.fileName) : null,
    imageAlt:
      row.imageAlt ||
      row.imageMedia?.name.trim() ||
      row.imageMedia?.fileName ||
      "",
    buttonLabel: row.buttonLabel,
    buttonUrl: row.buttonUrl,
    openInNewTab: row.openInNewTab,
    allowSuppression: row.allowSuppression,
    repeatAfterDays: row.repeatAfterDays,
    modalFrequency: row.modalFrequency as ModalFrequency,
    modalIntervalHours: row.modalIntervalHours,
    splashFrequency: row.splashFrequency as SplashFrequency,
    splashIntervalHours: row.splashIntervalHours,
    splashCookieVersion: row.splashCookieVersion,
    modalCookieVersion: row.modalCookieVersion,
    hasUnpublishedChanges: row.hasUnpublishedChanges,
    publishedSplash: null,
    publishedModal: null,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    priority: row.priority,
    status: row.status,
    revision: row.revision,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function validatedImageAlt(imageMediaId: string | null) {
  if (!imageMediaId) return "";
  const media = await prisma.mediaAsset.findUnique({
    where: { id: imageMediaId },
    select: { kind: true, name: true, fileName: true },
  });
  if (!media || media.kind !== MediaKind.IMAGE)
    throw new AnnouncementInputError("ไม่พบรูปภาพที่เลือก");
  return media.name.trim() || media.fileName;
}
