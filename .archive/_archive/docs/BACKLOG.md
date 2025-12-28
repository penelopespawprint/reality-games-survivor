# RGFL Feature Backlog

Features removed or deferred for future implementation.

---

## Pick Categories System

**Status**: Removed (logged 2025-11-30)
**Priority**: Medium
**Effort**: Medium

### Description
Weekly pick categories allowing players to make multiple predictions per episode:
- **Immunity Winner** (5 pts) - Who will win individual immunity?
- **Eliminated** (3 pts) - Who will be voted out?
- **Finds Idol** (4 pts) - Who will find a hidden immunity idol?
- **Plays Advantage** (2 pts) - Who will play an advantage?

### Why Removed
Feature was stubbed but not fully implemented. Current system uses simpler single-pick-per-week model.

### Implementation Notes
When ready to implement:
1. Add `PickCategory` model to Prisma schema
2. Update `Pick` model to include categoryId
3. Create `/api/picks/categories` endpoint
4. Update frontend pick submission to support multiple categories
5. Update scoring logic to award points per category

### Original Code Reference
```typescript
const DEFAULT_PICK_CATEGORIES = [
  { id: 'immunity', name: 'Immunity Winner', description: 'Who will win individual immunity?', points: 5, allowMultiple: false },
  { id: 'eliminated', name: 'Eliminated', description: 'Who will be voted out?', points: 3, allowMultiple: false },
  { id: 'idol', name: 'Finds Idol', description: 'Who will find a hidden immunity idol?', points: 4, allowMultiple: false },
  { id: 'advantage', name: 'Plays Advantage', description: 'Who will play an advantage?', points: 2, allowMultiple: false },
];
```

---
