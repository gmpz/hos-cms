import sharp from "sharp";
import JSZip from "jszip";

export class InvalidUploadError extends Error {
  constructor() { super("เนื้อหาไฟล์ไม่ถูกต้องหรือไม่ตรงกับชนิดที่รองรับ กรุณาเลือกไฟล์ใหม่"); }
}

const officeParts: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word/document.xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xl/workbook.xml",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "ppt/presentation.xml",
};
const legacyStreams: Record<string, string[]> = {
  "application/msword": ["WordDocument"],
  "application/vnd.ms-excel": ["Workbook", "Book"],
  "application/vnd.ms-powerpoint": ["PowerPoint Document"],
};

// Inspect CFB directory entries, rather than trusting the shared Office signature alone.
function legacyOfficeMatches(bytes: Buffer, names: string[]) {
  if (bytes.length < 512 || bytes.subarray(0, 8).toString("hex") !== "d0cf11e0a1b11ae1" || bytes.readUInt16LE(28) !== 0xfffe) return false;
  const shift = bytes.readUInt16LE(30);
  if (shift !== 9 && shift !== 12) return false;
  const sectorSize = 2 ** shift;
  let sector = bytes.readUInt32LE(48);
  const visited = new Set<number>();
  while (sector < 0xfffffffa && !visited.has(sector)) {
    visited.add(sector);
    const directoryOffset = (sector + 1) * sectorSize;
    if (directoryOffset + sectorSize > bytes.length) return false;
    for (let offset = directoryOffset; offset < directoryOffset + sectorSize; offset += 128) {
      const length = bytes.readUInt16LE(offset + 64);
      if (bytes[offset + 66] !== 2 || length < 2 || length > 64 || length % 2) continue;
      if (names.includes(bytes.subarray(offset, offset + length - 2).toString("utf16le"))) return true;
    }
    const entriesPerSector = sectorSize / 4;
    const fatIndex = Math.floor(sector / entriesPerSector);
    if (fatIndex >= 109) return false;
    const fatSector = bytes.readUInt32LE(76 + fatIndex * 4);
    const nextOffset = (fatSector + 1) * sectorSize + (sector % entriesPerSector) * 4;
    if (nextOffset + 4 > bytes.length) return false;
    sector = bytes.readUInt32LE(nextOffset);
  }
  return false;
}

/** Validate before writing any bytes. Document checks are structural, not malware scanning. */
export async function validatedUploadBytes(file: File): Promise<Uint8Array> {
  const bytes = Buffer.from(await file.arrayBuffer());
  try {
    if (file.type.startsWith("image/")) {
      const expected = ({ "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" } as Record<string, string>)[file.type];
      if (!expected) throw new InvalidUploadError();
      const image = sharp(bytes, { failOn: "warning", limitInputPixels: 40_000_000, animated: true });
      if ((await image.metadata()).format !== expected) throw new InvalidUploadError();
      await image.stats();
    } else if (file.type === "application/pdf") {
      if (!/^%PDF-[12]\.\d/.test(bytes.subarray(0, 8).toString("ascii")) || !bytes.subarray(-1024).includes(Buffer.from("%%EOF"))) throw new InvalidUploadError();
    } else if (officeParts[file.type]) {
      const zip = await JSZip.loadAsync(bytes);
      if (!zip.file("[Content_Types].xml") || !zip.file("_rels/.rels") || !zip.file(officeParts[file.type])) throw new InvalidUploadError();
    } else if (!legacyStreams[file.type] || !legacyOfficeMatches(bytes, legacyStreams[file.type])) {
      throw new InvalidUploadError();
    }
    return bytes;
  } catch {
    throw new InvalidUploadError();
  }
}
