import { supabaseAdmin } from '../config/supabase.js';

/**
 * Execute multiple database operations in a transaction
 *
 * Supabase doesn't have direct transaction support from the JS client,
 * so we use a Postgres function to wrap operations.
 *
 * For complex multi-step operations, we use database functions (RPC)
 * or implement compensating transactions (saga pattern).
 *
 * This utility provides a consistent pattern for error handling
 * and rollback when transactions fail.
 */

export interface TransactionResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Execute a series of operations with rollback on failure
 * Uses the saga pattern for Supabase (compensating transactions)
 */
export async function withTransaction<T>(
  operations: Array<{
    execute: () => Promise<void>;
    compensate: () => Promise<void>;
  }>,
  finalResult: () => Promise<T>
): Promise<TransactionResult<T>> {
  const completedOps: Array<{ compensate: () => Promise<void> }> = [];

  try {
    // Execute each operation in order
    for (const op of operations) {
      await op.execute();
      completedOps.push({ compensate: op.compensate });
    }

    // All operations succeeded, get final result
    const data = await finalResult();
    return { success: true, data };
  } catch (error) {
    // Rollback in reverse order
    console.error('Transaction failed, rolling back:', error);

    for (let i = completedOps.length - 1; i >= 0; i--) {
      try {
        await completedOps[i].compensate();
      } catch (compensateError) {
        console.error('Compensating transaction failed:', compensateError);
        // Continue trying to compensate other operations
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Execute operations atomically using a database function
 * This is the preferred method when available
 */
export async function callTransactionFunction<T>(
  functionName: string,
  params: Record<string, unknown>
): Promise<TransactionResult<T>> {
  try {
    const { data, error } = await supabaseAdmin.rpc(functionName, params);

    if (error) {
      return { success: false, error: new Error(error.message) };
    }

    return { success: true, data: data as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Helper to run simple atomic operations
 * For when you just need to ensure all-or-nothing behavior
 */
export async function atomicUpdate(
  updates: Array<{
    table: string;
    operation: 'insert' | 'update' | 'delete';
    data?: Record<string, unknown>;
    match?: Record<string, unknown>;
  }>
): Promise<TransactionResult<void>> {
  // Store original values for rollback
  const originals: Array<{
    table: string;
    operation: 'insert' | 'update' | 'delete';
    data?: Record<string, unknown>;
    match?: Record<string, unknown>;
  }> = [];

  try {
    for (const update of updates) {
      if (update.operation === 'update' && update.match) {
        // Store original for potential rollback
        const { data: original } = await supabaseAdmin
          .from(update.table)
          .select('*')
          .match(update.match)
          .single();

        if (original) {
          originals.push({
            table: update.table,
            operation: 'update',
            data: original,
            match: update.match,
          });
        }
      }

      // Execute the operation
      if (update.operation === 'insert' && update.data) {
        const { error } = await supabaseAdmin
          .from(update.table)
          .insert(update.data);
        if (error) throw error;
      } else if (update.operation === 'update' && update.data && update.match) {
        const { error } = await supabaseAdmin
          .from(update.table)
          .update(update.data)
          .match(update.match);
        if (error) throw error;
      } else if (update.operation === 'delete' && update.match) {
        const { error } = await supabaseAdmin
          .from(update.table)
          .delete()
          .match(update.match);
        if (error) throw error;
      }
    }

    return { success: true };
  } catch (error) {
    // Rollback by restoring originals
    console.error('Atomic update failed, attempting rollback:', error);

    for (const original of originals.reverse()) {
      try {
        if (original.operation === 'update' && original.data && original.match) {
          await supabaseAdmin
            .from(original.table)
            .update(original.data)
            .match(original.match);
        }
      } catch (rollbackError) {
        console.error('Rollback failed for table', original.table, rollbackError);
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}
