'use client';

import { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileVideo, Activity, Box } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'failed'>('idle');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [roiData, setRoiData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const uploadFile = async () => {
    if (!file) return;
    setStatus('uploading');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post(`${API_URL}/video/upload`, formData);
      setVideoId(res.data.id);
      setStatus('processing');
    } catch (error) {
      console.error(error);
      setStatus('failed');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (status === 'processing' && videoId) {
      interval = setInterval(async () => {
        try {
          const res = await axios.get(`${API_URL}/video/${videoId}/status`);
          if (res.data.status === 'completed') {
            setStatus('completed');
            const roiRes = await axios.get(`${API_URL}/video/${videoId}/roi`);
            setRoiData(roiRes.data);
          } else if (res.data.status === 'failed') {
            setStatus('failed');
          }
        } catch (error) {
          console.error(error);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status, videoId]);

  return (
    <main className="max-w-5xl mx-auto p-8">
      <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
        <Activity className="text-emerald-500 w-10 h-10" /> 
        FaceDetect<span className="text-emerald-500">AI</span>
      </h1>
      <p className="text-gray-400 mb-10">Upload a video to detect faces and extract Regions of Interest (ROI).</p>

      {status === 'idle' && (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition rounded-2xl p-16 text-center cursor-pointer"
        >
          <UploadCloud className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold mb-2">Drag & Drop or Click to Upload</h2>
          <p className="text-gray-400 text-sm">Supports MP4, AVI, MOV, MKV, WebM</p>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".mp4,.avi,.mov,.mkv,.webm"
            onChange={handleFileChange}
          />
          {file && (
            <div className="mt-6 p-4 bg-gray-900 rounded-lg inline-flex items-center gap-3">
              <FileVideo className="text-emerald-500" />
              <span>{file.name}</span>
              <button 
                onClick={(e) => { e.stopPropagation(); uploadFile(); }}
                className="ml-4 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded font-medium transition"
              >
                Start Processing
              </button>
            </div>
          )}
        </div>
      )}

      {(status === 'uploading' || status === 'processing') && (
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-16 text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold mb-2">
            {status === 'uploading' ? 'Uploading Video...' : 'Processing Video...'}
          </h2>
          <p className="text-gray-400">Detecting faces and drawing bounding boxes.</p>
        </div>
      )}

      {status === 'failed' && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-2xl p-16 text-center text-red-400">
          <h2 className="text-2xl font-bold mb-2">Processing Failed</h2>
          <p>An error occurred while processing the video. Please try again.</p>
          <button 
            onClick={() => setStatus('idle')}
            className="mt-6 bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded transition"
          >
            Upload Another
          </button>
        </div>
      )}

      {status === 'completed' && videoId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center gap-2">
              <FileVideo className="w-5 h-5 text-emerald-500" />
              <h3 className="font-semibold">Processed Video</h3>
            </div>
            <div className="p-4">
              <video 
                controls 
                className="w-full rounded-lg bg-black"
                src={`${API_URL}/video/${videoId}/stream`}
              />
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-2xl overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-gray-700 bg-gray-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-emerald-500" />
                <h3 className="font-semibold">ROI Data</h3>
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded">
                {roiData?.facesDetected || 0} Detections
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-gray-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2">Frame</th>
                    <th className="px-4 py-2">Coordinates (x1, y1, x2, y2)</th>
                  </tr>
                </thead>
                <tbody>
                  {roiData?.roiData?.map((roi: any, i: number) => (
                    <tr key={i} className="border-b border-gray-700 hover:bg-gray-700/50">
                      <td className="px-4 py-3">{roi.frameNumber}</td>
                      <td className="px-4 py-3 font-mono text-emerald-400">
                        {roi.xMin}, {roi.yMin}, {roi.xMax}, {roi.yMax}
                      </td>
                    </tr>
                  ))}
                  {(!roiData?.roiData || roiData.roiData.length === 0) && (
                    <tr>
                      <td colSpan={2} className="text-center py-8 text-gray-500">No faces detected.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="md:col-span-2 text-center">
            <button 
              onClick={() => { setStatus('idle'); setFile(null); setVideoId(null); setRoiData(null); }}
              className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded transition"
            >
              Upload Another Video
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
