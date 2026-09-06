"use client"

import React, { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Check, X } from "lucide-react"
import { Slider } from "@/components/ui/slider"

interface ImageCropperModalProps {
  isOpen: boolean
  onClose: () => void
  imageSrc: string | null
  fileName?: string
  shape?: "circle" | "square"
  onCropComplete: (file: File) => void
}

export function ImageCropperModal({
  isOpen,
  onClose,
  imageSrc,
  fileName = "avatar.jpg",
  shape = "circle",
  onCropComplete,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [loading, setLoading] = useState(false)
  const [cropBoxSize, setCropBoxSize] = useState(250)

  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const isDraggingRef = useRef(false)

  // Handle responsive sizing of crop boundary based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== "undefined") {
        if (window.innerWidth < 380) {
          setCropBoxSize(180)
        } else if (window.innerWidth < 480) {
          setCropBoxSize(210)
        } else {
          setCropBoxSize(250)
        }
      }
    }
    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  // Reset zoom and offset when modal opens, image changes, or crop boundary changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setLoading(false)
    }
  }, [isOpen, imageSrc, cropBoxSize])

  // Helper to limit offset to keep the image covering the crop box
  const limitOffset = (x: number, y: number, currentZoom: number) => {
    if (!imageRef.current) return { x, y }
    const { naturalWidth, naturalHeight } = imageRef.current
    const baseScale = Math.max(cropBoxSize / naturalWidth, cropBoxSize / naturalHeight)
    const W = naturalWidth * baseScale * currentZoom
    const H = naturalHeight * baseScale * currentZoom

    const maxOffsetX = (W - cropBoxSize) / 2
    const maxOffsetY = (H - cropBoxSize) / 2

    return {
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, y)),
    }
  }

  // Handle Wheel zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container || !isOpen) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const zoomStep = 0.05
      setZoom((prevZoom) => {
        const nextZoom = Math.max(1, Math.min(3, prevZoom + (e.deltaY < 0 ? zoomStep : -zoomStep)))
        setOffset((prevOffset) => limitOffset(prevOffset.x, prevOffset.y, nextZoom))
        return nextZoom
      })
    }

    container.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      container.removeEventListener("wheel", handleWheel)
    }
  }, [isOpen, imageSrc, cropBoxSize])

  // Dragging Handlers
  const handleDragStart = (clientX: number, clientY: number) => {
    isDraggingRef.current = true
    dragStartRef.current = {
      x: clientX - offset.x,
      y: clientY - offset.y,
    }
  }

  const handleDragMove = (clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return
    const newX = clientX - dragStartRef.current.x
    const newY = clientY - dragStartRef.current.y
    setOffset(limitOffset(newX, newY, zoom))
  }

  const handleDragEnd = () => {
    isDraggingRef.current = false
  }

  // Mouse Events
  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    handleDragStart(e.clientX, e.clientY)
  }

  const onMouseMove = (e: React.MouseEvent) => {
    handleDragMove(e.clientX, e.clientY)
  }

  // Touch Events (for mobile)
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    handleDragStart(e.touches[0].clientX, e.touches[0].clientY)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return
    handleDragMove(e.touches[0].clientX, e.touches[0].clientY)
  }

  const handleZoomChange = (newZoom: number) => {
    setZoom(newZoom)
    setOffset((prev) => limitOffset(prev.x, prev.y, newZoom))
  }

  // Perform Crop and Compression
  const handleCropSave = () => {
    const img = imageRef.current
    if (!img) return
    setLoading(true)

    // Wait a brief tick to let UI update
    setTimeout(() => {
      try {
        const canvas = document.createElement("canvas")
        canvas.width = 400 // Standardize output to 400x400 px
        canvas.height = 400
        const ctx = canvas.getContext("2d")
        if (!ctx) throw new Error("Could not create canvas context")

        const { naturalWidth, naturalHeight } = img
        const baseScale = Math.max(cropBoxSize / naturalWidth, cropBoxSize / naturalHeight)
        const totalScale = baseScale * zoom

        const W = naturalWidth * totalScale
        const H = naturalHeight * totalScale

        // Compute coordinate boundaries
        const left = (cropBoxSize - W) / 2 + offset.x
        const top = (cropBoxSize - H) / 2 + offset.y

        const sx = -left / totalScale
        const sy = -top / totalScale
        const sWidth = cropBoxSize / totalScale
        const sHeight = cropBoxSize / totalScale

        // Fill background with white to handle transparent PNGs gracefully
        ctx.fillStyle = "#FFFFFF"
        ctx.fillRect(0, 0, 400, 400)

        // Draw cropped portion
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = "high"
        ctx.drawImage(
          img,
          sx,
          sy,
          sWidth,
          sHeight,
          0,
          0,
          400,
          400
        )

        // Compress canvas contents using JPEG format at 85% quality
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const baseName = fileName.replace(/\.[^/.]+$/, "") // Strip original extension
              const compressedFile = new File([blob], `${baseName}_cropped.jpg`, {
                type: "image/jpeg",
                lastModified: Date.now(),
              })
              onCropComplete(compressedFile)
              onClose()
            } else {
              throw new Error("Canvas compression failed")
            }
          },
          "image/jpeg",
          0.85
        )
      } catch (err) {
        console.error("Crop error:", err)
      } finally {
        setLoading(false)
      }
    }, 50)
  }

  if (!imageSrc) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-4 sm:p-6 gap-4 sm:gap-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-cirka">
            {shape === "circle" ? "Crop Profile Picture" : "Crop Logo"}
          </DialogTitle>
        </DialogHeader>

        {/* Cropping Area */}
        <div className="flex flex-col items-center justify-center gap-4 sm:gap-6">
          <div
            ref={containerRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={handleDragEnd}
            style={{
              height: `${cropBoxSize + 30}px`,
            }}
            className="relative w-full bg-neutral-900 border rounded-xl overflow-hidden cursor-move flex items-center justify-center select-none"
          >
            {/* The Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                maxWidth: "none",
                maxHeight: "none",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
              draggable={false}
              className="absolute pointer-events-none select-none transition-transform duration-75 ease-out"
            />

            {/* Crop Overlay Mask */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div
                style={{
                  width: `${cropBoxSize}px`,
                  height: `${cropBoxSize}px`,
                }}
                className={`border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ${
                  shape === "circle" ? "rounded-full" : "rounded-2xl"
                }`}
              />
            </div>
          </div>

          {/* Zoom Slider Controls */}
          <div className="w-full flex items-center gap-3">
            <ZoomOut className="size-4 text-muted-foreground shrink-0" />
            <Slider
              min={1}
              max={3}
              step={0.01}
              value={[zoom]}
              onValueChange={(val) => handleZoomChange(val[0])}
              className="w-full"
              aria-label="Zoom level"
            />
            <ZoomIn className="size-4 text-muted-foreground shrink-0" />
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-3 justify-end sm:justify-end border-t pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <X className="size-4" /> Cancel
          </Button>
          <Button
            onClick={handleCropSave}
            disabled={loading}
            className="flex items-center gap-1.5 min-w-25"
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Check className="size-4" /> Save & Apply
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
