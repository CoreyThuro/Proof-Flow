import { query } from '../client';

export interface RfcAttribution {
  id: bigint;
  rfc_id: bigint;
  pr_number: number;
  lean_file_path: string;
  attributed_at: Date;
}

export async function insertRfcAttribution(
  rfcId: bigint,
  prNumber: number,
  leanFilePath: string,
): Promise<void> {
  await query(
    `INSERT INTO rfc_attributions (rfc_id, pr_number, lean_file_path)
     VALUES ($1, $2, $3)
     ON CONFLICT (rfc_id, lean_file_path) DO NOTHING`,
    [rfcId, prNumber, leanFilePath],
  );
}
