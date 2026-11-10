export const phoneMaxLength = 10;
export const phoneExtensionMaxLength = 6;

export function phoneDigits(value: string, maxLength = phoneMaxLength) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function isValidPhone(value: string) {
  return value === "" || /^0\d{8,9}$/.test(value);
}

export function isValidPhoneExtension(value: string) {
  return /^\d{0,6}$/.test(value);
}

export function formatPhone(value: string) {
  const digits = phoneDigits(value);
  if (digits.length === 10) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  if (digits.length === 9 && digits.startsWith("02")) return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
  if (digits.length === 9) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  return value;
}

export function formatPhoneWithExtension(phone: string, extension = "") {
  const formatted = formatPhone(phone);
  return extension ? `${formatted} ต่อ ${extension}` : formatted;
}
