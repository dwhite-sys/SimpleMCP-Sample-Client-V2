import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Package } from 'lucide-react';
import type { Kit } from '../types/simplemcp';

interface KitToggleMenuProps {
  kits: Kit[];
  onToggleKit: (kitName: string, enabled: boolean) => void;
}

export function KitToggleMenu({ kits, onToggleKit }: KitToggleMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const enabledCount = kits.filter((k) => k.enabled).length;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-md text-sm text-zinc-300 transition-colors"
      >
        <Package className="w-4 h-4" />
        <span>Kits</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="p-2 border-b border-zinc-800">
            <p className="text-xs text-zinc-500">
              {enabledCount} of {kits.length} kits enabled
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {kits.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">No kits available</div>
            ) : (
              <div className="p-1">
                {kits.map((kit) => (
                  <div
                    key={kit.kit_name}
                    className="flex items-center justify-between p-2 hover:bg-zinc-800/50 rounded-md group"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Package className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 truncate">{kit.kit_name}</p>
                        {kit.description && (
                          <p className="text-xs text-zinc-500 truncate">{kit.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onToggleKit(kit.kit_name, !kit.enabled)}
                      className="relative ml-2 flex-shrink-0"
                    >
                      <div
                        className={`w-10 h-5 rounded-full transition-colors ${
                          kit.enabled ? 'bg-blue-600' : 'bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            kit.enabled ? 'translate-x-5' : 'translate-x-0.5'
                          }`}
                        />
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
