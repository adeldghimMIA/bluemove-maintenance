import { useCallback, useEffect, useRef, useState } from 'react'

/* Web Speech API : non typée dans lib.dom, on déclare le strict nécessaire. */
interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
}

function getCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition || w.webkitSpeechRecognition || null) as (new () => SpeechRecognitionLike) | null
}

export function useDictee(onText: (finalText: string) => void) {
  const [ecoute, setEcoute] = useState(false)
  const [interim, setInterim] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const rec = useRef<SpeechRecognitionLike | null>(null)
  const supporte = typeof window !== 'undefined' && !!getCtor()
  const onTextRef = useRef(onText)
  onTextRef.current = onText

  const stop = useCallback(() => {
    rec.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) return
    setErreur(null)
    const r = new Ctor()
    r.lang = 'fr-FR'
    r.continuous = true
    r.interimResults = true
    r.onresult = (e) => {
      let tmp = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) onTextRef.current(res[0].transcript.trim())
        else tmp += res[0].transcript
      }
      setInterim(tmp)
    }
    r.onerror = (e) => {
      setErreur(
        e.error === 'not-allowed'
          ? 'Accès au micro refusé. Autorise le micro dans le navigateur ou tape ton message.'
          : 'La dictée s’est interrompue. Réessaie ou tape ton message.',
      )
    }
    r.onend = () => {
      setEcoute(false)
      setInterim('')
    }
    rec.current = r
    r.start()
    setEcoute(true)
  }, [])

  useEffect(() => () => rec.current?.stop(), [])

  return { supporte, ecoute, interim, erreur, start, stop }
}
