import { Activity, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { useState } from 'react';
import { SettingsDialog } from './SettingsDialog';
import { ModelSelector } from './ModelSelector';
import type { Kit, KitWithTools } from '../types/simplemcp';
import type { LLMConfig } from '../services/llm';

interface TopBarProps {
  connected: boolean;
  serverUrl: string;
  kits: Kit[];
  kitsWithTools: KitWithTools[];
  llmConfig: LLMConfig;
  selectedModel: string;
  disabledTools: Set<string>;
  onServerUrlChange: (url: string) => void;
  onLLMConfigChange: (config: Partial<LLMConfig>) => void;
  onSelectModel: (modelId: string) => void;
  onTestConnection: () => Promise<boolean>;
  onRefresh: () => void;
  onToggleDisabledTool: (toolKey: string) => void;
  onEnableAllToolsInKit: (kitName: string) => void;
}

export function TopBar({
  connected,
  serverUrl,
  kits,
  kitsWithTools,
  llmConfig,
  selectedModel,
  disabledTools,
  onServerUrlChange,
  onLLMConfigChange,
  onSelectModel,
  onTestConnection,
  onRefresh,
  onToggleDisabledTool,
  onEnableAllToolsInKit,
}: TopBarProps) {
  const [showSettings, setShowSettings] = useState(false);
  const isLLMConfigured = !!(llmConfig.baseUrl && llmConfig.apiKey);

  return (
    <>
      <div className="h-14 bg-zinc-900 border-b border-zinc-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-blue-500" />
          <h1 className="text-lg font-semibold text-zinc-100">SimpleMCP Client</h1>
        </div>

        {/* Model selector — centre of topbar */}
        <div className="flex-1 flex justify-center">
          <ModelSelector
            selectedModel={selectedModel}
            onSelectModel={onSelectModel}
            isConfigured={isLLMConfigured}
          />
        </div>

        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm text-green-400">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">Disconnected</span>
              </>
            )}
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-zinc-800 rounded-md transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      </div>

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        kits={kits}
        kitsWithTools={kitsWithTools}
        serverUrl={serverUrl}
        llmConfig={llmConfig}
        disabledTools={disabledTools}
        onServerUrlChange={onServerUrlChange}
        onLLMConfigChange={onLLMConfigChange}
        onRefresh={onRefresh}
        onToggleDisabledTool={onToggleDisabledTool}
        onEnableAllToolsInKit={onEnableAllToolsInKit}
      />
    </>
  );
}
