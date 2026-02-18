import { useState, useEffect } from 'react'
import { X, Sun, Moon, Bell, BellOff } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { useTheme } from '../../hooks/useTheme'
import { PromptLibrary } from '../shared/PromptLibrary'
import { UsageDashboard } from '../shared/UsageDashboard'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { IconButton } from '../ui/IconButton'
import { Input } from '../ui/Input'
import * as api from '../../services/api'
import { toast } from '../../stores/toastStore'

type Tab = 'general' | 'prompts' | 'usage'

export function SettingsDialog() {
  const setSettingsOpen = useUIStore((s) => s.setSettingsOpen)
  const settings = useSettingsStore((s) => s.settings)
  const updateSetting = useSettingsStore((s) => s.updateSetting)
  const loadModels = useSettingsStore((s) => s.loadModels)
  const models = useSettingsStore((s) => s.models)
  const { theme, setTheme } = useTheme()

  const [activeTab, setActiveTab] = useState<Tab>('general')
  const [apiKey, setApiKey] = useState('')
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [defaultModel, setDefaultModel] = useState('')
  const [temperature, setTemperature] = useState(1)
  const [desktopNotifications, setDesktopNotifications] = useState(false)
  const [dailyBudget, setDailyBudget] = useState('')

  useEffect(() => {
    if (settings.openrouter_api_key) {
      setApiKey(settings.openrouter_api_key as string)
    }
    if (settings.default_model) {
      setDefaultModel(settings.default_model as string)
    }
    if (settings.temperature != null) {
      setTemperature(settings.temperature as number)
    }
    if (settings.desktop_notifications != null) {
      setDesktopNotifications(settings.desktop_notifications as boolean)
    }
    if (settings.daily_budget != null && (settings.daily_budget as number) > 0) {
      setDailyBudget(String(settings.daily_budget))
    }
  }, [settings.openrouter_api_key, settings.default_model, settings.temperature, settings.desktop_notifications, settings.daily_budget])

  const handleTest = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const result = await api.testConnection(apiKey)
      setTestResult(result.valid)
      if (result.valid) {
        toast.success('Connection successful!')
      } else {
        toast.error('Connection failed — check your API key')
      }
    } catch {
      setTestResult(false)
      toast.error('Connection failed — check your API key')
    }
    setTesting(false)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateSetting('openrouter_api_key', apiKey)
      if (defaultModel) {
        await updateSetting('default_model', defaultModel)
      }
      await updateSetting('temperature', temperature)
      await updateSetting('desktop_notifications', desktopNotifications)
      const budgetNum = parseFloat(dailyBudget)
      await updateSetting('daily_budget', budgetNum > 0 ? budgetNum : null)
      await loadModels()
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    }
    setSaving(false)
    setSettingsOpen(false)
  }

  const TABS: Array<{ id: Tab; label: string }> = [
    { id: 'general', label: 'General' },
    { id: 'prompts', label: 'Prompts' },
    { id: 'usage', label: 'Usage' },
  ]

  return (
    <Modal open onClose={() => setSettingsOpen(false)} className="max-w-lg p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-fg-primary">Settings</h2>
        <IconButton
          onClick={() => setSettingsOpen(false)}
          aria-label="Close settings"
        >
          <X size={18} />
        </IconButton>
      </div>

      {/* Tab bar — underline style */}
      <div className="mb-4 flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-accent text-accent'
                : 'text-fg-muted hover:text-fg-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="space-y-4">
          {/* API Key */}
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              OpenRouter API Key
            </label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value)
                setTestResult(null)
              }}
              placeholder="sk-or-..."
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTest}
              disabled={!apiKey || testing}
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </Button>
            {testResult === true && (
              <span className="text-sm text-success">Connected!</span>
            )}
            {testResult === false && (
              <span className="text-sm text-destructive">Connection failed</span>
            )}
          </div>

          {/* Default Model */}
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              Default Model
            </label>
            <select
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-fg-primary transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Select a model...</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              Temperature: {temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="flex justify-between text-xs text-fg-muted">
              <span>Precise (0)</span>
              <span>Creative (2)</span>
            </div>
          </div>

          {/* Theme — explicit buttons */}
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              Theme
            </label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex-1"
              >
                <Sun size={14} className="mr-1.5" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex-1"
              >
                <Moon size={14} className="mr-1.5" />
                Dark
              </Button>
            </div>
          </div>

          {/* Desktop Notifications */}
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              Desktop Notifications
            </label>
            <button
              onClick={async () => {
                if (!desktopNotifications) {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
                    const perm = await Notification.requestPermission()
                    if (perm !== 'granted') {
                      toast.warning('Notification permission denied by browser')
                      return
                    }
                  }
                  if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
                    toast.warning('Notifications are blocked — enable them in browser settings')
                    return
                  }
                }
                setDesktopNotifications(!desktopNotifications)
              }}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors ${
                desktopNotifications
                  ? 'border-accent/30 bg-accent/5 text-fg-primary'
                  : 'border-border bg-surface text-fg-muted'
              }`}
            >
              <span className="flex items-center gap-2">
                {desktopNotifications ? <Bell size={14} /> : <BellOff size={14} />}
                {desktopNotifications ? 'Enabled' : 'Disabled'}
              </span>
              <span className="text-xs text-fg-muted">
                Notify when AI finishes in background tab
              </span>
            </button>
          </div>

          {/* Daily Budget */}
          <div>
            <label className="mb-1 block text-sm font-medium text-fg-secondary">
              Daily Budget (USD)
            </label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="No limit"
            />
            <p className="mt-1 text-xs text-fg-muted">
              Get warned when daily spending approaches this amount
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setSettingsOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'prompts' && (
        <div>
          <p className="mb-3 text-sm text-fg-muted">
            Manage system prompt templates for new conversations.
          </p>
          <PromptLibrary
            mode="manager"
            onSelect={() => {}}
          />
        </div>
      )}

      {activeTab === 'usage' && <UsageDashboard />}
    </Modal>
  )
}
