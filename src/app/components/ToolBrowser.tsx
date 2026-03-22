import { Wrench, ChevronDown, ChevronRight, Hammer } from 'lucide-react';
import { useState } from 'react';
import type { KitWithTools } from '../types/simplemcp';

interface ToolBrowserProps {
  kitsWithTools: KitWithTools[];
  onToolSelect?: (tool: string, kitName: string) => void;
}

export function ToolBrowser({ kitsWithTools, onToolSelect }: ToolBrowserProps) {
  const [expandedKits, setExpandedKits] = useState<Set<string>>(new Set());

  const toggleKit = (kitName: string) => {
    setExpandedKits((prev) => {
      const next = new Set(prev);
      if (next.has(kitName)) {
        next.delete(kitName);
      } else {
        next.add(kitName);
      }
      return next;
    });
  };

  const totalTools = kitsWithTools.reduce((sum, kit) => sum + kit.tools.length, 0);

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-zinc-800">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 mb-2">
          <Wrench className="w-4 h-4 text-zinc-400" />
          <h2 className="font-semibold text-zinc-100">Tools</h2>
        </div>
        <p className="text-xs text-zinc-500">
          {totalTools} {totalTools === 1 ? 'tool' : 'tools'} available
        </p>
      </div>

      {/* Tool List */}
      <div className="flex-1 overflow-y-auto">
        {kitsWithTools.length === 0 ? (
          <div className="p-4 text-center text-zinc-500 text-sm">
            No enabled kits with tools
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {kitsWithTools.map((kit) => (
              <div key={kit.kit_name} className="rounded-lg overflow-hidden">
                {/* Kit Header */}
                <button
                  onClick={() => toggleKit(kit.kit_name)}
                  className="w-full p-2 flex items-center gap-2 hover:bg-zinc-800/50 transition-colors text-left"
                >
                  {expandedKits.has(kit.kit_name) ? (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-400" />
                  )}
                  <span className="text-sm font-medium text-zinc-300">
                    {kit.kit_name}
                  </span>
                  <span className="text-xs text-zinc-500 ml-auto">
                    {kit.tools.length}
                  </span>
                </button>

                {/* Tools */}
                {expandedKits.has(kit.kit_name) && (
                  <div className="pl-6 pr-2 pb-1 space-y-1">
                    {kit.tools.map((tool) => {
                      const requiredParams = tool.parameters.required || [];
                      const allParams = Object.keys(tool.parameters.properties || {});

                      return (
                        <button
                          key={tool.name}
                          onClick={() => onToolSelect?.(tool.name, kit.kit_name)}
                          className="w-full p-2 rounded-md bg-zinc-800/30 hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div className="flex items-start gap-2">
                            <Hammer className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-mono text-zinc-100 truncate">
                                {tool.name}
                              </h4>
                              <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">
                                {tool.description}
                              </p>
                              {allParams.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {allParams.map((param) => (
                                    <span
                                      key={param}
                                      className={`text-xs px-1.5 py-0.5 rounded ${
                                        requiredParams.includes(param)
                                          ? 'bg-blue-600/20 text-blue-300'
                                          : 'bg-zinc-700/50 text-zinc-400'
                                      }`}
                                    >
                                      {param}
                                      {requiredParams.includes(param) && '*'}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}