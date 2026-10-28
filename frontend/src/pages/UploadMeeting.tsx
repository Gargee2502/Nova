import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  X,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';

export const UploadMeeting: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [ownerName, setOwnerName] = useState('CEO');
  const [participants, setParticipants] = useState('');
  const [autoProcess, setAutoProcess] = useState(true);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (file: File) => {
    // Validate format
    const validExts = ['.mp3', '.wav', '.m4a', '.ogg', '.mp4', '.webm', '.mov', '.aac', '.flac'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      setErrorMessage(`Unsupported format '${ext}'. Allowed: ${validExts.join(', ')}`);
      return;
    }

    // Check size limit (200MB)
    if (file.size > 200 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 200 MB limit.');
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    if (!meetingTitle) {
      // Auto-populate title without extension
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      setMeetingTitle(baseName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select an audio or video file to upload.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    if (meetingTitle.trim()) formData.append('title', meetingTitle.trim());
    if (ownerName.trim()) formData.append('owner_name', ownerName.trim());
    if (participants.trim()) formData.append('participants', participants.trim());
    formData.append('auto_process', autoProcess ? 'true' : 'false');

    try {
      const createdMeeting = await api.uploadMeeting(formData, (pct) => {
        setUploadProgress(pct);
      });
      // Redirect to meeting details
      navigate(`/meetings/${createdMeeting.id}`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Upload failed.';
      setErrorMessage(msg);
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return Math.round(bytes / 1024) + ' KB';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Upload Meeting</h1>
        <p className="text-sm text-slate-400 mt-1">
          Upload an audio or video file — AI transcribes it and extracts follow-ups in seconds
        </p>
      </div>

      {/* Main Upload Box */}
      <div className="bg-[#0B0F17] border border-[#1B2333] rounded-2xl p-6 sm:p-8 space-y-6">
        {/* Dropzone or Selected File Chip */}
        {!selectedFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#232F45] hover:border-emerald-500/50 bg-[#0E1422] rounded-xl p-8 text-center cursor-pointer transition-all hover:bg-[#121A2C] group"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,.m4a,.ogg,.mp4,.webm,.mov,.aac,.flac"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <UploadCloud className="w-7 h-7" />
            </div>
            <div className="text-sm font-semibold text-slate-200 mb-1">
              Click to upload or drag & drop audio / video file
            </div>
            <div className="text-xs text-slate-500">
              MP3, WAV, M4A, OGG, MP4, WEBM (Max 200 MB)
            </div>
          </div>
        ) : (
          /* File Chip matching image 2 */
          <div className="p-4 rounded-xl bg-[#0B151F] border border-emerald-500/40 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                {selectedFile.type.includes('video') ? (
                  <FileVideo className="w-5 h-5" />
                ) : (
                  <FileAudio className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-slate-100 truncate">
                  {selectedFile.name}
                </div>
                <div className="text-xs text-slate-400">
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedFile(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error Notification */}
        {errorMessage && (
          <div className="p-3.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Inputs Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your name in the meeting — used to identify your tasks
            </label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. CEO, Doug Shaver, Tristan Vantage"
              className="w-full bg-[#0E1422] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Meeting Title (optional)
            </label>
            <input
              type="text"
              value={meetingTitle}
              onChange={(e) => setMeetingTitle(e.target.value)}
              placeholder="e.g. 09-15-2026-Council-Meeting"
              className="w-full bg-[#0E1422] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Known Participants (optional, comma-separated)
            </label>
            <input
              type="text"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="e.g. Doug Shaver, Melinda Warren, Glenn Fuel, Christy Groenheide"
              className="w-full bg-[#0E1422] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              The Assignment Agent will match task owners against this participant roster.
            </p>
          </div>

          {/* Auto-process Toggle */}
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="autoProcess"
              checked={autoProcess}
              onChange={(e) => setAutoProcess(e.target.checked)}
              className="rounded bg-[#0E1422] border-[#1E293B] text-orange-500 focus:ring-orange-500/20"
            />
            <label htmlFor="autoProcess" className="text-xs text-slate-300 cursor-pointer">
              Automatically trigger LangGraph AI processing pipeline immediately after upload
            </label>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Uploading file...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 w-full bg-[#162035] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Primary Submit Button matching image 2 */}
          <button
            type="submit"
            disabled={isUploading || !selectedFile}
            className="w-full mt-4 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Processing Upload...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Upload &amp; Transcribe</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
