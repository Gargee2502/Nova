import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  CheckCircle2,
  AlertCircle,
  Database,
  Sparkles,
  Shield,
  Key
} from 'lucide-react';
import { api } from '../services/api';
import { AppSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [threshold, setThreshold] = useState<number>(0.7);
  const [model, setModel] = useState<string>('gemini-2.5-flash');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const res = await api.getSettings();
        setSettings(res);
        setThreshold(res.confidence_threshold);
        setModel(res.gemini_model);
      } catch (err) {
        console.error('Failed to load settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await api.updateSettings({
        confidence_threshold: threshold,
        gemini_model: model,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setSaveError(err.response?.data?.detail || 'Failed to save settings');
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs text-slate-400">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <SettingsIcon className="w-6 h-6 text-orange-400" />
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">System Settings</h1>
        </div>
        <p className="text-xs sm:text-sm text-slate-400">
          Tune agent confidence boundaries, active Gemini model version, and automated reminder triggers.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>Settings saved and applied successfully.</span>
        </div>
      )}

      {saveError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>{saveError}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Gemini Model Configuration */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-white">Gemini API &amp; Model Selection</h2>
          </div>

          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-300">
              Active Gemini Free-Tier Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-[#121827] border border-[#1E293B] rounded-lg px-3.5 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-orange-500"
            >
              <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended: High speed &amp; audio capabilities)</option>
              <option value="gemini-1.5-flash">gemini-1.5-flash (Stable production fallback)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Next-gen fast multimodal)</option>
            </select>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Models run through your Google AI Studio free tier. If a model encounters quota or regional limits,
              switch to another available model here or update <code className="text-orange-400">GEMINI_MODEL</code> in your backend .env file.
            </p>
          </div>

          {/* Secure API Key Notice */}
          <div className="p-4 rounded-xl bg-[#091524] border border-[#17304D] flex items-start gap-3">
            <Key className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-cyan-300">Zero-Secret Exposure Security Policy:</span>
              <p className="text-slate-400">
                In compliance with strict security rules, API keys are never entered or exposed in the web frontend.
                Configure <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">GEMINI_API_KEY</code> exclusively in the backend <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">.env</code> file.
              </p>
              <div className="flex items-center gap-2 pt-1 font-medium">
                <span>API Status: </span>
                {settings?.is_gemini_configured ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Key configured in environment
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> Key not set in backend .env
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Human-in-the-Loop Confidence Cutoff */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">Human-in-the-Loop (HITL) Threshold</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Confidence Threshold</span>
              <span className="text-orange-400 font-mono text-sm font-bold">
                {Math.round(threshold * 100)}% ({threshold.toFixed(2)})
              </span>
            </div>

            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />

            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.50 (Permissive)</span>
              <span>0.70 (Recommended Default)</span>
              <span>0.95 (Strict Review)</span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              When the Assignment Agent evaluates an extracted action item, any assignment with a confidence
              score lower than <strong className="text-slate-200">{threshold.toFixed(2)}</strong> or an ambiguous owner is automatically diverted to the
              <strong className="text-amber-400"> Human Review Queue</strong> rather than falsely stored as an approved fact.
            </p>
          </div>
        </div>

        {/* Database & Storage Status */}
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">Database &amp; Persistent Storage</h2>
          </div>

          <div className="p-4 rounded-xl bg-[#080C14] border border-[#1B2333] space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Connection Mode:</span>
              <span className={`font-semibold ${settings?.is_mongodb_configured ? 'text-emerald-400' : 'text-amber-400'}`}>
                {settings?.is_mongodb_configured ? 'MongoDB Atlas' : 'Local Persistent Storage'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status Detail:</span>
              <span className="text-slate-300 font-mono text-[11px]">{settings?.db_status_message}</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Application Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
