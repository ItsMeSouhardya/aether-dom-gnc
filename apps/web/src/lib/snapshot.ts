import { validateCdom, type CdomDocument } from '@aether-dom/schema';

async function readJson(path: string): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
  } catch {
    throw new Error('The local API is unavailable. Start the API, then try again.');
  }
  if (!response.ok) throw new Error('The local API is unavailable. Check the API terminal, then try again.');
  try {
    return await response.json();
  } catch {
    throw new Error('The API did not return valid JSON. Check the API terminal, then try again.');
  }
}

export async function loadSnapshot(): Promise<CdomDocument> {
  const [health, fixture] = await Promise.all([
    readJson('/api/v1/health'),
    readJson('/api/v1/fixtures/neon-shogun'),
  ]);
  if (typeof health !== 'object' || health === null || !('status' in health) || health.status !== 'ok'
    || !('service' in health) || health.service !== 'aether-dom-api'
    || !('schemaVersion' in health) || !(health.schemaVersion === '0.1.0'
      || health.schemaVersion === '0.2.0' && 'supportedSchemaVersions' in health && Array.isArray(health.supportedSchemaVersions) && health.supportedSchemaVersions.includes('0.1.0'))) {
    throw new Error('The API health response is incompatible. Check that the local API supports the original seed version.');
  }
  const result = validateCdom(fixture);
  if (!result.valid) throw new Error('The fixture does not match the document contract. Check the API terminal, then try again.');
  return result.document;
}
