import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

export function PhotoViewer({
  photos,
  index,
  onIndex,
  onClose,
  legende,
}: {
  photos: string[]
  index: number
  onIndex: (i: number) => void
  onClose: () => void
  legende?: string
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const n = photos.length
  const prev = () => onIndex((index - 1 + n) % n)
  const next = () => onIndex((index + 1) % n)

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo du rapport"
      className="fixed inset-0 z-[4000] flex flex-col bg-[#0b1a29]/95 p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-3 text-white">
        <p className="num text-sm font-semibold">
          {legende ? `${legende} · ` : ''}
          {index + 1} / {n}
        </p>
        <button
          ref={closeRef}
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          aria-label="Fermer la photo"
        >
          <X size={22} />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={photos[index]} alt={`Photo ${index + 1} du rapport`} className="max-h-full max-w-full rounded-xl object-contain" />
        {n > 1 && (
          <>
            <button onClick={prev} className="absolute left-1 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Photo précédente">
              <ChevronLeft size={26} />
            </button>
            <button onClick={next} className="absolute right-1 grid h-12 w-12 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Photo suivante">
              <ChevronRight size={26} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/** Rangée de miniatures cliquables. */
export function Miniatures({ photos, onOpen, size = 64 }: { photos: string[]; onOpen: (i: number) => void; size?: number }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Photos jointes">
      {photos.map((src, i) => (
        <li key={i}>
          <button
            onClick={() => onOpen(i)}
            className="block overflow-hidden rounded-xl border border-line transition-transform hover:scale-[1.03]"
            style={{ width: size, height: size }}
            aria-label={`Agrandir la photo ${i + 1}`}
          >
            <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        </li>
      ))}
    </ul>
  )
}
