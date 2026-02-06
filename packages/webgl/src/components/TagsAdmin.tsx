import React, { useState } from 'react';
import {
  initializeDefaultTags,
  updateAllSpacesWithTagsField,
  getAllTags
} from '@disruptive-spaces/shared/firebase/tagsFirestore';
import { useUser } from '@disruptive-spaces/shared/providers/UserProvider';

const TagsAdmin: React.FC = () => {
  const [isInitializingTags, setIsInitializingTags] = useState(false);
  const [isUpdatingSpaces, setIsUpdatingSpaces] = useState(false);
  const [tagStats, setTagStats] = useState<any>(null);
  const [spaceStats, setSpaceStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tagCount, setTagCount] = useState<number | null>(null);
  const { user } = useUser();

  const showToast = (title: string, description: string, status: string) => {
    console.log(`[${status.toUpperCase()}] ${title}: ${description}`);
  };

  const isAdmin = user?.groups &&
    (user.groups.includes('disruptiveAdmin') || user.groups.includes('admin'));

  React.useEffect(() => {
    const fetchTagCount = async () => {
      try {
        const tags = await getAllTags();
        setTagCount(tags.length);
      } catch (error) {
        console.error('Error fetching tag count:', error);
      }
    };

    fetchTagCount();
  }, [tagStats]);

  const handleInitializeTags = async () => {
    setError(null);
    setIsInitializingTags(true);
    try {
      const stats = await initializeDefaultTags();
      setTagStats(stats);
      showToast('Tags initialized successfully', `Created: ${stats.created}, Skipped: ${stats.skipped}`, 'success');
    } catch (error: any) {
      console.error('Error initializing tags:', error);
      setError(error.message || 'An error occurred while initializing tags');
      showToast('Error initializing tags', error.message || 'An error occurred', 'error');
    } finally {
      setIsInitializingTags(false);
    }
  };

  const handleUpdateSpaces = async () => {
    setError(null);
    setIsUpdatingSpaces(true);
    try {
      const stats = await updateAllSpacesWithTagsField();
      setSpaceStats(stats);
      showToast('Spaces updated successfully', `Updated: ${stats.updated}, Skipped: ${stats.skipped}`, 'success');
    } catch (error: any) {
      console.error('Error updating spaces:', error);
      setError(error.message || 'An error occurred while updating spaces');
      showToast('Error updating spaces', error.message || 'An error occurred', 'error');
    } finally {
      setIsUpdatingSpaces(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="alert alert-warning rounded-md">
        <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <div>
          <h3 className="font-bold">Restricted Access</h3>
          <div className="text-xs">You do not have permission to access this section.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border border-gray-700 rounded-md bg-gray-900 text-white">
      <h2 className="text-md font-semibold mb-4">Tag System Administration</h2>

      {error && (
        <div className="alert alert-error mb-4 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span><strong>Error:</strong> {error}</span>
        </div>
      )}

      <div className="flex flex-col gap-6">
        <div>
          <p className="font-bold mb-2">1. Initialize Default Tags</p>
          <p className="text-sm mb-3">
            This will create the default set of tags in your Firestore database.
            Existing tags will not be modified.
          </p>

          {tagCount !== null && (
            <p className="text-sm mb-3">
              Current tag count: <span className="font-bold">{tagCount}</span>
            </p>
          )}

          <button
            className="btn btn-primary btn-sm"
            onClick={handleInitializeTags}
            disabled={isInitializingTags}
          >
            {isInitializingTags ? <span className="loading loading-spinner loading-sm"></span> : 'Initialize Default Tags'}
          </button>

          {tagStats && (
            <div className="alert alert-info mt-2 rounded-md text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>
                Tags initialized. Created: <b>{tagStats.created}</b>, Skipped: <b>{tagStats.skipped}</b>
              </span>
            </div>
          )}
        </div>

        <div>
          <p className="font-bold mb-2">2. Update Spaces with Tags Field</p>
          <p className="text-sm mb-3">
            This will add an empty 'tags' array field to any space documents that don't have one.
            This migration is required for the tagging system to work properly.
          </p>

          <button
            className="btn btn-success btn-sm"
            onClick={handleUpdateSpaces}
            disabled={isUpdatingSpaces}
          >
            {isUpdatingSpaces ? <span className="loading loading-spinner loading-sm"></span> : 'Update Spaces'}
          </button>

          {spaceStats && (
            <div className="alert alert-info mt-2 rounded-md text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>
                Spaces updated. Updated: <b>{spaceStats.updated}</b>, Skipped: <b>{spaceStats.skipped}</b>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagsAdmin;
