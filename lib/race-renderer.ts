import { TRACK, WORLD, ROAD_WIDTH, type RaceState } from './race-engine'
export type Palette = { background: string; card: string; foreground: string; green: string; primary: string }
function trackPath() {
  const path = new Path2D()
  TRACK.forEach((p, i) => i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y))
  path.closePath()
  return path
}
export function drawCircuit(ctx: CanvasRenderingContext2D, colors: Palette) {
  const { width, height } = WORLD
  ctx.fillStyle = colors.green
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = colors.background
  ctx.globalAlpha = .055
  for (let x = -500; x < width; x += 72) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 36, 0); ctx.lineTo(x + height + 36, height); ctx.lineTo(x + height, height); ctx.fill()
  }
  ctx.globalAlpha = 1
  let seed = 47
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647 }
  ctx.fillStyle = colors.foreground
  ctx.globalAlpha = .08
  for (let i = 0; i < 2600; i++) ctx.fillRect(random() * width, random() * height, 1, 1)
  ctx.globalAlpha = 1
  const path = trackPath()
  ctx.lineJoin = 'round'
  ctx.strokeStyle = colors.background; ctx.globalAlpha = .13; ctx.lineWidth = ROAD_WIDTH + 35; ctx.stroke(path); ctx.globalAlpha = 1
  ctx.strokeStyle = colors.foreground; ctx.lineWidth = ROAD_WIDTH + 15; ctx.stroke(path)
  ctx.strokeStyle = colors.primary; ctx.setLineDash([13, 13]); ctx.stroke(path); ctx.setLineDash([])
  ctx.strokeStyle = colors.background; ctx.lineWidth = ROAD_WIDTH + 2; ctx.stroke(path)
  ctx.strokeStyle = colors.card; ctx.lineWidth = ROAD_WIDTH - 4; ctx.stroke(path)
  ctx.strokeStyle = colors.foreground; ctx.globalAlpha = .17; ctx.lineWidth = 1.5; ctx.setLineDash([12, 20]); ctx.stroke(path); ctx.setLineDash([]); ctx.globalAlpha = 1
  for (let row = 0; row < 10; row++) for (let col = 0; col < 3; col++) {
    ctx.fillStyle = (row + col) % 2 ? colors.background : colors.foreground
    ctx.fillRect(498 + col * 7, 376 + row * 7.6, 7, 7.6)
  }
  ctx.strokeStyle = colors.foreground; ctx.lineWidth = 1.2; ctx.globalAlpha = .4
  for (let i = 0; i < 4; i++) {
    const x = 455 - i * 36, y = i % 2 ? 425 : 390
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y); ctx.lineTo(x + 22, y + 13); ctx.lineTo(x, y + 13); ctx.stroke()
  }
  ctx.globalAlpha = .3; ctx.fillStyle = colors.foreground
  for (const i of [24, 128, 243, 340]) {
    const p = TRACK[i], n = TRACK[(i + 1) % TRACK.length]
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(Math.atan2(n.y - p.y, n.x - p.x))
    ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(2, 0); ctx.lineTo(-5, 5); ctx.lineTo(-2, 5); ctx.lineTo(5, 0); ctx.lineTo(-2, -5); ctx.closePath(); ctx.fill(); ctx.restore()
  }
  ctx.globalAlpha = .19; ctx.fillStyle = colors.background; ctx.textAlign = 'center'
  ctx.font = 'italic 900 72px sans-serif'; ctx.fillText('APEX', 498, 285)
  ctx.font = '600 12px sans-serif'; ctx.fillText('EVERY SECOND COUNTS', 493, 307)
  ctx.globalAlpha = 1
  const trees = [[53,62,21],[87,42,16],[30,107,18],[52,469,22],[88,496,17],[941,56,26],[906,33,19],[970,109,21],[920,472,25],[952,449,17],[879,497,15],[380,270,16],[353,287,12],[638,292,18],[663,278,12]]
  for (const [x,y,r] of trees) {
    ctx.fillStyle = colors.background; ctx.globalAlpha = .2; ctx.beginPath(); ctx.arc(x+5,y+7,r,0,Math.PI*2);ctx.fill()
    ctx.globalAlpha = 1;ctx.fillStyle = colors.card;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill()
    ctx.fillStyle = colors.green;ctx.globalAlpha=.65;ctx.beginPath();ctx.arc(x-3,y-4,r*.73,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1
  }
  ctx.save(); ctx.translate(503, 489)
  ctx.fillStyle=colors.card;ctx.fillRect(-85,-13,170,25)
  ctx.fillStyle=colors.foreground;ctx.globalAlpha=.65;ctx.font='bold 11px sans-serif';ctx.fillText('APEX MOTORSPORT CLUB',0,3);ctx.restore()
}
export function drawCar(ctx: CanvasRenderingContext2D, s: RaceState, colors: Palette) {
  ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.angle)
  ctx.fillStyle=colors.background;ctx.globalAlpha=.3;ctx.beginPath();ctx.roundRect(-15,-6,33,18,5);ctx.fill();ctx.globalAlpha=1
  ctx.fillStyle=colors.background
  for (const x of [-10,7]) for (const y of [-10,6]) ctx.fillRect(x,y,7,4)
  ctx.fillStyle=colors.primary;ctx.beginPath();ctx.roundRect(-16,-8,32,16,5);ctx.fill()
  ctx.fillStyle=colors.foreground;ctx.fillRect(-13,-1.5,27,3)
  ctx.fillStyle=colors.card;ctx.beginPath();ctx.roundRect(-4,-5.5,11,11,2);ctx.fill()
  ctx.fillStyle=colors.foreground;ctx.globalAlpha=.22;ctx.fillRect(3,-4,3,8);ctx.globalAlpha=1
  ctx.fillStyle=colors.background;ctx.fillRect(-14,-10,3,20)
  ctx.fillStyle=colors.foreground;ctx.fillRect(13,-6,2,3);ctx.fillRect(13,3,2,3)
  ctx.restore()
}
