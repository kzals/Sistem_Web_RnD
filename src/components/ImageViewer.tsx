'use client';

import { useRef, useState, useEffect } from 'react';

interface ImageViewerProps {
  src: string;
  alt: string;
  className?: string;
}

export default function ImageViewer({ src, alt, className = '' }: ImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e: WheelEvent) => {
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

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.2, 5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.2, 1));
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel as EventListener, { passive: false });
      return () => {
        container.removeEventListener('wheel', handleWheel as EventListener);
      };
    }
  }, []);

  return (
    <div className="flex flex-col gap-2">
      {/* Control buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleZoomIn}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
          title="Zoom In (atau scroll +)"
        >
          🔍+
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
          disabled={zoom <= 1}
          title="Zoom Out (atau scroll -)"
        >
          🔍−
        </button>
        <button
          onClick={handleReset}
          className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded text-sm font-medium"
          title="Reset ke ukuran normal"
        >
          Reset
        </button>
        <span className="text-sm text-gray-600 flex items-center">
          Zoom: {Math.round(zoom * 100)}%
        </span>
      </div>

      {/* Image container */}
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-lg border border-gray-200 bg-gray-50 ${className}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
      >
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="w-full h-auto object-contain transition-transform duration-75"
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center',
          }}
        />
      </div>

      {/* Info text */}
      {zoom > 1 && (
        <p className="text-xs text-gray-500">
          💡 Tarik gambar untuk menggesernya. Gunakan scroll atau tombol untuk zoom.
        </p>
      )}
    </div>
  );
}
