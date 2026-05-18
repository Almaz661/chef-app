export interface MatchCandidate {
  productId: string;
  productName: string;
  score: number;
}

export type MatchResult =
  | { kind: 'exact'; productId: string; productName: string }
  | { kind: 'fuzzy'; productId: string; productName: string; score: number }
  | { kind: 'ambiguous'; candidates: MatchCandidate[] }
  | { kind: 'none'; candidates: MatchCandidate[] };
