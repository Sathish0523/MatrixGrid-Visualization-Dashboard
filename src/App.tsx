import { useState } from 'react'
import CanvasGrid from './components/CanvasGrid'

function App() {
  const [hoverCoords, setHoverCoords] = useState<string>('–')
  const [selectedCoords, setSelectedCoords] = useState<string>('–')

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Matrix/Grid Dashboard</p>
          <h1>Canvas Visualization Playground</h1>
        </div>
        <div className="status">
          <span>Hover: {hoverCoords}</span>
          <span>Selected: {selectedCoords}</span>
        </div>
      </header>

      <main className="app-main">
        <CanvasGrid
          rows={200}
          cols={200}
          cellSize={32}
          onHover={(row, col) =>
            setHoverCoords(row >= 0 && col >= 0 ? `(${row}, ${col})` : '–')
          }
          onSelect={(row, col) => setSelectedCoords(`(${row}, ${col})`)}
        />
      </main>
    </div>
  )
}

export default App
