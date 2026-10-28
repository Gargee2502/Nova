import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, UploadCloud, CheckCircle2, AlertCircle, X, ArrowRight } from 'lucide-react';
import { api } from '../services/api';
import { HealthStatus, Meeting, Task, ReviewItem } from '../types';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ meetings: Meeting[]; tasks: Task[]; reviews: ReviewItem[] } | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch {
        // server offline
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search debounced
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await api.search(searchQuery.trim());
        setSearchResults(results);
        setShowDropdown(true);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <header className="h-16 border-b border-[#1B2333] bg-[#090D16]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Search Input with dropdown */}
      <div className="relative w-96" ref={searchRef}>
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search meetings, action items, participants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => {
              if (searchResults) setShowDropdown(true);
            }}
            className="w-full bg-[#0E1422] border border-[#1E293B] rounded-lg pl-9 pr-8 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
                setShowDropdown(false);
              }}
              className="absolute right-2.5 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showDropdown && searchResults && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0E1422] border border-[#1E293B] rounded-xl shadow-2xl overflow-hidden z-50 max-h-96 overflow-y-auto">
            {searchResults.meetings.length === 0 && searchResults.tasks.length === 0 && searchResults.reviews.length === 0 ? (
              <div className="p-4 text-xs text-slate-400 text-center">No results found for &ldquo;{searchQuery}&rdquo;</div>
            ) : (
              <div className="p-2 space-y-3">
                {searchResults.meetings.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Meetings</div>
                    {searchResults.meetings.map((m) => (
                      <Link
                        key={m.id}
                        to={`/meetings/${m.id}`}
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#151D2E] text-xs text-slate-200 transition-colors"
                      >
                        <span className="font-medium truncate">{m.title}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                      </Link>
                    ))}
                  </div>
                )}

                {searchResults.tasks.length > 0 && (
                  <div>
                    <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Action Items</div>
                    {searchResults.tasks.map((t) => (
                      <Link
                        key={t.id}
                        to="/tasks"
                        onClick={() => setShowDropdown(false)}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-[#151D2E] text-xs text-slate-200 transition-colors"
                      >
                        <span className="truncate">{t.title}</span>
                        <span className="text-[10px] text-orange-400 font-mono shrink-0 ml-2">{t.assignee || 'Unassigned'}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-4">
        {/* Gemini / DB System Health Pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0E1422] border border-[#1E293B] text-xs text-slate-300">
          {health?.gemini?.configured ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span>
            {health?.gemini?.configured
              ? `Gemini ${health.gemini.model.replace('gemini-', '')}`
              : 'Gemini Key Needed'}
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-[11px] text-slate-400">
            {health?.database?.connected ? 'Atlas DB' : 'Local DB'}
          </span>
        </div>

        {/* Upload CTA Button */}
        <button
          onClick={() => navigate('/upload')}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium text-xs rounded-lg shadow-md shadow-orange-500/20 active:scale-95 transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Meeting</span>
        </button>
      </div>
    </header>
  );
};
