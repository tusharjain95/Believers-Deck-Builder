import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Check, X, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { getCroppedImg, type Area } from '../utils/imageUtils';

interface PhotoCropModalProps {
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  onClose: () => void;
}

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  imageSrc,
  onCropComplete,
  onClose,
}) => {
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Aspect ratio 4.31:5 (the round frame on the feature presentation slide)
  const aspect = 4.31 / 5;

  const onCropChange = (newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  };

  const onZoomChange = (newZoom: number) => {
    setZoom(newZoom);
  };

  const onCropCompleteCallback = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      // Resize to max 900 px per project requirements
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels, 900);
      onCropComplete(blob);
      onClose();
    } catch (err) {
      console.error('Failed to crop photo:', err);
      alert('Failed to crop image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-750 text-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-base text-white">Crop Member Photo</h3>
            <p className="text-xs text-slate-400">
              Aspect 4.31:5 (calibrated for BNI Believers feature slide round frame) • Max 900px
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative w-full h-80 bg-slate-950">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape="round"
            showGrid={true}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteCallback}
          />
        </div>

        {/* Zoom Controls */}
        <div className="px-6 py-4 bg-slate-850 border-t border-slate-800 space-y-3">
          <div className="flex items-center space-x-3 text-xs text-slate-300">
            <ZoomOut className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.05}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-red-600 h-1.5 bg-slate-700 rounded-lg cursor-pointer"
            />
            <ZoomIn className="w-4 h-4 text-slate-400" />
            <span className="font-mono text-xs w-10 text-right">{zoom.toFixed(1)}x</span>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-2">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Processing...' : 'Apply & Save Photo'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
