import { useEffect } from 'react'
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
    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [definitionId, onClose])

  if (!definitionId || !art) return null

  return (
    <div className="card-zoom-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="card-zoom-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${definition?.name ?? definitionId} full card view`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="card-zoom-close" onClick={onClose} aria-label="Close full card view">×</button>
        <div className="card-zoom-kicker">FULL CARD VIEW</div>
        <img src={art.image} alt={definition?.name ?? definitionId} draggable={false} />
        <div className="card-zoom-caption">
          <strong>{definition?.name ?? definitionId}</strong>
          <span>{definitionId} · Click outside or press Esc to close</span>
        </div>
      </section>
    </div>
  )
}
