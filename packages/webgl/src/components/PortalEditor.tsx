import React, { useState, useEffect, useRef } from 'react';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { updatePortal, deletePortal } from '@disruptive-spaces/shared/firebase/portalsFirestore';

interface Position {
  x: number;
  y: number;
  z: number;
}

interface PortalEditorProps {
  isOpen: boolean;
  onClose: () => void;
  portal: any;
  spaceId: string;
  style?: React.CSSProperties;
}

function useDebouncedCallback(callback: () => void, delay: number, deps: any[]) {
  const handler = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (handler.current) clearTimeout(handler.current);
    handler.current = setTimeout(callback, delay);
    return () => {
      if (handler.current) clearTimeout(handler.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const PortalEditor: React.FC<PortalEditorProps> = ({ isOpen, onClose, portal, spaceId, style }) => {
  const [position, setPosition] = useState<Position>({ x: 0, y: 1.5, z: 0 });
  const [rotation, setRotation] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState<Position>({ x: 1, y: 1, z: 1 });
  const sendUnityEvent = useSendUnityEvent();

  const showToast = (title: string, description: string, status: string) => {
    console.log(`[${status.toUpperCase()}] ${title}: ${description}`);
  };

  useEffect(() => {
    if (portal) {
      setPosition(portal.position || { x: 0, y: 1.5, z: 0 });
      setRotation(portal.rotation || { x: 0, y: 0, z: 0 });
      setScale(portal.scale || { x: 1, y: 1, z: 1 });
    }
  }, [portal]);

  useEffect(() => {
    sendUnityEvent('UpdatePortalTransform', {
      portalId: portal.portalId,
      position,
      rotation,
      scale
    });
  }, [position, rotation, scale, portal.portalId, sendUnityEvent]);

  useDebouncedCallback(() => {
    const updatedPortalData = {
      ...portal,
      position,
      rotation,
      scale
    };
    updatePortal(spaceId, portal.portalId, updatedPortalData);
  }, 300, [position, rotation, scale, spaceId, portal.portalId]);

  const handleDelete = async () => {
    try {
      sendUnityEvent('DeletePortal', {
        portalId: portal.portalId
      });
      const success = await deletePortal(spaceId, portal.portalId);
      if (success) {
        showToast("Portal Deleted", "The portal has been removed.", "success");
        onClose();
      } else {
        throw new Error("Failed to delete portal from Firebase");
      }
    } catch (error) {
      showToast("Delete Error", "Failed to delete portal. Please try again.", "error");
    }
  };

  if (!isOpen || !portal) return null;

  return (
    <div
      className="absolute top-[72px] right-6 z-[2000] min-w-[340px] max-w-[360px] bg-white/15 shadow-lg rounded-2xl p-6 border border-white/20 text-gray-900"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', ...style }}
    >
      <div className="font-bold text-lg mb-2">Edit Portal</div>
      <div className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label"><span className="label-text">Position</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              value={position.x}
              onChange={(e) => setPosition(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
              step={0.1}
              placeholder="X"
              className="input input-bordered input-sm w-full"
            />
            <input
              type="number"
              value={position.y}
              onChange={(e) => setPosition(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
              step={0.1}
              placeholder="Y"
              className="input input-bordered input-sm w-full"
            />
            <input
              type="number"
              value={position.z}
              onChange={(e) => setPosition(prev => ({ ...prev, z: parseFloat(e.target.value) }))}
              step={0.1}
              placeholder="Z"
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Rotation</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              value={rotation.x}
              onChange={(e) => setRotation(prev => ({ ...prev, x: parseFloat(e.target.value) }))}
              step={1}
              placeholder="X"
              className="input input-bordered input-sm w-full"
            />
            <input
              type="number"
              value={rotation.y}
              onChange={(e) => setRotation(prev => ({ ...prev, y: parseFloat(e.target.value) }))}
              step={1}
              placeholder="Y"
              className="input input-bordered input-sm w-full"
            />
            <input
              type="number"
              value={rotation.z}
              onChange={(e) => setRotation(prev => ({ ...prev, z: parseFloat(e.target.value) }))}
              step={1}
              placeholder="Z"
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>
        <div className="form-control">
          <label className="label"><span className="label-text">Scale</span></label>
          <div className="flex gap-2">
            <input
              type="number"
              value={scale.x}
              onChange={(e) => setScale(prev => ({ ...prev, x: Math.max(0.1, parseFloat(e.target.value)) }))}
              step={0.1}
              placeholder="X"
              min={0.1}
              className="input input-bordered input-sm w-full"
            />
            <input
              type="number"
              value={scale.y}
              onChange={(e) => setScale(prev => ({ ...prev, y: Math.max(0.1, parseFloat(e.target.value)) }))}
              step={0.1}
              placeholder="Y"
              min={0.1}
              className="input input-bordered input-sm w-full"
            />
            <input
              type="number"
              value={scale.z}
              onChange={(e) => setScale(prev => ({ ...prev, z: Math.max(0.1, parseFloat(e.target.value)) }))}
              step={0.1}
              placeholder="Z"
              min={0.1}
              className="input input-bordered input-sm w-full"
            />
          </div>
        </div>
        <div className="flex gap-4 w-full justify-end">
          <button className="btn btn-outline btn-error" onClick={handleDelete}>
            Delete Portal
          </button>
        </div>
        <button className="btn btn-ghost mt-2" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default PortalEditor;
