import { useState } from 'react';
import { X, Package, Wrench, RefreshCw, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import type { Kit, KitWithTools } from '../types/simplemcp';
import type { LLMConfig } from '../services/llm';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  kits: Kit[];
  kitsWithTools: KitWithTools[];
  serverUrl: string;
  llmConfig: LLMConfig;
  disabledTools: Set<string>;
  onServerUrlChange: (url: string) => void;
  onLLMConfigChange: (config: Partial<LLMConfig>) => void;
  onRefresh: () => void;
  onToggleDisabledTool: (toolKey: string) => void;
  onEnableAllToolsInKit: (kitName: string) => void;
  onToggleKit: (kitName: string, enabled: boolean) => void;
}

export function SettingsDialog({
  isOpen,
  onClose,
  kits,
  kitsWithTools,
  serverUrl,
  llmConfig,
  disabledTools,
  onServerUrlChange,
  onLLMConfigChange,
  onRefresh,
  onToggleDisabledTool,
  onEnableAllToolsInKit,
  onToggleKit,
}: SettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<'server' | 'llm' | 'kits'>('server');
  const [urlInput, setUrlInput] = useState(serverUrl);
  const [llmUrl, setLlmUrl] = useState(llmConfig.baseUrl);
  const [llmKey, setLlmKey] = useState(llmConfig.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [collapsedKits, setCollapsedKits] = useState<Set<string>>(() => {
    // All kits collapsed by default — populated when kits load
    return new Set();
  });

  // Collapse all kits by default whenever the kits list changes
  const allKitNames = kits.map((k) => k.kit_name).join(',');
  const [initializedKits, setInitializedKits] = useState('');
  if (allKitNames !== initializedKits && allKitNames !== '') {
    setInitializedKits(allKitNames);
    setCollapsedKits(new Set(kits.map((k) => k.kit_name)));
  }

  const toggleKitCollapsed = (kitName: string) => {
    setCollapsedKits((prev) => {
      const next = new Set(prev);
      if (next.has(kitName)) next.delete(kitName);
      else next.add(kitName);
      return next;
    });
  };

  const toggleTool = (toolKey: string) => {
    onToggleDisabledTool(toolKey);
  };

  const enableAllInKit = (kit: KitWithTools) => {
    onEnableAllToolsInKit(kit.kit_name);
  };

  if (!isOpen) return null;

  const handleSaveServer = () => onServerUrlChange(urlInput);

  const handleSaveLLM = () => {
    const urlChanged = llmUrl !== llmConfig.baseUrl;
    onLLMConfigChange({
      baseUrl: llmUrl,
      apiKey: llmKey,
      // Clear selected model when URL changes so stale models from previous endpoint don't persist
      ...(urlChanged ? { model: '' } : {}),
    });
  };

  const tabs = [
    { id: 'server', label: 'SimpleMCP' },
    { id: 'llm', label: 'LLM' },
    { id: 'kits', label: `Kits (${kits.length})` },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-md transition-colors">
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">

          {/* SimpleMCP Server */}
          {activeTab === 'server' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  SimpleMCP Server URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="http://localhost:8000"
                  />
                  <button
                    onClick={handleSaveServer}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  The base URL of your SimpleMCP V2 server
                </p>
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-sm font-medium text-zinc-300 mb-2">Server Info</h3>
                <div className="bg-zinc-800/50 rounded-md p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Current URL:</span>
                    <span className="text-zinc-100 font-mono">{serverUrl}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Protocol:</span>
                    <span className="text-zinc-100">SimpleMCP V2</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LLM Endpoint */}
          {activeTab === 'llm' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={llmUrl}
                  onChange={(e) => setLlmUrl(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://openrouter.ai/api/v1"
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Any OpenAI-compatible endpoint — OpenRouter, Ollama, LM Studio, etc.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  API Key
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={llmKey}
                      onChange={(e) => setLlmKey(e.target.value)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 pr-10 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sk-..."
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                    >
                      {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    onClick={handleSaveLLM}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                  >
                    Save
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                  Stored in memory only — not persisted to disk
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-800">
                <div className="bg-zinc-800/50 rounded-md p-3 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Status:</span>
                    <span className={llmConfig.baseUrl && llmConfig.apiKey ? 'text-green-400' : 'text-zinc-500'}>
                      {llmConfig.baseUrl && llmConfig.apiKey ? 'Configured' : 'Not configured'}
                    </span>
                  </div>
                  {llmConfig.model && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Selected model:</span>
                      <span className="text-zinc-100 font-mono text-xs truncate max-w-[200px]">{llmConfig.model}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Kits */}
          {activeTab === 'kits' && (
            <div className="space-y-2">
              {kits.length === 0 ? (
                <div className="text-center text-zinc-500 py-8">
                  No kits available. Check your server connection.
                </div>
              ) : (
                kits.map((kit) => {
                  const kitWithTools = kitsWithTools.find((k) => k.kit_name === kit.kit_name);
                  const tools = kitWithTools?.tools ?? [];
                  const isCollapsed = collapsedKits.has(kit.kit_name);
                  const hasDisabled = tools.some((t) => disabledTools.has(`${kit.kit_name}::${t.name}`));

                  return (
                    <div key={kit.kit_name} className="bg-zinc-800/50 border border-zinc-700 rounded-lg overflow-hidden">
                      {/* Kit header */}
                      <div className="flex items-center gap-2 p-4">
                        <button
                          onClick={() => toggleKitCollapsed(kit.kit_name)}
                          className="flex items-center gap-2 flex-1 text-left group min-w-0"
                        >
                          {isCollapsed
                            ? <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors flex-shrink-0" />
                            : <ChevronDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors flex-shrink-0" />
                          }
                          <Package className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          <span className="font-medium text-zinc-100 group-hover:text-white transition-colors truncate">
                            {kit.kit_name}
                          </span>
                          <span className="text-xs text-zinc-500 flex-shrink-0">
                            ({tools.length} {tools.length === 1 ? 'tool' : 'tools'})
                          </span>
                        </button>
                        {hasDisabled && (
                          <button
                            onClick={() => enableAllInKit(kitWithTools!)}
                            className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 hover:bg-blue-600/40 transition-colors whitespace-nowrap flex-shrink-0"
                          >
                            Enable All
                          </button>
                        )}
                        <span className="text-xs text-zinc-600 font-mono flex-shrink-0">{kit.filename}</span>
                        {/* Kit enable/disable toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleKit(kit.kit_name, !kit.enabled);
                          }}
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 transition-colors cursor-pointer ${
                            kit.enabled
                              ? 'bg-green-600/20 text-green-400 hover:bg-red-600/20 hover:text-red-400'
                              : 'bg-zinc-700/50 text-zinc-400 hover:bg-green-600/20 hover:text-green-400'
                          }`}
                          title={kit.enabled ? 'Click to disable kit' : 'Click to enable kit'}
                        >
                          {kit.enabled ? 'Enabled' : 'Disabled'}
                        </button>
                      </div>

                      {/* Description */}
                      {kit.kit_description && (
                        <div className="px-4 pb-2 -mt-2">
                          <p className="text-sm text-zinc-400 pl-10">{kit.kit_description}</p>
                        </div>
                      )}

                      {/* Collapsible tool list */}
                      {!isCollapsed && tools.length > 0 && (
                        <div className="border-t border-zinc-700/50 px-4 py-3 space-y-1">
                          {tools.map((tool) => {
                            const toolKey = `${kit.kit_name}::${tool.name}`;
                            const isEnabled = !disabledTools.has(toolKey);
                            return (
                              <div
                                key={tool.name}
                                className={`bg-zinc-800/30 border rounded-md p-3 transition-opacity ${
                                  isEnabled ? 'border-zinc-700/50 opacity-100' : 'border-zinc-800/50 opacity-40'
                                }`}
                              >
                                <div className="flex items-start gap-2">
                                  <Wrench className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                      <h4 className="text-sm font-mono text-zinc-100">{tool.name}</h4>
                                      <button
                                        onClick={() => toggleTool(toolKey)}
                                        className="relative flex-shrink-0"
                                        title={isEnabled ? 'Disable tool' : 'Enable tool'}
                                      >
                                        <div className={`w-8 h-4 rounded-full transition-colors ${isEnabled ? 'bg-blue-600' : 'bg-zinc-700'}`}>
                                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                        </div>
                                      </button>
                                    </div>
                                    <p className="text-xs text-zinc-400 mt-0.5">{tool.description}</p>
                                    {Object.keys(tool.parameters.properties || {}).length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1.5">
                                        {Object.entries(tool.parameters.properties || {}).map(([param, schema]) => (
                                          <span
                                            key={param}
                                            className={`text-xs px-1.5 py-0.5 rounded ${
                                              tool.parameters.required?.includes(param)
                                                ? 'bg-blue-600/20 text-blue-300'
                                                : 'bg-zinc-700/50 text-zinc-400'
                                            }`}
                                          >
                                            {param}{tool.parameters.required?.includes(param) && '*'}: {(schema as any).type}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {!isCollapsed && kit.enabled && tools.length === 0 && (
                        <div className="border-t border-zinc-700/50 px-4 py-3 text-xs text-zinc-500">
                          No tools loaded yet — try refreshing.
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-zinc-800">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
