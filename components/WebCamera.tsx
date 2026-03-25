'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Camera, X, RefreshCw, Check, FlipHorizontal } from 'lucide-react'

interface WebCameraProps {
  onCapture: (file: File) => void
  onClose: () => void
}

export default function WebCamera({ onCapture, onClose }: WebCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [quality, setQuality] = useState<'low' | 'medium' | 'high'>('high')
  const [permissionError, setPermissionError] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  // Store stream locally to stop it predictably without dependency array nightmares
  const currentStreamRef = useRef<MediaStream | null>(null)

  const startCamera = useCallback(async (currentMode: string, currentQual: string) => {
    try {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      setPermissionError(false)
      
      let videoConstraints: any = { facingMode: currentMode }
      
      if (currentQual === 'low') {
        videoConstraints.width = { ideal: 640 }
        videoConstraints.height = { ideal: 480 }
      } else if (currentQual === 'medium') {
        videoConstraints.width = { ideal: 1280 }
        videoConstraints.height = { ideal: 720 }
      } else if (currentQual === 'high') {
        videoConstraints.width = { ideal: 1920 }
        videoConstraints.height = { ideal: 1080 }
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: false
      })

      currentStreamRef.current = mediaStream
      setStream(mediaStream)

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setPermissionError(true)
    }
  }, [])

  useEffect(() => {
    startCamera(facingMode, quality)

    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [facingMode, quality, startCamera])

  useEffect(() => {
    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current || !stream) return

    setIsCapturing(true)
    const video = videoRef.current
    const canvas = canvasRef.current

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (context) {
      if (facingMode === 'user') {
        // Mirror the canvas for selfies
        context.translate(canvas.width, 0)
        context.scale(-1, 1)
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      video.pause() // Freeze visual feedback
      
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture_${Date.now()}.jpg`, { type: 'image/jpeg' })
          
          // Stop camera before closing
          stream.getTracks().forEach(track => track.stop())
          setStream(null)
          
          onCapture(file)
        } else {
           console.error("Canvas toBlob failed")
           onClose()
        }
        setIsCapturing(false)
      }, 'image/jpeg', quality === 'high' ? 0.9 : quality === 'medium' ? 0.75 : 0.6)
    } else {
       onClose()
    }
  }

  const handleToggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {/* Header controls */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => {
            if (currentStreamRef.current) {
              currentStreamRef.current.getTracks().forEach(track => track.stop())
            }
            onClose()
          }}
          className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-all shadow-lg"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQuality(q => q === 'high' ? 'medium' : q === 'medium' ? 'low' : 'high')}
            className="px-4 py-2 bg-indigo-600/60 rounded-full text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md hover:bg-indigo-500 transition-all border border-indigo-500/30 shadow-lg"
            title="Cambiar Calidad"
          >
            {quality === 'high' ? 'HQ 1080p' : quality === 'medium' ? 'MQ 720p' : 'LQ 480p'}
          </button>
          
          <button 
            onClick={handleToggleCamera}
            className="p-3 bg-white/10 rounded-full text-white backdrop-blur-md hover:bg-white/20 transition-all shadow-lg"
            title="Cambiar Cámara"
          >
            <FlipHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {permissionError ? (
        <div className="text-center p-8 bg-slate-900 rounded-3xl border border-white/10 max-w-sm mx-auto relative z-10">
          <Camera className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white uppercase mb-2">Acceso Restringido</h3>
          <p className="text-sm text-slate-400 mb-6">El acceso web a la cámara fue bloqueado (posiblemente porque estás usando HTTP en red local en vez de HTTPS o faltan permisos).</p>
          
          <div className="space-y-4">
            <label className="px-6 py-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors w-full flex justify-center items-center gap-2 cursor-pointer shadow-lg shadow-emerald-600/20">
              <Camera className="w-5 h-5" /> USAR CÁMARA NATIVA
              <input 
                type="file" 
                accept="image/*" 
                capture="environment" 
                className="hidden" 
                onChange={(e) => {
                  const files = Array.from(e.target.files || [])
                  if (files.length > 0) {
                    onCapture(files[0])
                  }
                }} 
              />
            </label>
            
            <button 
              onClick={() => startCamera(facingMode, quality)}
              className="px-6 py-3 bg-slate-800 text-slate-300 rounded-xl font-bold hover:bg-slate-700 transition-colors w-full flex justify-center items-center gap-2 shadow-lg"
            >
              <RefreshCw className="w-4 h-4" /> REINTENTAR CÁMARA
            </button>
          </div>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col max-w-2xl mx-auto">
          {/* Video element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Guidelines / UI overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full border-[1px] border-white/20 border-dashed"></div>
            <div className="absolute inset-x-0 bottom-40 flex justify-center">
               <span className="px-3 py-1 bg-black/50 backdrop-blur-md text-[10px] font-black uppercase tracking-widest text-white rounded-full">
                 {facingMode === 'environment' ? 'LENTE TRASERO' : 'LENTE FRONTAL'}
               </span>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="absolute bottom-0 left-0 w-full p-8 flex justify-center items-center bg-gradient-to-t from-black via-black/80 to-transparent">
            {isCapturing ? (
              <div className="w-20 h-20 rounded-full border-4 border-indigo-500 flex items-center justify-center animate-pulse">
                <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-white" />
                </div>
              </div>
            ) : (
              <button 
                onClick={handleCapture}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform group"
              >
                <div className="w-full h-full bg-white rounded-full group-hover:bg-slate-200 transition-colors"></div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
