const PUBLIC_VERIFICATION_ID_PATTERN = /^tcv_[A-Za-z0-9]{24}$/;
const PUBLIC_VERIFICATION_ROUTE_PATTERN = /^\/verificar\/treinador\/(tcv_[A-Za-z0-9]{24})$/;

export function buildTrainerCardVerificationPath(publicId: string): string {
  if (!PUBLIC_VERIFICATION_ID_PATTERN.test(publicId)) {
    throw new Error('Invalid trainer card public verification ID');
  }

  return `/verificar/treinador/${publicId}`;
}

export function parseTrainerCardVerificationPath(pathname: string): string | null {
  const match = PUBLIC_VERIFICATION_ROUTE_PATTERN.exec(pathname);
  return match?.[1] ?? null;
}
