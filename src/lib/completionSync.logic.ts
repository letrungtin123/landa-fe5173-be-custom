// ============================================================
// Completion sync — pure rules for marking blocks complete
//
// Which block ids still need POST /api/learner/complete-blocks, how the
// cached course tree changes once the server confirmed them, and which other
// data the completion can change (so only that is fetched again).
// No imports with side effects: tested with node --test.
// ============================================================

import type { BlocksResponse } from "@/api/types";

/** The server counts progress on every block that is not one of these. */
export const STRUCTURAL_BLOCK_TYPES: ReadonlySet<string> = new Set(["course", "chapter", "sequential", "vertical"]);

/** The server refuses more block ids than this in one request. */
export const MAX_BLOCK_IDS_PER_REQUEST = 200;

/** Answer of POST /api/learner/complete-blocks (`marked` from every server version). */
export interface CompleteBlocksResult {
  marked: number;
  newly_completed?: number;
  progress?: number;
  is_completed?: boolean;
  completion_changed?: boolean;
}

function isLeaf(type: string | undefined): boolean {
  return !STRUCTURAL_BLOCK_TYPES.has(type || "");
}

/**
 * Block ids worth sending: each id once, without blocks the cached tree
 * already shows as completed and without structural blocks (the server
 * ignores those). Ids the tree does not know are kept (the server decides);
 * without a cached tree every id is kept.
 */
export function pendingCompletionIds(tree: BlocksResponse | undefined, blockIds: readonly string[]): string[] {
  const unique = Array.from(new Set(blockIds.filter((id) => typeof id === "string" && id.length > 0)));
  if (!tree) return unique;
  return unique.filter((id) => {
    const block = tree.blocks[id];
    if (!block) return true;
    if (!isLeaf(block.type)) return false;
    return (block.completion ?? 0) < 1;
  });
}

export function chunkIds(ids: readonly string[], size = MAX_BLOCK_IDS_PER_REQUEST): string[][] {
  const chunks: string[][] = [];
  for (let index = 0; index < ids.length; index += size) chunks.push(ids.slice(index, index + size));
  return chunks;
}

/** The tree with these leaf blocks completed (the same object when nothing changes). */
export function withCompletedBlocks(tree: BlocksResponse, blockIds: readonly string[]): BlocksResponse {
  let blocks: BlocksResponse["blocks"] | null = null;
  for (const id of blockIds) {
    const block = tree.blocks[id];
    if (!block || !isLeaf(block.type) || (block.completion ?? 0) >= 1) continue;
    blocks ??= { ...tree.blocks };
    blocks[id] = { ...block, completion: 1 };
  }
  return blocks ? { ...tree, blocks } : tree;
}

function leafIdsUnder(tree: BlocksResponse, rootId: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    const block = tree.blocks[id];
    if (!block) continue;
    if (id !== rootId && isLeaf(block.type)) out.push(id);
    for (const child of block.children || []) stack.push(child);
  }
  return out;
}

function allCompleted(tree: BlocksResponse, ids: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => (tree.blocks[id]?.completion ?? 0) >= 1);
}

export interface CompletionMilestones {
  /** Chapters whose blocks are all completed now and were not before. */
  completedModuleIds: string[];
  /** Every block of the course is completed now and was not before. */
  contentCompleted: boolean;
}

export function completionMilestones(before: BlocksResponse, after: BlocksResponse): CompletionMilestones {
  const root = after.blocks[after.root];
  const chapters = (root?.children || []).filter((id) => after.blocks[id]?.type === "chapter");
  const completedModuleIds = chapters.filter((id) => {
    const leaves = leafIdsUnder(after, id);
    return allCompleted(after, leaves) && !allCompleted(before, leaves);
  });
  const courseLeaves = root ? leafIdsUnder(after, after.root) : [];
  return {
    completedModuleIds,
    contentCompleted: allCompleted(after, courseLeaves) && !allCompleted(before, courseLeaves),
  };
}

/** What has to be fetched again after a completion. */
export interface RefreshScope {
  /** The course tree (only when the server and the cached tree disagree). */
  courseBlocks?: boolean;
  /** The course progress percentage. */
  courseProgress?: boolean;
  /** Course list progress (enrollments, header average). */
  courseList?: boolean;
  badges?: boolean;
  /** Assignments unlock when every block of the course is completed. */
  assignments?: boolean;
}

/**
 * After the server answered: `sentCount` known leaf blocks were sent and
 * `results` came back (one per request). A tree is only fetched again when
 * the server did not accept every block the cached tree offered.
 */
export function refreshAfterCompletion(input: {
  sentKnownLeaves: number;
  results: readonly CompleteBlocksResult[];
  milestones: CompletionMilestones | null;
}): { scope: RefreshScope; progress: number | null; courseCompleted: boolean | null } {
  const { sentKnownLeaves, results, milestones } = input;
  const marked = results.reduce((sum, result) => sum + (Number(result.marked) || 0), 0);
  const withProgress = [...results].reverse().find((result) => typeof result.progress === "number");
  const progress = withProgress ? Number(withProgress.progress) : null;
  const knowsNewFields = results.length > 0 && results.every((result) => typeof result.newly_completed === "number");
  const courseCompletionChanged = results.some((result) => result.completion_changed === true);
  const courseCompleted = withProgress && typeof withProgress.is_completed === "boolean" ? withProgress.is_completed : null;

  const scope: RefreshScope = {};
  if (marked < sentKnownLeaves) scope.courseBlocks = true;
  // No progress in the answer: an older server, or the blocks were already
  // completed on the server (another tab) — ask for the percentage.
  if (progress === null) scope.courseProgress = true;
  if (!knowsNewFields) scope.courseBlocks = true;

  const moduleCompleted = (milestones?.completedModuleIds.length ?? 0) > 0;
  if (moduleCompleted || courseCompletionChanged || milestones?.contentCompleted) scope.courseList = true;
  if (courseCompletionChanged || (!knowsNewFields && milestones?.contentCompleted)) scope.badges = true;
  if (milestones?.contentCompleted) scope.assignments = true;
  return { scope, progress, courseCompleted };
}

export function mergeRefreshScopes(a: RefreshScope, b: RefreshScope): RefreshScope {
  const merged: RefreshScope = { ...a };
  for (const key of Object.keys(b) as Array<keyof RefreshScope>) {
    if (b[key]) merged[key] = true;
  }
  return merged;
}
