import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'

type CanvasGridProps = {
  rows: number
  cols: number
  cellSize: number
  onHover?: (row: number, col: number) => void
  onSelect?: (row: number, col: number) => void
}

type Point = { x: number; y: number }
type Cell = { row: number; col: number }

const MIN_SCALE = 0.25
const MAX_SCALE = 4

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export default function CanvasGrid({
  rows,
  cols,
  cellSize,
  onHover,
  onSelect,
}: CanvasGridProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 })
  const [hoveredCell, setHoveredCell] = useState<Cell | null>(null)
  const [selectedCell, setSelectedCell] = useState<Cell | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 })
  const panState = useRef({
    dragging: false,
    pointerId: -1,
    start: { x: 0, y: 0 },
    origin: { x: 0, y: 0 },
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      const { width, height } = entry.contentRect
      setCanvasSize({
        width: Math.max(width, 200),
        height: Math.max(height, 200),
      })
    })

    observer.observe(container)
    setCanvasSize({
      width: container.clientWidth || 1200,
      height: container.clientHeight || 800,
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
  }, [canvasSize])

  const getCellFromClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      const x = (clientX - rect.left - offset.x) / scale
      const y = (clientY - rect.top - offset.y) / scale
      const col = Math.floor(x / cellSize)
      const row = Math.floor(y / cellSize)
      if (row < 0 || col < 0 || row >= rows || col >= cols) return null
      return { row, col }
    },
    [cellSize, cols, rows, offset, scale],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.scale(dpr, dpr)
    ctx.translate(offset.x, offset.y)
    ctx.scale(scale, scale)

    const gridWidth = cols * cellSize
    const gridHeight = rows * cellSize

    // background
    const grad = ctx.createLinearGradient(0, 0, gridWidth, gridHeight)
    grad.addColorStop(0, '#0f0f15')
    grad.addColorStop(1, '#111820')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, gridWidth, gridHeight)

    ctx.strokeStyle = '#242628'
    ctx.lineWidth = 1 / scale

    for (let r = 0; r <= rows; r++) {
      const y = r * cellSize
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(gridWidth, y)
      ctx.stroke()
    }

    for (let c = 0; c <= cols; c++) {
      const x = c * cellSize
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, gridHeight)
      ctx.stroke()
    }

    if (hoveredCell) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(
        hoveredCell.col * cellSize,
        hoveredCell.row * cellSize,
        cellSize,
        cellSize,
      )
    }

    if (selectedCell) {
      ctx.strokeStyle = '#ff9800'
      ctx.lineWidth = 2 / scale
      ctx.strokeRect(
        selectedCell.col * cellSize + (1 / scale) * 0.5,
        selectedCell.row * cellSize + (1 / scale) * 0.5,
        cellSize - 1 / scale,
        cellSize - 1 / scale,
      )
    }

    ctx.restore()
  }, [
    cellSize,
    cols,
    rows,
    scale,
    offset,
    hoveredCell,
    selectedCell,
    canvasSize,
  ])

  const handlePointerDown = useCallback(
    (evt: ReactPointerEvent<HTMLCanvasElement>) => {
      evt.preventDefault()
      panState.current = {
        dragging: true,
        pointerId: evt.pointerId,
        start: { x: evt.clientX, y: evt.clientY },
        origin: { ...offset },
      }
      evt.currentTarget.setPointerCapture(evt.pointerId)
    },
    [offset],
  )

  const handlePointerMove = useCallback(
    (evt: ReactPointerEvent<HTMLCanvasElement>) => {
      if (panState.current.dragging && panState.current.pointerId === evt.pointerId) {
        const dx = evt.clientX - panState.current.start.x
        const dy = evt.clientY - panState.current.start.y
        setOffset({
          x: panState.current.origin.x + dx,
          y: panState.current.origin.y + dy,
        })
      }

      const cell = getCellFromClientPoint(evt.clientX, evt.clientY)
      setHoveredCell(cell)
      onHover?.(cell ? cell.row : -1, cell ? cell.col : -1)
    },
    [getCellFromClientPoint, onHover],
  )

  const handlePointerUp = useCallback((evt: ReactPointerEvent<HTMLCanvasElement>) => {
    if (panState.current.pointerId === evt.pointerId) {
      panState.current.dragging = false
    }
    evt.currentTarget.releasePointerCapture(evt.pointerId)
  }, [])

  const handlePointerLeave = useCallback(() => {
    setHoveredCell(null)
    onHover?.(-1, -1)
  }, [onHover])

  const handleClick = useCallback(
    (evt: ReactMouseEvent<HTMLCanvasElement>) => {
      const cell = getCellFromClientPoint(evt.clientX, evt.clientY)
      if (cell) {
        setSelectedCell(cell)
        onSelect?.(cell.row, cell.col)
      }
    },
    [getCellFromClientPoint, onSelect],
  )

  const handleWheel = useCallback((evt: ReactWheelEvent<HTMLCanvasElement>) => {
    evt.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = evt.clientX - rect.left
    const mouseY = evt.clientY - rect.top

    setScale((prevScale) => {
      const nextScale = clamp(prevScale - evt.deltaY * 0.001, MIN_SCALE, MAX_SCALE)
      if (nextScale === prevScale) return prevScale

      const ratio = nextScale / prevScale
      setOffset((prevOffset) => ({
        x: mouseX - (mouseX - prevOffset.x) * ratio,
        y: mouseY - (mouseY - prevOffset.y) * ratio,
      }))

      return nextScale
    })
  }, [])

  return (
    <div ref={containerRef} className="canvas-grid">
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
        onWheel={handleWheel}
      />
    </div>
  )
}

