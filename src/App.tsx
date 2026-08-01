import { useState } from 'react'
import { FreePlayPage } from './pages/FreePlayPage'
import { TrainingPage } from './pages/TrainingPage'

type Tab = 'freePlay' | 'training'

function App() {
  const [tab, setTab] = useState<Tab>('freePlay')

  return (
    <main>
      <h1>Chordelier</h1>
      <nav>
        <button type="button" onClick={() => setTab('freePlay')} disabled={tab === 'freePlay'}>
          Free Play
        </button>
        <button type="button" onClick={() => setTab('training')} disabled={tab === 'training'}>
          Training
        </button>
      </nav>
      {tab === 'freePlay' ? <FreePlayPage /> : <TrainingPage />}
    </main>
  )
}

export default App
