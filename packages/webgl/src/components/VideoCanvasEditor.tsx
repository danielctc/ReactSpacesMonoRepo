import React, { useState, useEffect, useRef } from 'react';
import { useSendUnityEvent } from '../hooks/unityEvents/core/useSendUnityEvent';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@disruptive-spaces/shared/firebase/firebase';

interface Position {
  x: number;
  y: number;
  z: number;
}

interface VideoCanvasEditorProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
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

const VideoCanvasEditor: React.FC<VideoCanvasEditorProps> = ({ isOpen, onClose, item, spaceId, style }) => {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState<Position>({ x: 0, y: 0, z: 0 });
  const [scale, setScale] = useState<Position>({ x: 1, y: 1, z: 1 });

  const [videoUrl, setVideoUrl] = useState('');
  const [videoType, setVideoType] = useState('youtube');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [autoplay, setAutoplay] = useState(false);
  const [loop, setLoop] = useState(false);
  const [muted, setMuted] = useState(true);

  const sendUnityEvent = useSendUnityEvent();

  const showToast = (title: string, description: string, status: string) => {
    console.log(`[${status.toUpperCase()}] ${title}: ${description}`);
  };

  useEffect(() => {
    if (item) {
      setPosition(item.position || { x: 0, y: 0, z: 0 });
      setRotation(item.rotation || { x: 0, y: 0, z: 0 });
      setScale(item.scale || { x: 1, y: 1, z: 1 });
      setVideoUrl(item.videoUrl || '');
      setVideoType(item.videoType || 'youtube');
      setAspectRatio(item.aspectRatio || '16:9');
      setAutoplay(item.autoplay || false);
      setLoop(item.loop || false);
      setMuted(item.muted !== undefined ? item.muted : true);
    }
  }, [item]);

  useEffect(() => {
    sendUnityEvent('UpdateVideoCanvas', {
      canvasId: item.canvasId,
      position,
      rotation,
      scale,
      videoUrl,
      videoType,
      aspectRatio,
      autoplay,
      loop,
      muted
    });
  }, [position, rotation, scale, videoUrl, videoType, aspectRatio, autoplay, loop, muted, item.canvasId, sendUnityEvent]);

  useDebouncedCallback(() => {
    const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.canvasId);
    updateDoc(itemRef, {
      position,
      rotation,
      scale,
      videoUrl,
      videoType,
      aspectRatio,
      autoplay,
      loop,
      muted,
      updatedAt: Date.now()
    });
  }, 300, [position, rotation, scale, videoUrl, videoType, aspectRatio, autoplay, loop, muted, spaceId, item.canvasId]);

  const handleDelete = async () => {
    try {
      sendUnityEvent('DeleteVideoCanvas', {
        canvasId: item.canvasId
      });
      const itemRef = doc(db, 'spaces', spaceId, 'catalogue', item.canvasId);
      await deleteDoc(itemRef);

      showToast("Video Canvas Deleted", "The video canvas has been removed.", "success");
      onClose();
    } catch (error) {
      showToast("Delete Error", "Failed to delete video canvas. Please try again.", "error");
    }
  };

  const detectVideoType = (url: string) => {
    if (!url) return 'direct';
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('vimeo.com')) return 'vimeo';
    if (url.includes('.m3u8')) return 'hls';
    return 'direct';
  };

  const handleVideoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setVideoUrl(url);
    setVideoType(detectVideoType(url));
  };

  if (!isOpen || !item) return null;

  return (
    <div
      className="absolute top-[72px] right-6 z-[2000] min-w-[360px] max-w-[400px] bg-white/15 shadow-lg rounded-2xl p-6 border border-white/20 text-gray-900"
      style={{ backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', ...style }}
    >
      <div className="font-bold text-lg mb-4">Edit Video Canvas</div>
      <div className="flex flex-col gap-4">
        <div className="form-control">
          <label className="label"><span className="label-text">Video URL</span></label>
          <input
            type="text"
            value={videoUrl}
            onChange={handleVideoUrlChange}
            placeholder="YouTube, Vimeo, or direct video URL"
            className="input input-bordered input-sm bg-white"
          />
        </div>

        <div className="flex gap-4">
          <div className="form-control flex-1">
            <label className="label"><span className="label-text">Type</span></label>
            <select value={videoType} onChange={(e) => setVideoType(e.target.value)} className="select select-bordered select-sm bg-white">
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="direct">Direct</option>
              <option value="hls">HLS Stream</option>
            </select>
          </div>
          <div className="form-control flex-1">
            <label className="label"><span className="label-text">Aspect Ratio</span></label>
            <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className="select select-bordered select-sm bg-white">
              <option value="16:9">16:9</option>
              <option value="4:3">4:3</option>
              <option value="1:1">1:1</option>
              <option value="9:16">9:16 (Vertical)</option>
            </select>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="form-control flex items-center">
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Autoplay</span>
              <input type="checkbox" className="toggle toggle-sm" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} />
            </label>
          </div>
          <div className="form-control flex items-center">
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Loop</span>
              <input type="checkbox" className="toggle toggle-sm" checked={loop} onChange={(e) => setLoop(e.target.checked)} />
            </label>
          </div>
          <div className="form-control flex items-center">
            <label className="label cursor-pointer gap-2">
              <span className="label-text text-sm">Muted</span>
              <input type="checkbox" className="toggle toggle-sm" checked={muted} onChange={(e) => setMuted(e.target.checked)} />
            </label>
          </div>
        </div>

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
          <button className="btn btn-outline btn-error btn-sm" onClick={handleDelete}>
            Delete Canvas
          </button>
        </div>
        <button className="btn btn-ghost mt-2" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default VideoCanvasEditor;
