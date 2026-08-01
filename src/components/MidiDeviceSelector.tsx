import type { MidiDeviceInfo } from '../midi/types'

export interface MidiDeviceSelectorProps {
  devices: MidiDeviceInfo[]
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function MidiDeviceSelector({ devices, selectedId, onSelect }: MidiDeviceSelectorProps) {
  return (
    <label className="midi-device-selector">
      <span className="midi-device-selector__label">MIDI input</span>
      <select
        className="midi-device-selector__select"
        value={selectedId ?? ''}
        onChange={(event) => onSelect(event.target.value === '' ? null : event.target.value)}
        disabled={devices.length === 0}
      >
        <option value="">
          {devices.length === 0 ? 'No MIDI devices found' : 'Select a device…'}
        </option>
        {devices.map((device) => (
          <option
            key={device.id}
            value={device.id}
            disabled={device.connectionState === 'disconnected'}
          >
            {device.name ?? device.id}
            {device.connectionState === 'disconnected' ? ' (disconnected)' : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
