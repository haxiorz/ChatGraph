import { useEffect, useRef, useCallback } from 'react'
import { SkipBack, SkipForward, Play, Pause, X, GitBranch } from 'lucide-react'
import { useUIStore } from '../../stores/uiStore'
import { useConversationStore } from '../../stores/conversationStore'

interface ReplayControlsProps {
  sortedNodeIds: string[]
}

export function ReplayControls({ sortedNodeIds }: ReplayControlsProps) {
  const replayState = useUIStore((s) => s.replayState)
  const setReplayIndex = useUIStore((s) => s.setReplayIndex)
  const setReplayPlaying = useUIStore((s) => s.setReplayPlaying)
  const exitReplay = useUIStore((s) => s.exitReplay)
  const setActiveNode = useConversationStore((s) => s.setActiveNode)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { replayIndex, maxIndex, isPlaying, playbackSpeed } = replayState

  // Auto-play interval
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        const current = useUIStore.getState().replayState
        if (current.replayIndex >= current.maxIndex) {
          setReplayPlaying(false)
        } else {
          setReplayIndex(current.replayIndex + 1)
        }
      }, 600 / playbackSpeed)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, playbackSpeed, setReplayIndex, setReplayPlaying])

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      setReplayPlaying(false)
    } else {
      // If at end, restart from beginning
      if (replayIndex >= maxIndex) {
        setReplayIndex(1)
      }
      setReplayPlaying(true)
    }
  }, [isPlaying, replayIndex, maxIndex, setReplayPlaying, setReplayIndex])

  const handleStepBack = useCallback(() => {
    setReplayPlaying(false)
    if (replayIndex > 1) setReplayIndex(replayIndex - 1)
  }, [replayIndex, setReplayIndex, setReplayPlaying])

  const handleStepForward = useCallback(() => {
    setReplayPlaying(false)
    if (replayIndex < maxIndex) setReplayIndex(replayIndex + 1)
  }, [replayIndex, maxIndex, setReplayIndex, setReplayPlaying])

  const handleForkHere = useCallback(() => {
    const nodeId = sortedNodeIds[replayIndex - 1]
    if (nodeId) setActiveNode(nodeId)
    exitReplay()
  }, [sortedNodeIds, replayIndex, setActiveNode, exitReplay])

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReplayPlaying(false)
      setReplayIndex(Number(e.target.value))
    },
    [setReplayIndex, setReplayPlaying],
  )

  // Keyboard shortcuts during replay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitReplay()
      } else if (e.key === ' ') {
        e.preventDefault()
        handleTogglePlay()
      } else if (e.key === 'ArrowLeft') {
        handleStepBack()
      } else if (e.key === 'ArrowRight') {
        handleStepForward()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [exitReplay, handleTogglePlay, handleStepBack, handleStepForward])

  return (
    <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-lg border border-border bg-surface/95 px-3 py-2 shadow-md backdrop-blur-sm">
      <button
        onClick={handleStepBack}
        disabled={replayIndex <= 1}
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg-primary disabled:opacity-30"
        title="Step back"
      >
        <SkipBack size={14} />
      </button>

      <button
        onClick={handleTogglePlay}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
      </button>

      <button
        onClick={handleStepForward}
        disabled={replayIndex >= maxIndex}
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-fg-primary disabled:opacity-30"
        title="Step forward"
      >
        <SkipForward size={14} />
      </button>

      <input
        type="range"
        min={1}
        max={maxIndex}
        value={replayIndex}
        onChange={handleSliderChange}
        className="mx-1 w-40 accent-accent"
      />

      <span className="min-w-[3.5rem] text-center text-xs font-medium text-fg-secondary">
        {replayIndex} / {maxIndex}
      </span>

      <div className="mx-1 h-5 w-px bg-border" />

      <button
        onClick={handleForkHere}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-fg-secondary transition-colors hover:bg-elevated hover:text-fg-primary"
        title="Fork conversation from this point"
      >
        <GitBranch size={12} />
        Fork
      </button>

      <button
        onClick={exitReplay}
        className="flex h-7 w-7 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-elevated hover:text-danger"
        title="Exit replay (Esc)"
      >
        <X size={14} />
      </button>
    </div>
  )
}
