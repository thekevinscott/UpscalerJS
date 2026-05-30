/**
 * Shapes for the condensed ("slim") stats JSON — the output of `condense` and
 * the input to `analyze`. The raw fetched data keeps every endpoint's daily
 * series; the slim form drops those and keeps only totals + per-file + per-version
 * rollups. Per-package fields are optional: a failed fetch sets an `*Error` field
 * instead, and the analyzer tolerates missing fields.
 */

export interface CdnFile {
  name: string;
  total: number;
}

export interface CdnVersion {
  version: string;
  total: number;
}

export interface SlimPackage {
  name: string;
  npm?: { total: number; byMonth?: Record<string, number> };
  npmError?: string;
  cdn?: {
    total: number;
    prev: number | null;
    rank: number | null;
    typeRank: number | null;
    yoyPct?: number;
    byMonth?: Record<string, number>;
  };
  cdnError?: string;
  cdnFiles?: CdnFile[];
  cdnFilesVersion?: string;
  cdnFilesError?: string;
  cdnVersions?: CdnVersion[];
}

/**
 * Raw fetched shape (output of `fetch`, input to `condense`). The npm + jsDelivr
 * APIs are loosely typed; only the fields the pipeline reads are described.
 */
export interface RawPackage {
  name: string;
  error?: string;
  npm?: { downloads?: Array<{ day: string; downloads: number }> };
  npmError?: string;
  jsdelivr?: {
    hits?: {
      total?: number;
      prev?: { total?: number };
      rank?: number;
      typeRank?: number;
      dates?: Record<string, number>;
    };
  };
  jsdelivrError?: string;
  jsdelivrVersions?:
    | Array<{ version: string; hits?: { total?: number }; total?: number }>
    | { versions?: Array<{ version: string; hits?: { total?: number }; total?: number }> };
  jsdelivrFiles?: {
    files?: Record<string, { total?: number }>;
    _version?: string;
  };
  jsdelivrFilesError?: string;
}

export type FileBucket =
  | 'weights'
  | 'manifest'
  | 'umd_bundle'
  | 'esm_bundle'
  | 'types'
  | 'sourcemap'
  | 'package_json'
  | 'readme'
  | 'other_js'
  | 'other';
