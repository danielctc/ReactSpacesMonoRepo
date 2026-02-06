import React, { useState, useEffect, useContext } from 'react';
import { usePlacePrefab } from '../hooks/unityEvents';
import { useSpaceObjects } from '../hooks/unityEvents/useSpaceObjects';
import { Logger } from '@disruptive-spaces/shared/logging/react-log';
import PropTypes from 'prop-types';
import { UserContext } from '@disruptive-spaces/shared/providers/UserProvider';
import { userBelongsToGroup } from '@disruptive-spaces/shared/firebase/userPermissions';

interface Vector3 {
  x: number;
  y: number;
  z: number;
}

interface Settings {
  spaceID?: string;
}

interface PrefabPlacerProps {
  settings: Settings;
}

const PrefabPlacer: React.FC<PrefabPlacerProps> = ({ settings }) => {
  const { placePrefab, directPlacePrefab, isUnityLoaded } = usePlacePrefab();
  const [position, setPosition] = useState<Vector3>({ x: 0, y: 1, z: 0 });
  const [rotation, setRotation] = useState<Vector3>({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState<Vector3>({ x: 1, y: 1, z: 1 });
  const [prefabName, setPrefabName] = useState("TestPrefab");
  const [useDirect, setUseDirect] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isDisruptiveAdmin, setIsDisruptiveAdmin] = useState(false);

  // Get the user from context
  const { user } = useContext(UserContext);

  // Get spaceID from settings
  const spaceId = settings?.spaceID;

  // Use the space objects hook
  const { saveObject, isLoading } = useSpaceObjects(spaceId);

  // Check if user is a disruptiveAdmin
  useEffect(() => {
    const checkAdmin = async () => {
      if (user?.uid) {
        try {
          const isAdmin = await userBelongsToGroup(user.uid, 'disruptiveAdmin');
          setIsDisruptiveAdmin(isAdmin);
        } catch (error) {
          console.error("Error checking admin status:", error);
          setIsDisruptiveAdmin(false);
        }
      }
    };

    checkAdmin();
  }, [user?.uid]);

  // Listen for edit mode changes
  useEffect(() => {
    const handleEditModeChange = (event: any) => {
      setIsEditMode(event.detail.enabled);
    };

    window.addEventListener('editModeChanged', handleEditModeChange);
    return () => {
      window.removeEventListener('editModeChanged', handleEditModeChange);
    };
  }, []);

  // Handle position changes
  const handlePositionChange = (axis: keyof Vector3, value: string) => {
    setPosition(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };

  // Handle rotation changes
  const handleRotationChange = (axis: keyof Vector3, value: string) => {
    setRotation(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };

  // Handle scale changes
  const handleScaleChange = (axis: keyof Vector3, value: string) => {
    setScale(prev => ({
      ...prev,
      [axis]: parseFloat(value)
    }));
  };

  // Place prefab in Unity and save to Firebase
  const handlePlacePrefab = async () => {
    Logger.log("Placing prefab with values:", { prefabName, position, rotation, scale, useDirect, spaceId });

    let success;
    if (useDirect) {
      // Use direct method
      success = directPlacePrefab(prefabName, position, rotation, scale);
      Logger.log("Used direct method to place prefab");
    } else {
      // Use hook method
      success = placePrefab(prefabName, position, rotation, scale);
      Logger.log("Used hook method to place prefab");
    }

    if (success) {
      // Save to Firebase if we have a spaceId and we're in edit mode
      if (spaceId && isEditMode) {
        const saved = await saveObject(prefabName, position, rotation, scale);
        if (saved) {
          console.log("Success: Prefab placed and saved to space");
        } else {
          console.log("Warning: Prefab placed but failed to save to space");
        }
      } else {
        console.log("Success: Prefab placed");
      }
    } else {
      console.log("Error: Failed to place prefab");
    }
  };

  // Use random position
  const useRandomPosition = () => {
    const randomPos = {
      x: (Math.random() * 10 - 5).toFixed(2),
      y: (Math.random() * 2).toFixed(2),
      z: (Math.random() * 10 - 5).toFixed(2)
    };

    setPosition({
      x: parseFloat(randomPos.x),
      y: parseFloat(randomPos.y),
      z: parseFloat(randomPos.z)
    });

    Logger.log("Set random position:", randomPos);
  };

  // Only render if in edit mode AND user is a disruptiveAdmin
  if (!isEditMode || !isDisruptiveAdmin) return null;

  return (
    <div className="bg-black/70 text-white p-4 rounded-md max-w-xs shadow-lg">
      <p className="font-bold mb-2">Place Prefab in Unity</p>

      <div className="mb-3">
        <p className="text-sm">Prefab Name:</p>
        <input
          type="text"
          value={prefabName}
          onChange={(e) => setPrefabName(e.target.value)}
          className="input input-bordered input-sm w-full mt-1 bg-white/10 border-white/30 text-white"
        />
      </div>

      <div className="flex flex-col gap-2 mb-3">
        <p className="text-sm">Position:</p>
        <div className="flex gap-2">
          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis}>
              <p className="text-xs">{axis.toUpperCase()}</p>
              <input
                type="number"
                value={position[axis]}
                onChange={(e) => handlePositionChange(axis, e.target.value)}
                step={0.5}
                className="input input-bordered input-sm w-full bg-white/10 border-white/30 text-white"
              />
            </div>
          ))}
        </div>

        <button
          onClick={useRandomPosition}
          className="btn btn-xs btn-outline btn-primary mt-1"
        >
          Random Position
        </button>
      </div>

      <div className="form-control mb-3">
        <label className="label cursor-pointer">
          <span className="label-text text-white text-sm">Use Direct Method</span>
          <input
            type="checkbox"
            className="toggle toggle-success"
            checked={useDirect}
            onChange={(e) => setUseDirect(e.target.checked)}
          />
        </label>
      </div>

      <button
        onClick={handlePlacePrefab}
        className="btn btn-success w-full"
        disabled={!isUnityLoaded || isLoading}
      >
        {isLoading ? <span className="loading loading-spinner loading-sm"></span> : null}
        Place Prefab
      </button>

      {!isUnityLoaded && (
        <p className="text-xs text-red-300 mt-1">
          Waiting for Unity to load...
        </p>
      )}

      {!spaceId && (
        <p className="text-xs text-yellow-300 mt-1">
          No space ID available - prefabs won't be saved
        </p>
      )}
    </div>
  );
};

PrefabPlacer.propTypes = {
  settings: PropTypes.shape({
    spaceID: PropTypes.string,
  }),
};

export default PrefabPlacer;
