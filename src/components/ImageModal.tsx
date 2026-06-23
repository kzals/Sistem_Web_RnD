'use client';

import { useState, useRef, useEffect } from 'react';

interface ImageModalProps {
  isOpen: boolean;
  src: string;
  alt: string;
  onClose: () => void;
  hideBands?: boolean;
}

export default function ImageModal({ isOpen, src, alt, onClose, hideBands = false }: ImageModalProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Reset zoom dan pan saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen]);

  // Close modal dengan ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom((prev) => Math.max(1, Math.min(prev + delta, 5)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 1));
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Header dengan tombol close (hilangkan header jika hideBands=true) */}
      {!hideBands && (
        <div
          className="w-full h-16 bg-black flex items-center justify-between px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-white text-sm">{alt}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-white hover:bg-gray-800 p-2 rounded-full transition"
            title="Tutup (ESC)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Image container */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center w-full overflow-hidden relative"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pointer-events-none absolute right-4 top-4 z-10 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
          Scroll untuk zoom, drag saat sudah diperbesar
        </div>
        <svg viewBox="0 0 600 720" className="max-w-full max-h-full select-none" aria-hidden="true">
          <svg
            x="0"
            y={hideBands ? 28 : 0}
            width="600"
            height={hideBands ? 664 : 720}
            overflow="hidden"
          >
            <image
              ref={imgRef as any}
              href={src}
              x="0"
              y={hideBands ? -28 : 0}
              width="600"
              height="720"
              preserveAspectRatio="xMidYMid meet"
              style={{
                transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                transformOrigin: 'center',
                transformBox: 'fill-box',
                display: 'block',
              }}
            />
          </svg>
        </svg>
      </div>

      {/* Footer dengan tombol zoom dan info (hilangkan footer jika hideBands=true) */}
      {!hideBands && (
        <div className="w-full h-16 bg-black flex items-center justify-center gap-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
          disabled={zoom <= 1}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition text-sm font-medium"
          title="Zoom Out (atau scroll)"
        >
          −
        </button>
        <span className="text-white text-sm min-w-16 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded transition text-sm font-medium"
          title="Zoom In (atau scroll)"
        >
          +
        </button>
        </div>
      )}
    </div>
  );
}
