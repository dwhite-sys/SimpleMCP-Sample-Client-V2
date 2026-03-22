// OpenWebUI-style model selector dropdown
import { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, ExternalLink, Check, Loader2 } from 'lucide-react';
import { llmClient, type ModelInfo } from '../services/llm';

interface ModelSelectorProps {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  isConfigured: boolean;
}

export function ModelSelector({ selectedModel, onSelectModel, isConfigured }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'external'>('all');
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load models when opened
  useEffect(() => {
    if (open && isConfigured && models.length === 0) {
      setLoading(true);
      llmClient.listModels()
        .then(setModels)
        .catch(() => setModels([]))
        .finally(() => setLoading(false));
    }
  }, [open, isConfigured]);

  // Refresh models when config changes
  useEffect(() => {
    setModels([]);
  }, [isConfigured]);

  const filtered = models.filter((m) => {
    const id = m.id.toLowerCase();
    const q = search.toLowerCase();
    return id.includes(q) || (m.name || '').toLowerCase().includes(q);
  });

  // Format model name as "Provider: Model Name"
  const formatModelName = (model: ModelInfo): string => {
    if (model.owned_by) return `${m.owned_by}: ${m.name || m.id}`;
    // Try to infer provider from id (e.g. "google/gemini-pro" → "Google: gemini-pro")
    const parts = model.id.split('/');
    if (parts.length >= 2) {
      const provider = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      const name = parts.slice(1).join('/');
      return `${provider}: ${name}`;
    }
    return model.name || model.id;
  };

  const selectedDisplay = selectedModel
    ? (() => {
        const found = models.find((m) => m.id === selectedModel);
        return found ? formatModelName(found) : selectedModel;
      })()
    : 'Select a model';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!isConfigured}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed max-w-[280px]"
      >
        <span className="truncate">{selectedDisplay}</span>
        <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[360px] bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-zinc-800">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-zinc-800 rounded-md">
              <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search a model"
                className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-zinc-800 px-2 pt-1">
            {(['all', 'external'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-300'
                }`}
              >
                {tab === 'all' ? 'All' : 'External'}
              </button>
            ))}
          </div>

          {/* Model list */}
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-zinc-500 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading models...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-zinc-500 text-sm">
                {search ? 'No models match your search' : 'No models available'}
              </div>
            ) : (
              filtered.map((model) => {
                const isSelected = model.id === selectedModel;
                const displayName = formatModelName(model);
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onSelectModel(model.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-zinc-800 transition-colors text-left ${
                      isSelected ? 'text-zinc-100' : 'text-zinc-300'
                    }`}
                  >
                    <span className="flex-1 truncate">{displayName}</span>
                    <ExternalLink className="w-3 h-3 text-zinc-600 shrink-0" />
                    {isSelected && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
