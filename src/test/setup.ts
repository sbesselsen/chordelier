import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Not relying on Vitest's `globals: true` elsewhere, so RTL's automatic
// afterEach-based cleanup never gets registered on its own — without this,
// components rendered by one test stay mounted (and still subscribed to
// shared stores like heldNotesStore) into the next.
afterEach(() => {
  cleanup()
})
