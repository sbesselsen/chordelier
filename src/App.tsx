import { useState } from 'react'
import { FreePlayPage } from './pages/FreePlayPage'
import { TrainingDebugPage } from './pages/TrainingDebugPage'

type Tab = 'freePlay' | 'trainingDebug'

function App() {
  const [tab, setTab] = useState<Tab>('freePlay')

  return (
    <main>
      <h1>Chordelier</h1>
      <nav>
        <button type="button" onClick={() => setTab('freePlay')} disabled={tab === 'freePlay'}>
          Free Play
        </button>
        <button
          type="button"
          onClick={() => setTab('trainingDebug')}
          disabled={tab === 'trainingDebug'}
        >
          Training (debug)
        </button>
      </nav>
      {tab === 'freePlay' ? <FreePlayPage /> : <TrainingDebugPage />}
    </main>
  )
}

export default App
