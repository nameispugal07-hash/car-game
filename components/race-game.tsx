'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, ChevronRight, Flag, HelpCircle, Keyboard, Pause, Play, RotateCcw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { emptyInputs, formatTime, newRace, stepRace, WORLD, type Inputs, type RaceState } from '@/lib/race-engine'
import { drawCar, drawCircuit, type Palette } from '@/lib/race-renderer'

type Phase = 'ready' | 'countdown' | 'racing' | 'paused'
const BEST_KEY = 'apex-circuit-best-v1'
const keyMap: Record<string, keyof Inputs> = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }

function Timing({ label, value, accent = false, icon }: { label: string; value: string; accent?: boolean; icon?: ReactNode }) {
  return <div className="flex flex-col gap-1"><span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[.14em] text-muted-foreground">{icon}{label}</span><span className={`font-mono text-xl font-medium tabular-nums tracking-tight md:text-2xl ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span></div>
}

function TouchControl({ action, children, inputs, label }: { action: keyof Inputs; children: ReactNode; inputs: React.RefObject<Inputs>; label: string }) {
  return <button aria-label={label} className="touch-key flex h-14 min-w-14 items-center justify-center rounded-lg border border-border bg-secondary px-4 text-foreground" onPointerDown={e => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); inputs.current[action] = true }} onPointerUp={() => { inputs.current[action] = false }} onPointerCancel={() => { inputs.current[action] = false }} onLostPointerCapture={() => { inputs.current[action] = false }}>{children}</button>
}

