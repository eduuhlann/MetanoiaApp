import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Area {
  width: number;
  height: number;
  x: number;
  y: number;
}

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  aspect: number;
  title: string;
  isBanner?: boolean;
  onCropComplete: (croppedAreaPixels: Area) => void;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  image,
  aspect,
  title,
  isBanner = false,
  onCropComplete,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropChange = (crop: Point) => {
    setCrop(crop);
  };

  const onZoomChange = (zoom: number) => {
    setZoom(zoom);
  };

  const onCropCompleteInternal = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = () => {
    if (croppedAreaPixels) {
      onCropComplete(croppedAreaPixels);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0f0f0f] backdrop-blur-md"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="relative w-full h-full flex flex-col overflow-hidden"
          >
            <div className="px-8 py-6 flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-[#f1f1f1] font-sans">
                {title}
              </h2>
            </div>

            <div className="relative flex-1 bg-[#0f0f0f] flex items-center justify-center p-4 md:p-12">
              <div className="relative w-full max-w-5xl border border-white/5 shadow-2xl overflow-hidden bg-black/40" style={{ aspectRatio: `${aspect}` }}>
                <Cropper
                  image={image}
                  crop={crop}
                  zoom={zoom}
                  rotation={rotation}
                  aspect={aspect}
                  onCropChange={onCropChange}
                  onCropComplete={onCropCompleteInternal}
                  onZoomChange={onZoomChange}
                  showGrid={false}
                  classes={{
                      containerClassName: "bg-[#0f0f0f]",
                      mediaClassName: "max-w-none",
                  }}
                />
                
                {isBanner && (
                  <div className="absolute inset-0 pointer-events-none z-10">
                     <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[60.3%] border-x border-sky-400/50 bg-sky-400/5 relative group">
                        <div className="absolute top-2 left-2">
                           <span className="bg-[#212121]/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-bold text-white/90 whitespace-nowrap">
                               Visível em todos os dispositivos
                           </span>
                        </div>
                     </div>

                     <div className="absolute top-2 left-2">
                        <span className="bg-[#212121]/80 backdrop-blur-sm px-3 py-1.5 rounded-full text-[10px] font-bold text-white/90">
                            Visível em computadores
                        </span>
                     </div>

                     <div className="absolute inset-0 border-[2px] border-sky-400 pointer-events-none opacity-40">
                         <div className="absolute -top-1 -left-1 w-2 h-2 bg-white border border-sky-400" />
                         <div className="absolute -top-1 -right-1 w-2 h-2 bg-white border border-sky-400" />
                         <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-white border border-sky-400" />
                         <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-white border border-sky-400" />
                     </div>
                  </div>
                )}
              </div>
            </div>

            <div className="px-8 py-8 bg-[#0f0f0f] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6 flex-1 max-w-xs">
                <div className="flex items-center gap-4 flex-1">
                  <ZoomOut size={16} className="text-white/40" />
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 accent-sky-400"
                  />
                  <ZoomIn size={16} className="text-white/40" />
                </div>
                
                <div className="flex items-center gap-4 flex-1">
                  <RotateCw size={16} className="text-white/40" />
                  <input
                    type="range"
                    value={rotation}
                    min={0}
                    max={360}
                    step={1}
                    aria-labelledby="Rotation"
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 accent-sky-400"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="px-8 py-2.5 bg-[#212121] hover:bg-[#333333] text-white rounded-full font-bold text-sm transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleApply}
                  className="px-8 py-2.5 bg-white text-black hover:bg-white/90 rounded-full font-bold text-sm transition-all flex items-center justify-center gap-2"
                >
                  Pronto
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ImageCropModal;
