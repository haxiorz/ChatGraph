import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from './uiStore'

beforeEach(() => {
  useUIStore.setState({
    chatPanelWidth: 50,
    streamState: { status: 'idle' },
    selectedModel: 'openai/gpt-4o-mini',
    abortController: null,
    settingsOpen: false,
    shortcutsHelpOpen: false,
    searchOpen: false,
    compareState: {
      isComparing: false,
      branchPointId: null,
      leftBranchId: null,
      rightBranchId: null,
    },
  })
})

describe('uiStore', () => {
  it('has correct initial state', () => {
    const state = useUIStore.getState()
    expect(state.chatPanelWidth).toBe(50)
    expect(state.streamState).toEqual({ status: 'idle' })
    expect(state.selectedModel).toBe('openai/gpt-4o-mini')
  })

  describe('stream state transitions', () => {
    it('transitions to streaming', () => {
      useUIStore.getState().setStreamState({ status: 'streaming', content: 'Hello' })
      expect(useUIStore.getState().streamState).toEqual({ status: 'streaming', content: 'Hello' })
    })

    it('transitions to error', () => {
      useUIStore.getState().setStreamState({ status: 'error', error: 'Failed' })
      expect(useUIStore.getState().streamState).toEqual({ status: 'error', error: 'Failed' })
    })

    it('transitions back to idle', () => {
      useUIStore.getState().setStreamState({ status: 'streaming', content: '' })
      useUIStore.getState().setStreamState({ status: 'idle' })
      expect(useUIStore.getState().streamState).toEqual({ status: 'idle' })
    })
  })

  describe('panel width', () => {
    it('sets chat panel width', () => {
      useUIStore.getState().setChatPanelWidth(70)
      expect(useUIStore.getState().chatPanelWidth).toBe(70)
    })
  })

  describe('compare state', () => {
    it('sets compare state', () => {
      useUIStore.getState().setCompareState({
        isComparing: true,
        branchPointId: 'bp1',
        leftBranchId: 'left',
        rightBranchId: 'right',
      })
      const state = useUIStore.getState().compareState
      expect(state.isComparing).toBe(true)
      expect(state.branchPointId).toBe('bp1')
    })

    it('resets compare state', () => {
      useUIStore.getState().setCompareState({
        isComparing: true,
        branchPointId: 'bp1',
        leftBranchId: 'left',
        rightBranchId: 'right',
      })
      useUIStore.getState().resetCompareState()
      expect(useUIStore.getState().compareState.isComparing).toBe(false)
    })
  })
})
