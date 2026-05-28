import { useRef, useState } from 'react'
import { parseNutritionLabel, type ParsedNutrition } from '../utils/parseNutritionLabel'

interface Props {
  onScan: (data: ParsedNutrition) => void
}

type ScanState = 'idle' | 'scanning' | 'done' | 'error'

export function NutritionScanner({ onScan }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [scanState, setScanState] = useState<ScanState>('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedNutrition | null>(null)
  const [progress, setProgress] = useState(0)

  async function handleFile(file: File) {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setScanState('scanning')
    setProgress(0)
    setParsed(null)

    try {
      const { createWorker } = await import('tesseract.js')
      const worker = await createWorker('eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100))
          }
        },
      })
      const { data: { text } } = await worker.recognize(file)
      await worker.terminate()

      const result = parseNutritionLabel(text)
      const hasAny = Object.values(result).some(v => v != null)
      if (hasAny) onScan(result)
      setParsed(result)
      setScanState('done')
    } catch {
      setScanState('error')
    }
  }

  function reset() {
    setScanState('idle')
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setParsed(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const hasAnyValue = parsed && Object.values(parsed).some(v => v != null)

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
        }}
      />

      {scanState === 'idle' && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border border-dashed border-gray-300 rounded-lg py-2.5 text-sm text-gray-500 hover:border-brand-600 hover:text-brand-600 flex items-center justify-center gap-2 transition-colors"
        >
          <CameraIcon />
          Scan nutrition label
        </button>
      )}

      {scanState === 'scanning' && (
        <div className="border border-gray-200 rounded-lg p-4 space-y-3">
          {previewUrl && (
            <img src={previewUrl} alt="nutrition label" className="max-h-28 object-contain mx-auto rounded" />
          )}
          <div className="text-sm text-gray-500 text-center">Scanning... {progress}%</div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-600 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {scanState === 'done' && (
        <div className={`border rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${hasAnyValue ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
          <div className="flex items-center gap-2 min-w-0">
            {hasAnyValue ? (
              <>
                <CheckIcon />
                <span className="text-xs text-green-700 truncate">Nutrition values applied</span>
              </>
            ) : (
              <span className="text-xs text-gray-500">No values found — try a clearer photo.</span>
            )}
          </div>
          <button
            type="button"
            onClick={reset}
            className="text-xs text-gray-500 hover:text-gray-700 shrink-0 underline"
          >
            Rescan
          </button>
        </div>
      )}

      {scanState === 'error' && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-600 flex items-center justify-between">
          <span>Scan failed.</span>
          <button type="button" onClick={reset} className="underline text-xs">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )
}
