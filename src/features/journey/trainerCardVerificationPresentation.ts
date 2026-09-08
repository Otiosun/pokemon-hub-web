const PUBLIC_VERIFICATION_ID_PATTERN = /^tcv_[A-Za-z0-9]{24}$/;

export interface TrainerCardVerificationPresentationInput {
  readonly publicId?: string;
  readonly verificationOrigin?: string;
}

export interface TrainerCardVerificationPresentation {
  readonly publicId: string;
  readonly verificationUrl: string;
  readonly watermarkLabel: string;
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) return true;
  if (normalized === '::1' || normalized === '[::1]') return true;

  const ipv4 = normalized.split('.').map(Number);
  return ipv4.length === 4 && ipv4.every(Number.isInteger) && ipv4[0] === 127;
}

function parseOfficialVerificationOrigin(value: string | undefined): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (isLoopbackHostname(url.hostname)) return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function createTrainerCardVerificationPresentation(
  input: TrainerCardVerificationPresentationInput,
): TrainerCardVerificationPresentation | null {
  if (!input.publicId || !PUBLIC_VERIFICATION_ID_PATTERN.test(input.publicId)) return null;

  const origin = parseOfficialVerificationOrigin(input.verificationOrigin);
  if (!origin) return null;

  return {
    publicId: input.publicId,
    verificationUrl: `${origin}/public/v1/trainer-cards/${input.publicId}/verify`,
    watermarkLabel: `VERIFICÁVEL • ${input.publicId}`,
  };
}
