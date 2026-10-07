/** Premier message d'erreur lisible d'une réponse API Laravel. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function apiError(err: any): string {
  const data = err?.response?.data
  if (err?.response?.status === 429) return 'Trop de tentatives. Patientez une minute avant de réessayer.'
  const first = data?.errors && Object.values(data.errors as Record<string, string[]>)[0]?.[0]
  return first ?? data?.message ?? 'Impossible de joindre le serveur. Réessayez dans un instant.'
}
