import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { IoChevronDown, IoAdd, IoSettings } from 'react-icons/io5';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import {
  getAllTags,
  getSpaceTags,
  addTagToSpace,
  removeTagFromSpace,
  initializeDefaultTags
} from '@disruptive-spaces/shared/firebase/tagsFirestore';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';

interface SpaceTagsManagerProps {
  spaceID: string;
}

interface Tag {
  id: string;
  name: string;
  color?: string;
}

const SpaceTagsManager: React.FC<SpaceTagsManagerProps> = ({ spaceID }) => {
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [spaceTags, setSpaceTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initializeSuccess, setInitializeSuccess] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const { user } = useContext(UserContext);

  const showToast = (title: string, description: string, status: string) => {
    console.log(`[${status.toUpperCase()}] ${title}: ${description}`);
  };

  const isAdmin = user?.groups &&
    (user.groups.includes('disruptiveAdmin') || user.groups.includes('admin'));

  useEffect(() => {
    loadTags();
  }, [spaceID]);

  const loadTags = async () => {
    setIsLoading(true);
    try {
      let tags: Tag[] = [];
      try {
        tags = await getAllTags();
        setAvailableTags(tags);
      } catch (error) {
        Logger.error('SpaceTagsManager: Error loading available tags:', error);
        setAvailableTags([]);
        showToast('Error loading tags', 'Failed to load available tags. Please try again later.', 'error');
      }

      if (spaceID) {
        try {
          const currentSpaceTags = await getSpaceTags(spaceID);
          setSpaceTags(currentSpaceTags);
        } catch (error) {
          Logger.error('SpaceTagsManager: Error loading space tags:', error);
          setSpaceTags([]);
          showToast('Error loading space tags', "Failed to load this space's tags. Please try again later.", 'error');
        }
      }
    } catch (error) {
      Logger.error('SpaceTagsManager: Error in loadTags:', error);
      showToast('Error loading tags', 'Failed to load tags. Please try again later.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeTags = async () => {
    setIsInitializing(true);
    setInitializeSuccess(null);

    try {
      const result = await initializeDefaultTags();

      setInitializeSuccess(result);
      showToast('Tags initialized', `Successfully created ${result.created} tags. Skipped ${result.skipped} existing tags.`, 'success');

      await loadTags();

    } catch (error: any) {
      Logger.error('SpaceTagsManager: Error initializing tags:', error);
      setInitializeSuccess(false);
      showToast('Error initializing tags', 'Failed to initialize tags. Please try again later.', 'error');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!spaceID || !tagId) return;

    setIsUpdating(true);
    try {
      await addTagToSpace(spaceID, tagId);

      const tagToAdd = availableTags.find(tag => tag.id === tagId);
      if (tagToAdd) {
        setSpaceTags(prev => [...prev, tagToAdd]);
      }

      showToast('Tag added', 'Tag has been added to the space.', 'success');
    } catch (error) {
      Logger.error(`SpaceTagsManager: Error adding tag ${tagId} to space:`, error);
      showToast('Error adding tag', 'Failed to add tag to the space.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!spaceID || !tagId) return;

    setIsUpdating(true);
    try {
      await removeTagFromSpace(spaceID, tagId);

      setSpaceTags(prev => prev.filter(tag => tag.id !== tagId));

      showToast('Tag removed', 'Tag has been removed from the space.', 'info');
    } catch (error) {
      Logger.error(`SpaceTagsManager: Error removing tag ${tagId} from space:`, error);
      showToast('Error removing tag', 'Failed to remove tag from the space.', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const getUnassignedTags = () => {
    const assignedTagIds = spaceTags.map(tag => tag.id);
    return availableTags.filter(tag => !assignedTagIds.includes(tag.id));
  };

  const isEmpty = getUnassignedTags().length === 0;

  return (
    <div>
      <div className="flex mb-3 justify-end items-center">
        <div className="flex items-center gap-2 ml-auto">
          {isAdmin && (
            <button
              className="btn btn-xs btn-outline"
              onClick={() => setIsAdminModalOpen(true)}
            >
              <IoSettings className="w-3 h-3" />
              Admin
            </button>
          )}

          <div className="dropdown dropdown-end">
            <button
              className="btn btn-xs"
              disabled={isLoading || isUpdating || isEmpty}
              onClick={() => setIsOpen(!isOpen)}
            >
              <IoAdd className="w-3 h-3" />
              {isEmpty ? 'No Available Tags' : 'Add Tag'}
              <IoChevronDown className="w-3 h-3" />
            </button>
            {isOpen && (
              <ul className="dropdown-content menu p-2 shadow bg-gray-800 border border-gray-700 rounded-box w-52 z-[1000]">
                {getUnassignedTags().length > 0 ? (
                  getUnassignedTags().map(tag => (
                    <li key={tag.id}>
                      <button
                        onClick={() => {
                          handleAddTag(tag.id);
                          setIsOpen(false);
                        }}
                        className="text-white hover:bg-gray-700 focus:bg-gray-700 active:bg-gray-700"
                      >
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: tag.color || "#888" }}
                        />
                        {tag.name}
                      </button>
                    </li>
                  ))
                ) : (
                  <li><a className="text-gray-400 cursor-not-allowed">No available tags to add</a></li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-4">
          <span className="loading loading-spinner text-blue-300"></span>
        </div>
      ) : availableTags.length === 0 ? (
        <div>
          <p className="text-sm text-red-400 mb-2">
            No tags have been created in the system yet.
            {isAdmin ? ' Use the Admin button to initialize tags.' : ' Ask an admin to initialize tags.'}
          </p>
        </div>
      ) : spaceTags.length === 0 ? (
        <p className="text-sm text-gray-400 italic">
          No tags assigned to this space.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {spaceTags.map(tag => (
            <div
              key={tag.id}
              className="badge badge-md rounded-full bg-gray-100 dark:bg-gray-700"
              style={{ boxShadow: `0 0 0 1px ${tag.color || "#888"}` }}
            >
              <span
                className="w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: tag.color || "#888" }}
              />
              <span>{tag.name}</span>
              <button
                onClick={() => handleRemoveTag(tag.id)}
                disabled={isUpdating}
                className="ml-1 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {isAdminModalOpen && (
        <dialog open className="modal modal-open">
          <div className="fixed inset-0 backdrop-blur-sm" onClick={() => setIsAdminModalOpen(false)} />
          <div className="modal-box bg-gray-800 text-white">
            <h3 className="text-md font-bold mb-4">Tag System Administration</h3>
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setIsAdminModalOpen(false)}>✕</button>
            <div>
              <p className="text-sm mb-4">
                Initialize the default tags in your Firestore database.
                This will create a set of predefined tags if they don't already exist.
              </p>

              {initializeSuccess && (
                <div className="alert alert-success mb-4 rounded-md text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>
                    Tags initialized. Created: <b>{initializeSuccess.created}</b>, Skipped: <b>{initializeSuccess.skipped}</b>
                  </span>
                </div>
              )}

              <button
                className="btn btn-primary btn-sm w-full"
                onClick={handleInitializeTags}
                disabled={isInitializing}
              >
                {isInitializing ? <span className="loading loading-spinner loading-sm"></span> : 'Initialize Default Tags'}
              </button>
            </div>
            <div className="modal-action">
              <button className="btn btn-ghost btn-sm" onClick={() => setIsAdminModalOpen(false)}>Close</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
};

SpaceTagsManager.propTypes = {
  spaceID: PropTypes.string.isRequired
};

export default SpaceTagsManager;
