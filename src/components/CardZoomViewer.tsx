import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cardById } from '../data/series1Cards'
import { useGame } from '../game/GameContext'

interface CardZoomViewerProps {
  definitionId: string | null
  onClose: () => void
}

export function CardZoomViewer({ definitionId, onClose }: CardZoomViewerProps) {
  const { definitions } = useGame()
  const definition = definitionId ? definitions[definitionId] : undefined
  const art = definitionId ? cardById[definitionId] : undefined

  useEffect(() => {
    if (!definitionId) return

    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyTouchAction = document.body.style.touchAction

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.touchAction = previousBodyTouchAction
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [definitionId, onClose])

  if (!definitionId || !art || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="card-zoom-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${definition?.name ?? definitionId} full card view`}
      onMouseDown={onClose}
    >
      <button
        type="button"
        className="card-zoom-card-button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onClose}
        aria-label={`Close ${definition?.name ?? definitionId} full card view`}
      >
        <img className="card-zoom-card" src={art.image} alt={definition?.name ?? definitionId} draggable={false} />
      </button>
    </div>,
    document.body,
  )
}