export function RaceGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const surfaceRef = useRef<HTMLDivElement>(null)
  const raceRef = useRef<RaceState>(newRace())
  const inputRef = useRef<Inputs>(emptyInputs())
  const phaseRef = useRef<Phase>('ready')
  const priorPhaseRef = useRef<Phase>('racing')
  const countdownRef = useRef(3)
  const [phase, setPhase] = useState<Phase>('ready')
  const [hud, setHud] = useState<RaceState>(newRace())
  const [countdown, setCountdown] = useState(3)
  const [help, setHelp] = useState(false)
  const [notice, setNotice] = useState('')
  const [storageAvailable, setStorageAvailable] = useState(true)

  const changePhase = useCallback((next: Phase) => { phaseRef.current = next; setPhase(next) }, [])
  const start = useCallback(() => {
    raceRef.current = newRace(raceRef.current.best)
    setHud({ ...raceRef.current }); inputRef.current = emptyInputs()
    countdownRef.current = 3; setCountdown(3); setNotice(''); changePhase('countdown')
    surfaceRef.current?.focus({ preventScroll: true })
  }, [changePhase])
  const togglePause = useCallback(() => {
    if (phaseRef.current === 'paused') changePhase(priorPhaseRef.current)
    else if (phaseRef.current === 'racing' || phaseRef.current === 'countdown') {
      priorPhaseRef.current = phaseRef.current; changePhase('paused')
    }
    inputRef.current = emptyInputs()
    surfaceRef.current?.focus({ preventScroll: true })
  }, [changePhase])

  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem(BEST_KEY))
      if (Number.isFinite(saved) && saved > 3 && saved < 86400) { raceRef.current.best = saved; setHud({ ...raceRef.current }) }
    } catch { setStorageAvailable(false) }
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const css = getComputedStyle(document.documentElement)
    const colors: Palette = { background: css.getPropertyValue('--background').trim(), card: css.getPropertyValue('--card').trim(), foreground: css.getPropertyValue('--foreground').trim(), primary: css.getPropertyValue('--primary').trim(), green: css.getPropertyValue('--track').trim() }
    const background = document.createElement('canvas')
    const bgCtx = background.getContext('2d')!
    let scale = 1
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(canvas.clientWidth * dpr)
      canvas.height = Math.round(canvas.clientHeight * dpr)
      scale = canvas.width / WORLD.width
      background.width = canvas.width; background.height = canvas.height
      bgCtx.setTransform(scale, 0, 0, scale, 0, 0)
      drawCircuit(bgCtx, colors)
    }
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize()
    const pauseOnBlur = () => {
      inputRef.current = emptyInputs()
      if (phaseRef.current === 'racing' || phaseRef.current === 'countdown') { priorPhaseRef.current = phaseRef.current; changePhase('paused') }
    }
    const visibility = () => { if (document.hidden) pauseOnBlur() }
    const keyDown = (e: KeyboardEvent) => {
      if (e.isComposing || e.keyCode === 229 || !surfaceRef.current?.contains(document.activeElement)) return
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      if (keyMap[key]) { e.preventDefault(); inputRef.current[keyMap[key]] = true }
      if (!e.repeat && (key === 'p' || key === 'Escape')) { e.preventDefault(); togglePause() }
      if (!e.repeat && key === 'r') { e.preventDefault(); start() }
      if (!e.repeat && e.code === 'Space' && document.activeElement === surfaceRef.current) { e.preventDefault(); if (phaseRef.current === 'ready') start(); else togglePause() }
    }
    const keyUp = (e: KeyboardEvent) => { const key = e.key.length === 1 ? e.key.toLowerCase() : e.key; if (keyMap[key]) inputRef.current[keyMap[key]] = false }
    window.addEventListener('keydown', keyDown); window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', pauseOnBlur); document.addEventListener('visibilitychange', visibility)
    let frame = 0, previous = 0, lastHud = 0
    const animate = (now: number) => {
      const dt = previous ? Math.min((now - previous) / 1000, .04) : 0; previous = now
      if (phaseRef.current === 'countdown') {
        countdownRef.current -= dt
        setCountdown(Math.max(1, Math.ceil(countdownRef.current)))
        if (countdownRef.current <= 0) changePhase('racing')
      } else if (phaseRef.current === 'racing') {
        stepRace(raceRef.current, inputRef.current, dt)
        if (raceRef.current.completed !== null) {
          setNotice(raceRef.current.completed === raceRef.current.best ? 'New personal best!' : 'Lap complete. Keep pushing.')
          try { localStorage.setItem(BEST_KEY, String(raceRef.current.best)) } catch { setStorageAvailable(false) }
        }
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(background, 0, 0)
      ctx.setTransform(scale, 0, 0, scale, 0, 0); drawCar(ctx, raceRef.current, colors)
      if (now - lastHud > 65) { setHud({ ...raceRef.current }); lastHud = now }
      frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('keydown', keyDown); window.removeEventListener('keyup', keyUp); window.removeEventListener('blur', pauseOnBlur); document.removeEventListener('visibilitychange', visibility) }
  }, [changePhase, start, togglePause])

  const isActive = phase !== 'ready'
  const speed = Math.round(Math.abs(hud.speed) * .78)
  return <div className="min-h-screen bg-background">
    <header className="border-b border-border">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
        <a href="/" aria-label="APEX home" className="flex items-center gap-2.5"><span className="flex size-8 -skew-x-12 items-center justify-center rounded bg-primary text-primary-foreground"><Flag className="size-5" fill="currentColor" /></span><span className="text-2xl font-black italic tracking-tighter">APEX<span className="text-primary">.</span></span><span className="ml-3 hidden border-l border-border pl-5 text-xs font-medium uppercase tracking-[.2em] text-muted-foreground sm:block">Small car. Big laps.</span></a>
        <Button variant="ghost" onClick={() => setHelp(!help)} aria-expanded={help} aria-controls="how-to-play"><HelpCircle data-icon="inline-start" />How to play</Button>
      </div>
    </header>
    <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 md:px-8 md:py-7">
      <section className="flex items-center justify-between">
        <div className="flex flex-col gap-1"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-primary"><span className="size-1.5 rounded-full bg-primary" />Time attack</div><h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">Just you. The track. The clock.</h1></div>
        <div className="hidden items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-track" />No downloads. Just drive.</div>
      </section>
      {help && <section id="how-to-play" className="flex flex-col gap-2 rounded-xl border border-border bg-secondary p-5 text-sm leading-relaxed"><h2 className="font-semibold">Your first lap</h2><p className="text-muted-foreground">Hold ↑ or W to accelerate. Use ← / → or A / D to steer, and ↓ or S to brake or reverse. Drive counterclockwise, following the arrows. Stay on the track: cutting the grass invalidates your lap until you cross the finish line again.</p><p className="text-muted-foreground">Press P or Space to pause, and R to restart at the starting grid. On touchscreens, hold the on-screen controls. Complete as many laps as you like and beat your best.</p></section>}
      <div ref={surfaceRef} tabIndex={0} aria-label="Racing game. Arrow keys or WASD to drive, P to pause, R to restart." className="game-surface overflow-hidden rounded-xl border border-border bg-secondary" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { inputRef.current = emptyInputs(); if (phaseRef.current === 'racing' || phaseRef.current === 'countdown') { priorPhaseRef.current = phaseRef.current; changePhase('paused') } } }}>
        <section aria-label="Race timing" className="flex items-center justify-between px-5 py-4 md:px-7">
          <div className="flex items-center gap-5 md:gap-12"><Timing label="Current lap" value={formatTime(hud.elapsed)} /><Timing label="Personal best" value={formatTime(hud.best)} accent icon={<Trophy className="size-3" />} /><div className="hidden md:block"><Timing label="Last lap" value={formatTime(hud.last)} /></div></div>
          <div className="hidden flex-col items-end gap-1 border-l border-border pl-7 sm:flex"><span className="text-[11px] uppercase tracking-[.14em] text-muted-foreground">Lap</span><span className="font-mono text-2xl tabular-nums">{String(hud.laps + 1).padStart(2, '0')}<span className="text-base text-muted-foreground"> / ∞</span></span></div>
        </section>
        <div className="relative aspect-[1000/530] overflow-hidden bg-track text-background" onPointerDown={() => surfaceRef.current?.focus({ preventScroll: true })}>
          <canvas ref={canvasRef} className="game-canvas" aria-label="Top-down racing circuit with a coral race car at the starting grid. Follow the circuit counterclockwise.">Your browser needs Canvas support to play.</canvas>
          <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-md bg-background/85 px-3 py-2 text-foreground md:left-5 md:top-5"><Flag className="size-3.5 text-primary" /><span className="text-[11px] font-semibold uppercase tracking-[.13em]">The club circuit</span><span className="hidden border-l border-foreground/20 pl-2 text-[11px] text-foreground/60 sm:block">Dry · Day</span></div>
          <div className="pointer-events-none absolute right-5 top-5 hidden items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider text-foreground/70 sm:flex"><span className={`size-1.5 rounded-full ${phase === 'racing' ? 'bg-primary' : 'bg-track'}`} />{phase === 'racing' ? 'On track' : phase === 'paused' ? 'Paused' : 'Practice session'}</div>
          {(phase === 'ready' || phase === 'paused') && <div className="absolute inset-0 flex items-center justify-center"><div className="flex w-64 flex-col items-center gap-3 rounded-xl border border-foreground/10 bg-background/95 p-5 text-center text-foreground shadow-xl md:w-72 md:gap-4 md:p-6"><div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.2em] text-primary"><span className="h-px w-5 bg-primary/40" />{phase === 'ready' ? 'Your next obsession' : 'Take a breather'}<span className="h-px w-5 bg-primary/40" /></div><h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{phase === 'ready' ? 'Find your racing line.' : 'Back in a moment.'}</h2><p className="max-w-52 text-xs leading-relaxed text-muted-foreground">{phase === 'ready' ? 'One circuit. Unlimited attempts. How fast can you go?' : 'The clock is stopped. Your next personal best can wait.'}</p><Button size="lg" className="w-full" onClick={phase === 'ready' ? start : togglePause}><Play data-icon="inline-start" fill="currentColor" />{phase === 'ready' ? 'Start driving' : 'Resume driving'}<ChevronRight data-icon="inline-end" /></Button><span className="hidden text-[10px] text-muted-foreground sm:block">or press <kbd className="font-mono">SPACE</kbd> to {phase === 'ready' ? 'start' : 'resume'}</span></div></div>}
          {phase === 'countdown' && <div role="status" className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-background"><span className="text-xs font-semibold uppercase tracking-[.2em]">Get ready</span><span className="font-mono text-7xl font-bold leading-none md:text-8xl">{countdown}</span></div>}
          {phase === 'racing' && !hud.valid && <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center"><span className="rounded-md bg-background/90 px-3 py-1.5 text-xs text-primary">Lap invalid — cross the finish line to try again</span></div>}
        </div>
        <div className="flex items-center justify-between px-4 py-3 md:px-6">
          <div className="flex items-center gap-3"><span className="font-mono text-2xl font-medium tabular-nums">{String(speed).padStart(3, '0')}<span className="ml-1.5 font-sans text-[10px] uppercase tracking-wider text-muted-foreground">km/h</span></span><div className="speed-bars hidden sm:flex" aria-hidden="true">{Array.from({ length: 16 }, (_, i) => <span key={i} data-active={speed > i * 12} />)}</div></div>
          <div className="flex items-center gap-2"><Button variant="ghost" disabled={!isActive} onClick={togglePause} aria-label={phase === 'paused' ? 'Resume race' : 'Pause race'}>{phase === 'paused' ? <Play data-icon="inline-start" /> : <Pause data-icon="inline-start" />}<span className="hidden sm:inline">{phase === 'paused' ? 'Resume' : 'Pause'}</span></Button><span className="h-5 w-px bg-border" /><Button variant="ghost" onClick={start} aria-label="Restart race"><RotateCcw data-icon="inline-start" /><span className="hidden sm:inline">Restart</span></Button></div>
        </div>
        <div className="mobile-controls hidden items-center justify-between border-t border-border px-4 py-3"><div className="flex gap-2"><TouchControl action="left" label="Steer left" inputs={inputRef}><ArrowLeft className="size-5" /></TouchControl><TouchControl action="right" label="Steer right" inputs={inputRef}><ArrowRight className="size-5" /></TouchControl></div><div className="flex gap-2"><TouchControl action="down" label="Brake or reverse" inputs={inputRef}><ArrowDown className="size-5" /></TouchControl><TouchControl action="up" label="Accelerate" inputs={inputRef}><ArrowUp className="size-5" /></TouchControl></div></div>
      </div>
      <section aria-label="Keyboard controls" className="flex flex-wrap items-center justify-between gap-y-4 text-xs text-muted-foreground"><div className="flex flex-wrap items-center gap-5"><span className="hidden items-center gap-2 md:flex"><Keyboard className="size-4" />The essentials</span><span className="flex items-center gap-1"><kbd className="keycap">↑</kbd><kbd className="keycap">↓</kbd><span className="ml-1.5">Accelerate / brake</span></span><span className="flex items-center gap-1"><kbd className="keycap">←</kbd><kbd className="keycap">→</kbd><span className="ml-1.5">Steer</span></span><span className="hidden items-center gap-1.5 sm:flex"><kbd className="keycap">P</kbd>Pause</span></div><span className="text-[11px]">WASD works too.</span></section>
      <footer className="flex items-center justify-between border-t border-border pt-4 text-[11px] text-muted-foreground"><p className="flex items-center gap-1.5"><Check className="size-3.5 text-track" />{storageAvailable ? 'Your best lap is saved on this device.' : 'Storage unavailable. Best lap lasts this session.'}</p><span className="hidden sm:inline">Built for the love of the lap.</span></footer>
      <p aria-live="polite" className="sr-only">{notice}{phase === 'paused' ? ' Race paused.' : ''}</p>
    </main>
  </div>
}
