# Hunter Memory Visualization

## 1. Objective
Visualize Hunter's long-term learning process on the dashboard, so users can see accumulated experience, provider preference, and distilled lessons instead of only current run status.

## 2. Landed Scope (2026-02-25)

### A. Placement
- Landed in the top of left panel `MyAgentPanel`, directly below identity block.
- Existing live run metrics (`STATUS`, `SPENT`, `BUDGET`, `TX_COUNT`, `DURATION`) are preserved and moved down into a dedicated `LIVE RUN` section.

### B. API
- Landed endpoint: `GET /api/hunter/profile`
- Route file: `frontend/src/app/api/hunter/profile/route.ts`

### C. Data Sources
1. `agents/hunter/memory/experience.json`
2. `agents/hunter/memory/insights.json`
3. `registry/services.json` + `registry/dynamic-services.json` (price + canonical taskType mapping)
4. `registry/service-feedback-store.json` (auxiliary quality signal for score blending)

### D. Frontend
- Hook: `useHunterProfile()` (SWR based)
- UI module: `HunterMemoryProfile`
- Sub-components:
  - `HunterStats`
  - `SkillRadar` (ASCII bars)
  - `PreferredAgents`
  - `InsightsList`

### E. Refresh Strategy
- Auto-fetch on page load.
- Trigger `mutate()` when mission status becomes `COMPLETED` or `ERROR`.
- Dedup by run start timestamp to avoid repeated refresh for same run.
- Cross-run cache policy: persist profile snapshot in `localStorage` with TTL.
- Optional periodic revalidation: `NEXT_PUBLIC_HUNTER_PROFILE_REFRESH_MS` (set > 0 to enable).

## 3. Response Contract

```typescript
interface HunterProfile {
  stats: {
    totalMissions: number;
    avgScore: number; // 0~10 scale
    totalSpend: string; // MON decimal string
    totalHires: number;
  };
  skills: Array<{
    taskType: string;
    count: number;
    avgScore: number; // rounded to 1 decimal
  }>;
  preferredAgents: Array<{
    agentId: string;
    hires: number;
    avgScore: number; // rounded to 1 decimal
  }>;
  insights: Array<{
    lesson: string;
    count: number;
  }>;
}
```

## 4. Aggregation Rules

1. `totalMissions`
   - Unique count of `missionId` from `experience.json`.
2. `avgScore`
   - Experience score baseline (0~10).
   - Blend in feedback score from `service-feedback-store.json` as auxiliary signal (weighted at 0.35x).
   - Legacy 0~100 scores are normalized to 0~10 before aggregation.
3. `totalHires`
   - Total number of experience records.
4. `totalSpend`
   - Sum `serviceUsed` matched price from static/dynamic registry.
   - If service has no resolvable price, skip that record.
5. `skills`
   - Group by `taskType`, output `count + blended avgScore`.
   - Feedback taskType is canonicalized by `serviceId -> taskType` map from registry when possible.
6. `preferredAgents`
   - Group by `serviceUsed`, score uses blended experience + feedback signal.
   - Sort by hires desc then score desc, top 3.
7. `insights`
   - Prefer `insights.json` top 3 by `count desc, updatedAt desc`.
   - Fallback to derive from experience lessons if insights file missing/empty.

## 5. Remaining Enhancements

1. Add animation polish for section reveal and value transitions.
