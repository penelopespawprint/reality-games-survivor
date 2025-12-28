/**
 * Offline Context - Network State Management
 *
 * Provides network status to all components
 * Handles queue processing when back online
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { addNetworkListener, isOnline, processQueue, getQueueSize } from '../services/offline';

interface OfflineContextValue {
  isConnected: boolean;
  pendingRequests: number;
  processingQueue: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({
  isConnected: true,
  pendingRequests: 0,
  processingQueue: false,
});

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(true);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [processingQueue, setProcessingQueue] = useState(false);

  useEffect(() => {
    // Check initial state
    isOnline().then(setIsConnected);
    getQueueSize().then(setPendingRequests);

    // Subscribe to network changes
    const unsubscribe = addNetworkListener(async (connected) => {
      setIsConnected(connected);
      console.log(`📶 Network: ${connected ? 'Online' : 'Offline'}`);

      // Process queue when coming back online
      if (connected) {
        const queueSize = await getQueueSize();
        if (queueSize > 0) {
          setProcessingQueue(true);
          console.log(`🔄 Processing ${queueSize} queued requests...`);
          const result = await processQueue();
          console.log(`✅ Synced: ${result.success} succeeded, ${result.failed} failed`);
          setProcessingQueue(false);
          setPendingRequests(await getQueueSize());
        }
      }
    });

    return unsubscribe;
  }, []);

  return (
    <OfflineContext.Provider value={{ isConnected, pendingRequests, processingQueue }}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  return useContext(OfflineContext);
}

export default OfflineContext;
