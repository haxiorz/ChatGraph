import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import type { RoutingTierConfig } from '../../types/index'

export function SmartRouterConfig() {
  const smartRouterEnabled = useUIStore((s) => s.smartRouterEnabled)
  const toggleSmartRouter = useUIStore((s) => s.toggleSmartRouter)
  const routingTierConfig = useUIStore((s) => s.routingTierConfig)
  const setRoutingTierConfig = useUIStore((s) => s.setRoutingTierConfig)
  const models = useSettingsStore((s) => s.models)

  const handleModelChange = (tier: string, modelId: string) => {
    const updated = routingTierConfig.map((c) =>
      c.tier === tier ? { ...c, modelId } : c,
    )
    setRoutingTierConfig(updated as RoutingTierConfig[])
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-fg-primary">
          Smart Model Routing
        </label>
        <button
          onClick={toggleSmartRouter}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            smartRouterEnabled ? 'bg-accent' : 'bg-fg-muted/30'
          }`}
        >
          <div
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              smartRouterEnabled ? 'translate-x-5.5 left-0.5' : 'left-0.5'
            }`}
            style={{ transform: smartRouterEnabled ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </button>
      </div>
      <p className="mb-3 text-xs text-fg-muted">
        Automatically route prompts to the best model based on complexity.
      </p>

      {smartRouterEnabled && (
        <div className="space-y-2">
          {routingTierConfig.map((config) => (
            <div
              key={config.tier}
              className="flex items-center gap-3 rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2"
            >
              <div className="min-w-[80px]">
                <div className="text-xs font-medium text-fg-primary">{config.label}</div>
                <div className="text-[10px] text-fg-muted">{config.description}</div>
              </div>
              <select
                value={config.modelId}
                onChange={(e) => handleModelChange(config.tier, e.target.value)}
                className="flex-1 rounded-md border border-[var(--glass-border)] bg-[var(--glass-bg-elevated)] px-2 py-1 text-xs text-fg-primary"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.id}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
