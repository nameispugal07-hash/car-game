export const WORLD = { width: 1000, height: 530 }
export const ROAD_WIDTH = 76
export type Point = { x: number; y: number }
const anchors: Point[] = [
  { x: 500, y: 414 }, { x: 725, y: 414 }, { x: 835, y: 355 },
  { x: 837, y: 225 }, { x: 752, y: 119 }, { x: 593, y: 133 },
  { x: 457, y: 103 }, { x: 290, y: 106 }, { x: 169, y: 179 },
  { x: 160, y: 309 }, { x: 273, y: 407 },
]
export const TRACK: Point[] = anchors.flatMap((p1, i) => {
  const p0 = anchors[(i - 1 + anchors.length) % anchors.length]
  const p2 = anchors[(i + 1) % anchors.length]
  const p3 = anchors[(i + 2) % anchors.length]
  return Array.from({ length: 40 }, (_, j) => {
    const t = j / 40
    const coordinate = (k: 'x' | 'y') => .5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t * t + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t * t * t)
    return { x: coordinate('x'), y: coordinate('y') }
  })
})
export type Inputs = { up: boolean; down: boolean; left: boolean; right: boolean }
export const emptyInputs = (): Inputs => ({ up: false, down: false, left: false, right: false })
export type RaceState = {
  x: number; y: number; angle: number; speed: number; elapsed: number;
  laps: number; last: number | null; best: number | null; checkpoint: number;
  progress: number; offroad: boolean; valid: boolean; completed: number | null;
}
export function newRace(best: number | null = null): RaceState {
  return { x: TRACK[0].x, y: TRACK[0].y, angle: Math.atan2(TRACK[1].y - TRACK[0].y, TRACK[1].x - TRACK[0].x), speed: 0, elapsed: 0, laps: 0, last: null, best, checkpoint: 0, progress: 0, offroad: false, valid: true, completed: null }
}
export function nearestTrack(x: number, y: number) {
  let index = 0, distance = Infinity
  for (let i = 0; i < TRACK.length; i++) {
    const d = (TRACK[i].x - x) ** 2 + (TRACK[i].y - y) ** 2
    if (d < distance) { distance = d; index = i }
  }
  return { index, distance: Math.sqrt(distance), progress: index / TRACK.length }
}
export function updateLap(state: RaceState, progress: number, onRoad: boolean) {
  let delta = progress - state.progress
  if (delta < -.5) delta += 1
  if (delta > .5) delta -= 1
  if (!onRoad) state.valid = false
  const sector = Math.floor(progress * 12)
  if (onRoad && delta > 0 && delta < .08) {
    if (sector === state.checkpoint + 1) state.checkpoint = sector
    if (progress < .08 && state.progress > .92) {
      if (state.checkpoint === 11 && state.valid && state.elapsed > 3) {
        state.completed = state.elapsed
        state.last = state.elapsed
        state.best = state.best === null ? state.elapsed : Math.min(state.best, state.elapsed)
        state.laps++
      }
      state.elapsed = 0
      state.checkpoint = 0
      state.valid = true
    }
  }
  state.progress = progress
}
export function stepRace(state: RaceState, input: Inputs, dt: number) {
  state.completed = null
  state.elapsed += dt
  const before = nearestTrack(state.x, state.y)
  state.offroad = before.distance > ROAD_WIDTH / 2 + 3
  const acceleration = input.up ? 115 : input.down ? (state.speed > 0 ? -235 : -65) : 0
  state.speed += acceleration * dt
  state.speed *= Math.exp(-(state.offroad ? 3.6 : input.up || input.down ? .2 : .85) * dt)
  state.speed = Math.max(-65, Math.min(state.offroad ? 78 : 260, state.speed))
  if (Math.abs(state.speed) < .3) state.speed = 0
  const steering = Number(input.right) - Number(input.left)
  state.angle += steering * 2.15 * Math.min(Math.abs(state.speed) / 75, 1) * Math.sign(state.speed) * dt
  state.x = Math.max(15, Math.min(WORLD.width - 15, state.x + Math.cos(state.angle) * state.speed * dt))
  state.y = Math.max(15, Math.min(WORLD.height - 15, state.y + Math.sin(state.angle) * state.speed * dt))
  const after = nearestTrack(state.x, state.y)
  updateLap(state, after.progress, after.distance < ROAD_WIDTH / 2 + 12)
}
export function formatTime(seconds: number | null) {
  if (seconds === null) return '--:--.---'
  const ms = Math.floor(seconds * 1000)
  return `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`
}
