import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FiUsers, FiStar, FiLock } from 'react-icons/fi';
import { getSpaceTags } from '@disruptive-spaces/shared/firebase/tagsFirestore';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface SpaceListItemProps {
  id: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  isPrivate?: boolean;
  userCount?: number;
  isHosted?: boolean;
  onClick: () => void;
  isAccessible?: boolean;
}

const SpaceListItem: React.FC<SpaceListItemProps> = ({
  id,
  name,
  description = '',
  thumbnailUrl = '',
  isPrivate = false,
  userCount = 0,
  isHosted = false,
  onClick,
  isAccessible = true
}) => {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoadingTags, setIsLoadingTags] = useState(false);

  // Load tags for this space
  useEffect(() => {
    const loadTags = async () => {
      if (!id) return;

      setIsLoadingTags(true);
      try {
        const spaceTags = await getSpaceTags(id);
        setTags(spaceTags);
      } catch (error) {
        Logger.error('SpaceListItem: Error loading tags:', error);
      } finally {
        setIsLoadingTags(false);
      }
    };

    loadTags();
  }, [id]);

  // Determine styling based on accessibility
  const bgClass = isAccessible ? 'bg-base-100' : 'bg-base-200';
  const borderClass = isHosted ? 'border-primary' : 'border-base-300';

  return (
    <div
      className={`card ${bgClass} border ${borderClass} shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md p-4`}
      onClick={onClick}
    >
      <div className="flex flex-col md:flex-row mb-2">
        {thumbnailUrl ? (
          <img
            className="rounded-md w-20 h-20 object-cover md:mr-3 mb-2 md:mb-0"
            src={thumbnailUrl}
            alt={name}
          />
        ) : (
          <div className="rounded-md w-20 h-20 bg-base-300 text-base-content flex items-center justify-center md:mr-3 mb-2 md:mb-0">
            <span className="text-xs">No Image</span>
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center mb-1">
            <h3 className="font-bold text-md">{name}</h3>
            <div className="flex-1" />
            {isPrivate && (
              <div className="tooltip" data-tip="Private Space">
                <FiLock className="text-base-content opacity-50" />
              </div>
            )}
          </div>

          <p className="text-sm text-base-content opacity-70 line-clamp-2 mb-2">
            {description || "No description available"}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="badge badge-sm gap-1"
                  style={{ boxShadow: `0 0 0 1px ${tag.color}` }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-xs">{tag.name}</span>
                </span>
              ))}
              {tags.length > 3 && (
                <span className="badge badge-sm">
                  <span className="text-xs">+{tags.length - 3} more</span>
                </span>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <div className="tooltip" data-tip="Current Users">
              <span className="badge badge-success badge-sm gap-1">
                <FiUsers className="text-xs" />
                <span className="text-xs">{userCount || 0}</span>
              </span>
            </div>

            {isHosted && (
              <div className="tooltip" data-tip="Hosted Space">
                <span className="badge badge-primary badge-sm gap-1">
                  <FiStar className="text-xs" />
                  <span className="text-xs">Hosted</span>
                </span>
              </div>
            )}

            {!isAccessible && (
              <div className="tooltip" data-tip="You don't have access to this space">
                <span className="badge badge-error badge-sm gap-1">
                  <FiLock className="text-xs" />
                  <span className="text-xs">No Access</span>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

SpaceListItem.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  thumbnailUrl: PropTypes.string,
  isPrivate: PropTypes.bool,
  userCount: PropTypes.number,
  isHosted: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  isAccessible: PropTypes.bool
};

export default SpaceListItem;
