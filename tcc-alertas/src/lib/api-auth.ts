// Verifica el secreto compartido para los endpoints de servidor
// (ingesta y detección). El secreto llega en la cabecera x-ingest-secret.
export function checkIngestSecret(request: Request): string | null {
  const expected = process.env.INGEST_SECRET;
  if (!expected) return 'INGEST_SECRET no está configurado en el servidor';
  const provided = request.headers.get('x-ingest-secret');
  if (provided !== expected) return 'No autorizado';
  return null;
}
