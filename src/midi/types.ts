export interface MidiDeviceInfo {
  id: string
  name: string | null
  manufacturer: string | null
  connectionState: 'connected' | 'disconnected'
}

export type MidiPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown'

export interface MidiAccessState {
  supported: boolean
  permission: MidiPermissionState
  inputs: MidiDeviceInfo[]
  selectedInputId: string | null
  error: string | null
}
