export const passwordMinimumLength = 10;

/** @param {string} password */
export function passwordChecks(password) {
  return {
    length: [...password].length >= passwordMinimumLength,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    symbol: /[\p{P}\p{S}]/u.test(password),
  };
}

/** @param {string} password */
export function isValidPassword(password) {
  return Object.values(passwordChecks(password)).every(Boolean);
}
