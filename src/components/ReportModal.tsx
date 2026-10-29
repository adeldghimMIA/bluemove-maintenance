import { useEffect, useId, useRef, useState } from 'react'
import { Camera, CheckCircle2, Loader2, Mic, MicOff, TriangleAlert, X } from 'lucide-react'
import { CATEGORIES_PROBLEME, type CategorieProbleme, type Panne } from '../data/types'
import { titreParDefaut } from '../data/seed'
import { addRapport } from '../data/store'
import { compresserPhoto } from '../lib/photo'
import { useDictee } from '../lib/useDictee'
import { UrgenceBadge } from './Badges'

type Choix = 'repare' | 'probleme' | null
const MAX_PHOTOS = 3

export function ReportModal({ panne, onClose, onDone }: { panne: Panne; onClose: () => void; onDone: () => void }) {
  const [choix, setChoix] = useState<Choix>(null)
  const [titre, setTitre] = useState(titreParDefaut(panne))
  const [categorie, setCategorie] = useState<CategorieProbleme | null>(null)
  const [note, setNote] = useState('')
  const [photos, setPhotos] = useState<string[]>([])
  const [chargement, setChargement] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const titleId = useId()
  const errId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const dictee = useDictee((t) => setNote((n) => (n ? `${n} ${t}` : t)))

  useEffect(() => {
    dialogRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ajouterPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setChargement(true)
    try {
      const nouvelles = await Promise.all([...files].slice(0, MAX_PHOTOS - photos.length).map(compresserPhoto))
      setPhotos((p) => [...p, ...nouvelles].slice(0, MAX_PHOTOS))
    } catch {
      setErreur('Impossible de lire cette photo. Essaie avec une autre image.')
    } finally {
      setChargement(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const envoyer = () => {
    if (!choix) return setErreur('Choisis « Réparé » ou « Signaler un problème ».')
    if (!titre.trim()) return setErreur('Donne un titre à ton rapport.')
    if (choix === 'probleme' && !categorie) return setErreur('Choisis le type de problème.')
    if (choix === 'probleme' && note.trim().length < 5)
      return setErreur('Décris le problème (dictée ou texte) avant d’envoyer.')
    dictee.stop()
    const ok = addRapport({
      panneId: panne.id,
      technicienId: panne.technicienId,
      statut: choix,
      titre: titre.trim(),
      categorie: choix === 'probleme' ? categorie! : undefined,
      note: note.trim() || undefined,
      photos: photos.length ? photos : undefined,
    })
    if (!ok) return setErreur('Le stockage du téléphone est plein : retire une photo ou réinitialise la démo, puis réessaie.')
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
        className="anim-sheet flex max-h-[94dvh] w-full max-w-lg flex-col rounded-t-3xl bg-white shadow-pop sm:rounded-3xl"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line sm:hidden" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 px-5 pt-3 sm:px-6 sm:pt-6">
          <div className="min-w-0">
            <p className="eyebrow">Rapport d’intervention</p>
            <h2 id={titleId} className="mt-1 text-xl font-bold sm:text-2xl">
              {panne.scooterId} · {panne.type}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted">
              <UrgenceBadge u={panne.urgence} compact />
              {panne.quartier}, {panne.cp} Paris
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted hover:bg-bg"
            aria-label="Fermer le rapport"
          >
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pt-4 pb-4 sm:px-6">
          <fieldset className="grid gap-3" aria-describedby={erreur ? errId : undefined}>
            <legend className="sr-only">Résultat de l’intervention</legend>
            {option('repare', 'Réparé — aucun problème', 'Le scooter est remis en service.', CheckCircle2, '#43aa8b')}
            {option('probleme', 'Signaler un problème', 'Pièce manquante, panne non résolue, scooter à rapatrier…', TriangleAlert, '#e63946')}
          </fieldset>

          {choix && (
            <div className="anim-sheet mt-5 grid gap-5">
              <div>
                <label htmlFor="titre" className="block text-sm font-semibold text-ink-2">
                  Titre du rapport
                </label>
                <input
                  id="titre"
                  value={titre}
                  onChange={(e) => setTitre(e.target.value)}
                  maxLength={80}
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-white px-3 text-base"
                />
                <p className="mt-1 text-xs text-muted">Une référence unique (RAP-…) est ajoutée automatiquement.</p>
              </div>

              {choix === 'probleme' && (
                <fieldset>
                  <legend className="text-sm font-semibold text-ink-2">Type de problème</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {CATEGORIES_PROBLEME.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={categorie === c}
                        onClick={() => {
                          setCategorie(c)
                          setErreur(null)
                        }}
                        className={`min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors ${
                          categorie === c ? 'border-critical bg-[#fdecee] text-critical' : 'border-line bg-white text-ink-2 hover:bg-bg'
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}

              <div className={choix === 'probleme' ? 'rounded-2xl border border-dashed border-[#b8d0ee] bg-soft p-4' : ''}>
                <div className="flex items-center gap-3">
                  {dictee.supporte && (
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
                  )}
                  <div className="text-sm">
                    <p className="font-semibold">{dictee.ecoute ? 'Je t’écoute… parle normalement' : choix === 'probleme' ? 'Dictée vocale' : 'Commentaire (facultatif)'}</p>
                    <p className="text-muted">
                      {dictee.supporte
                        ? dictee.ecoute
                          ? 'Touche à nouveau le micro pour terminer.'
                          : 'Touche le micro et décris ce que tu as fait ou constaté.'
                        : 'Dictée non disponible sur ce navigateur (utilise Chrome ou Safari). Tape ton message.'}
                    </p>
                  </div>
                </div>
                <label htmlFor="note" className="mt-4 block text-sm font-semibold text-ink-2">
                  {choix === 'probleme' ? 'Description du problème' : 'Commentaire'}
                </label>
                <textarea
                  id="note"
                  value={note + (dictee.interim ? (note ? ' ' : '') + dictee.interim : '')}
                  onChange={(e) => {
                    setNote(e.target.value)
                    setErreur(null)
                  }}
                  rows={choix === 'probleme' ? 4 : 2}
                  className="mt-1.5 w-full rounded-xl border border-line bg-white p-3 text-base"
                  placeholder={choix === 'probleme' ? 'Ex. : pas la bonne pièce dans le camion, à repasser demain.' : 'Ex. : plaquettes changées.'}
                />
                {dictee.erreur && <p className="mt-2 text-sm text-critical">{dictee.erreur}</p>}
              </div>

              <div>
                <p className="text-sm font-semibold text-ink-2">Photos</p>
                <p className="text-xs text-muted">
                  {choix === 'probleme' ? 'Conseillé : une photo de la panne aide l’atelier.' : 'Facultatif.'} {MAX_PHOTOS} maximum.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {photos.map((src, i) => (
                    <div key={i} className="relative h-20 w-20 overflow-hidden rounded-xl border border-line">
                      <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotos((p) => p.filter((_, k) => k !== i))}
                        className="absolute top-1 right-1 grid h-7 w-7 place-items-center rounded-full bg-ink/75 text-white"
                        aria-label={`Retirer la photo ${i + 1}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {photos.length < MAX_PHOTOS && (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={chargement}
                      className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-blue-2/60 text-xs font-semibold text-blue hover:bg-blue-50"
                    >
                      {chargement ? <Loader2 size={20} className="animate-spin" aria-hidden="true" /> : <Camera size={20} aria-hidden="true" />}
                      {chargement ? 'Ajout…' : 'Photo'}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  className="sr-only"
                  tabIndex={-1}
                  aria-label="Prendre ou choisir une photo"
                  onChange={(e) => ajouterPhotos(e.target.files)}
                />
              </div>
            </div>
          )}

          {erreur && (
            <p id={errId} role="alert" className="mt-4 text-sm font-semibold text-critical">
              {erreur}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-line px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:px-6 sm:pb-6">
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
