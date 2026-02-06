import type { ScreenShareContextValue } from '@spaces/shared/types/screen-share.types';
import { useScreenShareContext } from '../providers/ScreenShareProvider';

/**
 * Hook for accessing screen share functionality
 * @returns Screen share state and actions
 */
export const useScreenShare = (): ScreenShareContextValue => {
  return useScreenShareContext();
};
