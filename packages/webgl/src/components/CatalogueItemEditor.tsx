import React, { useState, useEffect, useRef } from 'react';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

interface Position { x: number; y: number; z: number }
interface Rotation { x: number; y: number; z: number }
interface Scale { x: number; y: number; z: number }

interface CatalogueItem {
  hotspotId: string;
  position?: Position;
  rotation?: Rotation;
  scale?: Scale;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  item: CatalogueItem | null;
  spaceId: string;
  style?: React.CSSProperties;
}

// Debounce utility
function useDebouncedCallback(callback: () => void, delay: number, deps: React.DependencyList) {
  const handler = useRef<NodeJS.Timeout>();
  useEffect(() => {
    if (handler.current) clearTimeout(handler.current);
    handler.current = setTimeout(callback, delay);
    return () => clearTimeout(handler.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

const CatalogueItemEditor: React.FC<Props> = ({ isOpen, onClose, item, spaceId, style }) => {
  if (!isOpen || !item) return null;

  const [position, setPosition] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState<Rotation>({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState<Scale>({ x: 1, y: 1, z: 1 });
  const [toast, setToast] = useState<{message: string; type: string} | null>(null);
  const sendUnityEvent = useSendUnityEvent();

  // Update state when item changes
  useEffect(() => {
    if (item) {
      setPosition(item.position || { x: 0, y: 0, z: 0 });
      setRotation(item.rotation || { x: 0, y: 0, z: 0 });
      setScale(item.scale || { x: 1, y: 1, z: 1 });
    }
  }, [item]);

  // Send live update to Unity on any change
  useEffect(() => {
    sendUnityEvent('UpdateCatalogueItem', {
      hotspotId: item.hotspotId,
      position,
      rotation,
      scale
    });
  }, [position, rotation, scale, item.hotspotId, sendUnityEvent]);

  // Debounced save to Firebase on any change
  useDebouncedCallback(() => {
    const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.hotspotId);
    updateDoc(itemRef, {
      position,
      rotation,
      scale,
      updatedAt: Date.now()
    });
  }, 300, [position, rotation, scale, spaceId, item.hotspotId]);

  const handleDelete = async () => {
    try {
      sendUnityEvent('DeleteCatalogueItem', {
        hotspotId: item.hotspotId
      });
      const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.hotspotId);
      await deleteDoc(itemRef);

      setToast({ message: "Item Deleted", type: "success" });
      setTimeout(() => setToast(null), 3000);
      onClose();
    } catch (error) {
      setToast({ message: "Failed to delete item. Please try again.", type: "error" });
      setTimeout(() => setToast(null), 5000);
    }
  };

  return (
    <>
      <div
        className="absolute top-[72px] right-6 z-[2000] min-w-[340px] max-w-[360px] bg-base-200/80 backdrop-blur-sm rounded-2xl p-6 border border-white/20 shadow-xl"
        style={style}
      >
        <div className="font-bold text-lg mb-2">Edit Catalogue Item</div>
        <div className="flex flex-col gap-4">
          {/* Position */}
          <div className="form-control">
            <label className="label"><span className="label-text">Position</span></label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={position.x}
                onChange={(e) => setPosition(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                step={0.1}
                placeholder="X"
              />
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={position.y}
                onChange={(e) => setPosition(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                step={0.1}
                placeholder="Y"
              />
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={position.z}
                onChange={(e) => setPosition(prev => ({ ...prev, z: parseFloat(e.target.value) || 0 }))}
                step={0.1}
                placeholder="Z"
              />
            </div>
          </div>

          {/* Rotation */}
          <div className="form-control">
            <label className="label"><span className="label-text">Rotation</span></label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={rotation.x}
                onChange={(e) => setRotation(prev => ({ ...prev, x: parseFloat(e.target.value) || 0 }))}
                step={1}
                placeholder="X"
              />
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={rotation.y}
                onChange={(e) => setRotation(prev => ({ ...prev, y: parseFloat(e.target.value) || 0 }))}
                step={1}
                placeholder="Y"
              />
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={rotation.z}
                onChange={(e) => setRotation(prev => ({ ...prev, z: parseFloat(e.target.value) || 0 }))}
                step={1}
                placeholder="Z"
              />
            </div>
          </div>

          {/* Scale */}
          <div className="form-control">
            <label className="label"><span className="label-text">Scale</span></label>
            <div className="flex gap-2">
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={scale.x}
                onChange={(e) => setScale(prev => ({ ...prev, x: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                step={0.1}
                min={0.1}
                placeholder="X"
              />
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={scale.y}
                onChange={(e) => setScale(prev => ({ ...prev, y: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                step={0.1}
                min={0.1}
                placeholder="Y"
              />
              <input
                type="number"
                className="input input-bordered input-sm w-full"
                value={scale.z}
                onChange={(e) => setScale(prev => ({ ...prev, z: Math.max(0.1, parseFloat(e.target.value) || 1) }))}
                step={0.1}
                min={0.1}
                placeholder="Z"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 w-full">
            <button className="btn btn-error btn-outline" onClick={handleDelete}>
              Delete Item
            </button>
          </div>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {toast && (
        <div className="toast toast-top">
          <div className={`alert ${toast.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default CatalogueItemEditor;
