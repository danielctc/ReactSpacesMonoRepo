/**
 * Firebase type definitions for the Spaces platform.
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Base document interface for Firestore documents.
 */
export interface FirestoreDocument {
  id?: string;
  createdAt?: Date | Timestamp;
  lastUpdated?: Date | Timestamp;
}

/**
 * Analytics event types.
 */
export interface AnalyticsEvent extends FirestoreDocument {
  eventType: string;
  category: string;
  userId?: string;
  spaceId?: string;
  data: Record<string, unknown>;
  timestamp: Date | Timestamp;
}

/**
 * Analytics event categories.
 */
export const ANALYTICS_CATEGORIES = {
  NAVIGATION: 'navigation',
  INTERACTION: 'interaction',
  USER: 'user',
  SYSTEM: 'system',
  PERFORMANCE: 'performance',
} as const;

export type AnalyticsCategory = (typeof ANALYTICS_CATEGORIES)[keyof typeof ANALYTICS_CATEGORIES];

/**
 * Firebase storage upload result.
 */
export interface StorageUploadResult {
  downloadUrl: string;
  gsUrl: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
}

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  blockDurationMs?: number;
}

/**
 * Permission check result.
 */
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  groups?: string[];
}

/**
 * Firestore query options.
 */
export interface QueryOptions {
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  startAfter?: unknown;
  where?: Array<{
    field: string;
    operator: '<' | '<=' | '==' | '!=' | '>=' | '>' | 'array-contains' | 'array-contains-any' | 'in' | 'not-in';
    value: unknown;
  }>;
}

/**
 * Batch operation result.
 */
export interface BatchOperationResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: Array<{ id: string; error: Error }>;
}
