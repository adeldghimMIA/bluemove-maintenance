import { useEffect, useId, useRef, useState } from 'react'
import { CheckCircle2, Mic, MicOff, TriangleAlert, X } from 'lucide-react'
import type { Panne } from '../data/types'
import { addRapport } from '../data/store'
import { useDictee } from '../lib/useDictee'
import { UrgenceBadge } from './Badges'

type Choix = 'repare' | 'probleme' | null

export function ReportModal({ panne, onClose, onDone }: { panne: Panne; onClose: () => void; onDone: () => void }) {
  const [choix, setChoix] = useState<Choix>(null)
  const [note, setNote] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const titleId = useId()
  const errId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const dictee = useDictee((t) => setNote((n) => (n ? `${n} ${t}` : t)))

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const envoyer = () => {
    if (!choix) return setErreur('Choisis « Réparé » ou « Signaler un problème ».')
    if (choix === 'probleme' && note.trim().length < 5)
      return setErreur('Décris le problème (dictée ou texte) avant d’envoyer.')
    dictee.stop()
    addRapport({
      panneId: panne.id,
      technicienId: panne.technicienId,
      statut: choix,
      note: choix === 'probleme' ? note.trim() : undefined,
    })
    onDone()
  }

  const option = (value: Exclude<Choix, null>, label: string, hint: string, Icon: typeof CheckCircle2, color: string) => {
    const active = choix === value
    return (
      <label
        className={`flex min-h-16 cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
          active ? 'bg-soft' : 'border-line bg-white hover:border-blue-2/50'
        }`}
        style={active ? { borderColor: color } : undefined}
      >
        <input
          type="radio"
          name="choix"
          value={value}
          checked={active}
          onChange={() => {
            setChoix(value)
            setErreur(null)
          }}
          className="mt-1 h-5 w-5 accent-blue"
        />
        <span className="flex-1">
          <span className="flex items-center gap-2 font-semibold">
            <Icon size={18} style={{ color }} aria-hidden="true" />
            {label}
          </span>
          <span className="mt-0.5 block text-sm text-muted">{hint}</span>
        </span>
      </label>
    )
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-end justify-center bg-ink/40 sm:items-center" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="anim-sheet max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 pb-[max(20px,env(safe-area-inset-bottom))] shadow-pop sm:rounded-3xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Rapport d’intervention</p>
            <h2 id={titleId} className="mt-1 text-2xl font-bold">
              {panne.scooterId} · {panne.type}
            </h2>
            <p className="mt-1 text-sm text-muted">
              {panne.quartier}, {panne.cp} Paris
            </p>
          </div>
          <button
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-bg"
            aria-label="Fermer le rapport"
          >
            <X size={22} />
          </button>
        </div>
        <div className="mt-3">
          <UrgenceBadge u={panne.urgence} />
        </div>

        <fieldset className="mt-5 grid gap-3" aria-describedby={erreur ? errId : undefined}>
          <legend className="sr-only">Résultat de l’intervention</legend>
          {option('repare', 'Réparé — aucun problème', 'Le scooter est remis en service.', CheckCircle2, '#43aa8b')}
          {option('probleme', 'Signaler un problème', 'Pièce manquante, panne non résolue, scooter à rapatrier…', TriangleAlert, '#e63946')}
        </fieldset>

        {choix === 'probleme' && (
          <div className="anim-sheet mt-4 rounded-2xl border border-dashed border-[#b8d0ee] bg-soft p-4">
            <div className="flex items-center gap-3">
              {dictee.supporte ? (
                <button
                  type="button"
                  onClick={dictee.ecoute ? dictee.stop : dictee.start}
                  aria-pressed={dictee.ecoute}
                  className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-white transition-colors ${
                    dictee.ecoute ? 'mic-live bg-critical' : 'bg-blue hover:bg-blue-2'
                  }`}
                  aria-label={dictee.ecoute ? 'Arrêter la dictée' : 'Démarrer la dictée vocale'}
                >
                  {dictee.ecoute ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              ) : null}
              <div className="text-sm">
                <p className="font-semibold">{dictee.ecoute ? 'Je t’écoute… parle normalement' : 'Dictée vocale'}</p>
                <p className="text-muted">
                  {dictee.supporte
                    ? dictee.ecoute
                      ? 'Touche à nouveau le micro pour terminer.'
                      : 'Touche le micro et décris le problème rencontré.'
                    : 'Dictée non disponible sur ce navigateur (utilise Chrome ou Safari). Tape ton message.'}
                </p>
              </div>
            </div>
            <label htmlFor="note" className="mt-4 block text-sm font-semibold text-ink-2">
              Description du problème
            </label>
            <textarea
              id="note"
              value={note + (dictee.interim ? (note ? ' ' : '') + dictee.interim : '')}
              onChange={(e) => {
                setNote(e.target.value)
                setErreur(null)
              }}
              rows={4}
              className="mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-base"
              placeholder="Ex. : pas la bonne pièce dans le camion, à repasser demain."
            />
            {dictee.erreur && <p className="mt-2 text-sm text-critical">{dictee.erreur}</p>}
          </div>
        )}

        {erreur && (
          <p id={errId} role="alert" className="mt-3 text-sm font-semibold text-critical">
            {erreur}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="min-h-12 flex-1 rounded-xl border border-line font-semibold text-ink-2 hover:bg-bg">
            Annuler
          </button>
          <button onClick={envoyer} className="min-h-12 flex-[2] rounded-xl bg-blue font-semibold text-white hover:bg-[#1257a8]">
            Envoyer le rapport
          </button>
        </div>
      </div>
    </div>
  )
}
