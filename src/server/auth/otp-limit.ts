const windowMs = 15 * 60000;
const maxAttempts = 10;

type AttemptGroup = { attempts: number; createdAt: Date };

export function otpRetryAt(groups: AttemptGroup[], now = new Date()): Date | null {
  const recent = groups.filter((group) => group.attempts > 0 && group.createdAt.getTime() > now.getTime() - windowMs)
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());
  let attempts = recent.reduce((sum, group) => sum + group.attempts, 0);
  if (attempts < maxAttempts) return null;
  for (const group of recent) {
    attempts -= group.attempts;
    if (attempts < maxAttempts) return new Date(group.createdAt.getTime() + windowMs);
  }
  return null;
}
