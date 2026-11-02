/**
 * Domain Service: UnionFindClusterer
 * Disjoint-Set Data Structure with Path Compression and Union-by-Rank
 * Partitions pairwise duplicate verdicts into connected equivalence classes (clusters).
 * Layer: Domain (Pure, Deterministic, 0 I/O)
 */

import type {
  DuplicateCluster,
  DuplicateClusterId,
  DuplicateRelation,
} from '../../../../specs/009-question-duplication-detection-engine/contracts/duplication-detection-ports.ts';

const RELATION_SEVERITY: Record<DuplicateRelation, number> = {
  EXACT: 5,
  CONFLICT: 4,
  NEAR: 3,
  SIBLING: 2,
  UNIQUE: 1,
};

export interface DuplicateEdge {
  readonly idA: string;
  readonly idB: string;
  readonly relation: Exclude<DuplicateRelation, 'UNIQUE'>;
  readonly fusedScore: number;
}

export class UnionFindClusterer {
  private readonly parent = new Map<string, string>();
  private readonly rank = new Map<string, number>();
  private readonly edgeData = new Map<
    string,
    { relation: Exclude<DuplicateRelation, 'UNIQUE'>; maxScore: number }
  >();

  /**
   * Finds the root representative for an element with path compression.
   */
  public find(x: string): string {
    if (!this.parent.has(x)) {
      this.parent.set(x, x);
      this.rank.set(x, 0);
      return x;
    }

    let root = x;
    while (root !== this.parent.get(root)!) {
      root = this.parent.get(root)!;
    }

    // Path compression
    let curr = x;
    while (curr !== root) {
      const next = this.parent.get(curr)!;
      this.parent.set(curr, root);
      curr = next;
    }

    return root;
  }

  /**
   * Unions two elements into the same equivalence class with union-by-rank.
   */
  public union(
    idA: string,
    idB: string,
    relation: Exclude<DuplicateRelation, 'UNIQUE'>,
    fusedScore: number
  ): void {
    const rootA = this.find(idA);
    const rootB = this.find(idB);

    if (rootA === rootB) {
      // Update edge severity on existing root
      const meta = this.edgeData.get(rootA) || { relation, maxScore: fusedScore };
      if (RELATION_SEVERITY[relation] > RELATION_SEVERITY[meta.relation]) {
        meta.relation = relation;
      }
      meta.maxScore = Math.max(meta.maxScore, fusedScore);
      this.edgeData.set(rootA, meta);
      return;
    }

    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;

    const metaA = this.edgeData.get(rootA);
    const metaB = this.edgeData.get(rootB);

    const mergedRelation =
      metaA && metaB
        ? RELATION_SEVERITY[metaA.relation] > RELATION_SEVERITY[metaB.relation]
          ? RELATION_SEVERITY[metaA.relation] > RELATION_SEVERITY[relation]
            ? metaA.relation
            : relation
          : RELATION_SEVERITY[metaB.relation] > RELATION_SEVERITY[relation]
          ? metaB.relation
          : relation
        : metaA
        ? RELATION_SEVERITY[metaA.relation] > RELATION_SEVERITY[relation]
          ? metaA.relation
          : relation
        : metaB
        ? RELATION_SEVERITY[metaB.relation] > RELATION_SEVERITY[relation]
          ? metaB.relation
          : relation
        : relation;

    const mergedScore = Math.max(
      fusedScore,
      metaA?.maxScore || 0,
      metaB?.maxScore || 0
    );

    let newRoot = rootA;
    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
      newRoot = rootB;
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
      newRoot = rootA;
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
      newRoot = rootA;
    }

    this.edgeData.set(newRoot, { relation: mergedRelation, maxScore: mergedScore });
  }

  /**
   * Clusters a list of pairwise duplicate edges and returns discrete clusters.
   */
  public cluster(
    edges: readonly DuplicateEdge[],
    selectSurvivor: (members: readonly string[]) => string
  ): readonly DuplicateCluster[] {
    for (const edge of edges) {
      this.union(edge.idA, edge.idB, edge.relation, edge.fusedScore);
    }

    // Group elements by root representative
    const groups = new Map<string, string[]>();
    for (const id of this.parent.keys()) {
      const root = this.find(id);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(id);
    }

    const clusters: DuplicateCluster[] = [];

    for (const [root, members] of groups.entries()) {
      // Singletons are unique, only clusters of size >= 2 are duplicates
      if (members.length < 2) continue;

      const sortedMembers = [...members].sort();
      const meta = this.edgeData.get(root) || {
        relation: 'NEAR' as const,
        maxScore: 1.0,
      };

      const survivorId = selectSurvivor(sortedMembers);

      clusters.push({
        id: `cluster-${root}` as DuplicateClusterId,
        relation: meta.relation,
        suggestedSurvivorId: survivorId,
        memberIds: sortedMembers,
        maxFusedScore: meta.maxScore,
      });
    }

    // Sort clusters by relation severity, then cluster size desc
    return clusters.sort((a, b) => {
      const relDiff = RELATION_SEVERITY[b.relation] - RELATION_SEVERITY[a.relation];
      if (relDiff !== 0) return relDiff;
      return b.memberIds.length - a.memberIds.length;
    });
  }
}
