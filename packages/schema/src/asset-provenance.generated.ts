/* Generated from asset-provenance.schema.json. Run pnpm --filter @aether-dom/schema types:generate. */

export interface AssetProvenance {
  ledgerVersion: '1.0.0';
  original: {
    uri: string;
    sha256: string;
  };
  current: {
    uri: string;
    sha256: string;
    payloadSha256: string;
  };
  creator: string;
  source: string;
  license: string;
  attribution: string;
  permissions: {
    private_preview: 'allowed' | 'denied' | 'unknown';
    public_distribution: 'allowed' | 'denied' | 'unknown';
    commercial_pack: 'allowed' | 'denied' | 'unknown';
  };
  lineage: null | {
    provider: string;
    model: string;
    parentSha256: string | null;
  };
  /**
   * @minItems 2
   * @maxItems 2
   */
  consents: {
    kind: 'voice' | 'likeness';
    applicability: 'not_applicable' | 'unknown' | 'required';
    subject: string;
    status: 'allowed' | 'denied' | 'unknown';
    /**
     * @maxItems 3
     */
    uses: ('private_preview' | 'public_distribution' | 'commercial_pack')[];
    /**
     * @maxItems 8
     */
    evidenceHashes: string[];
  }[];
  /**
   * @maxItems 8
   */
  evidence: {
    uri: string;
    sha256: string;
    label: string;
  }[];
}
