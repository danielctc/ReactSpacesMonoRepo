import React from 'react';
import SpaceTagsManager from '../../SpaceTagsManager';

interface DetailsTabProps {
  spaceID: string;
  spaceName: string;
  setSpaceName: (name: string) => void;
  spaceDescription: string;
  setSpaceDescription: (description: string) => void;
  isSavingDetails: boolean;
  handleSaveSpaceDetails: () => void;
}

/**
 * Details Tab - Manages space name, description, and tags.
 */
const DetailsTab: React.FC<DetailsTabProps> = ({
  spaceID,
  spaceName,
  setSpaceName,
  spaceDescription,
  setSpaceDescription,
  isSavingDetails,
  handleSaveSpaceDetails,
}) => {
  return (
    <div className="p-4 flex flex-col">
      <p className="text-sm font-semibold mb-3 text-white">Space Details</p>

      <div className="flex flex-col gap-4">
        <label className="form-control w-full">
          <span className="label text-xs text-white">Space Name</span>
          <input
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="Enter space name"
            className="input input-sm input-bordered bg-white/10 border-white/20 hover:border-white/30 focus:border-blue-300 text-white"
            maxLength={100}
          />
        </label>

        <label className="form-control w-full">
          <span className="label text-xs text-white">Description</span>
          <textarea
            value={spaceDescription}
            onChange={(e) => setSpaceDescription(e.target.value)}
            placeholder="Enter space description"
            className="textarea textarea-sm textarea-bordered bg-white/10 border-white/20 hover:border-white/30 focus:border-blue-300 text-white resize-y"
            rows={4}
            maxLength={500}
          />
        </label>

        <label className="form-control w-full">
          <span className="label text-xs text-white">Space Tags</span>
          <div className="p-3 bg-white/5 border border-white/20 rounded-md">
            {spaceID ? (
              <SpaceTagsManager spaceID={spaceID} />
            ) : (
              <div className="alert alert-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="stroke-current shrink-0 h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div>
                  <h3 className="font-bold text-sm">Space ID missing</h3>
                  <div className="text-xs">Unable to load tags without a valid space ID.</div>
                </div>
              </div>
            )}
          </div>
        </label>

        <button
          className="btn btn-primary btn-sm self-start mt-2"
          onClick={handleSaveSpaceDetails}
          disabled={isSavingDetails}
        >
          {isSavingDetails ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            'Save Details'
          )}
        </button>
      </div>
    </div>
  );
};

export default DetailsTab;
