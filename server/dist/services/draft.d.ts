/**
 * Draft Service
 *
 * Business logic for draft operations.
 * Routes handle HTTP concerns; this service handles domain logic.
 */
export interface DraftState {
    status: string;
    current_pick: number;
    current_round: number;
    current_picker: string;
    is_my_turn: boolean;
    order: Array<{
        user_id: string;
        position: number;
        display_name: string;
    }>;
    available: any[];
    my_picks: Array<{
        castaway: any;
        round: number;
        pick: number;
    }>;
    picks: Array<{
        user_id: string;
        castaway_id: string;
        round: number;
        pick: number;
    }>;
}
export interface DraftPickResult {
    roster_id: string;
    draft_round: number;
    draft_pick: number;
    draft_complete: boolean;
    next_picker: string | null;
}
export interface SetOrderResult {
    order: string[];
}
export interface FinalizeAllResult {
    finalized_leagues: number;
    auto_picks: number;
}
export interface DraftOrder {
    user_id: string;
    position: number;
    display_name: string;
}
/**
 * Snake draft helper - calculates which player picks at a given pick number
 */
export declare function getSnakePickerIndex(pickNumber: number, totalMembers: number): {
    round: number;
    pickerIndex: number;
};
/**
 * Get the current draft state for a league
 */
export declare function getDraftState(leagueId: string, userId: string): Promise<{
    data?: DraftState;
    error?: string;
    status?: number;
}>;
/**
 * Get draft order for a league
 */
export declare function getDraftOrder(leagueId: string): Promise<{
    data?: {
        order: DraftOrder[];
    };
    error?: string;
    status?: number;
}>;
/**
 * Make a draft pick
 */
export declare function makeDraftPick(leagueId: string, userId: string, castawayId: string): Promise<{
    data?: DraftPickResult;
    error?: string;
    status?: number;
}>;
/**
 * Set or randomize draft order
 */
export declare function setDraftOrder(leagueId: string, userId: string, isAdmin: boolean, order?: string[], randomize?: boolean): Promise<{
    data?: SetOrderResult;
    error?: string;
    status?: number;
}>;
/**
 * Auto-complete all incomplete drafts past deadline
 */
export declare function finalizeAllDrafts(): Promise<{
    data?: FinalizeAllResult;
    error?: string;
    status?: number;
}>;
//# sourceMappingURL=draft.d.ts.map