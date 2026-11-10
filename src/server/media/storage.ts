import "server-only";

import { constants } from "node:fs";
import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

const safeFileName = /^[A-Za-z0-9][A-Za-z0-9._-]{0,190}$/;

export function mediaStorageDirectory(): string {
  const configured = process.env.MEDIA_STORAGE_DIRECTORY?.trim();
  if (!configured) return path.join(process.cwd(), "public", "uploads");
  if (!path.isAbsolute(configured)) throw new Error("MEDIA_STORAGE_DIRECTORY must be an absolute path");
  return path.resolve(configured);
}

function assertFileName(fileName: string) {
  if (!safeFileName.test(fileName) || path.basename(fileName) !== fileName) throw new Error("Invalid media file name");
}

export async function writeMediaFile(fileName: string, bytes: Uint8Array): Promise<void> {
  assertFileName(fileName);
  const directory = mediaStorageDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, fileName), bytes, { flag: "wx" });
}

export async function readMediaFile(fileName: string): Promise<Uint8Array> {
  assertFileName(fileName);
  return new Uint8Array(await readFile(path.join(mediaStorageDirectory(), fileName)));
}

export async function checkMediaStorage(): Promise<void> {
  const directory = mediaStorageDirectory();
  await mkdir(directory, { recursive: true });
  await access(directory, constants.R_OK | constants.W_OK);
}

export async function deleteMediaFile(fileName: string): Promise<void> {
  assertFileName(fileName);
  await unlink(path.join(mediaStorageDirectory(), fileName)).catch((error: unknown) => {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  });
}

export function mediaPublicUrl(fileName: string): string {
  assertFileName(fileName);
  return `/uploads/${encodeURIComponent(fileName)}`;
}
