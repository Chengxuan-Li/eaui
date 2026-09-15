import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type CellEditRequestEvent,
  type ColDef,
  type GridApi,
} from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildingRows, type BuildingProperties } from './fixtures.ts'
import { exposeInstance, recordMount } from './probe.ts'
import styles from './spikes.module.css'

ModuleRegistry.registerModules([AllCommunityModule])

type EditableField = 'archetype' | 'floors'
type RowEdits = Partial<Pick<BuildingProperties, EditableField>>
type PendingEdits = Record<string, RowEdits>
type ValidationResult =
  { ok: true; value: string | number } | { ok: false; message: string }

function validate(field: EditableField, value: unknown): ValidationResult {
  if (field === 'floors') {
    const floors = typeof value === 'number' ? value : Number(value)
    return Number.isInteger(floors) && floors >= 1 && floors <= 60
      ? { ok: true, value: floors }
      : { ok: false, message: 'Floors must be a whole number from 1 to 60.' }
  }
  const text = typeof value === 'string' ? value.trim() : ''
  return text
    ? { ok: true, value: text }
    : { ok: false, message: 'Archetype cannot be empty.' }
}

type GridSpikeProps = {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function GridSpike({ selectedId, onSelect }: GridSpikeProps) {
  const apiRef = useRef<GridApi<BuildingProperties> | null>(null)
  const [committed, setCommitted] = useState(buildingRows)
  const [pending, setPending] = useState<PendingEdits>({})
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    recordMount('grid')
  }, [])

  const rows = useMemo(
    () =>
      committed.map((row) => {
        const edits = pending[row.id]
        return edits ? { ...row, ...edits } : row
      }),
    [committed, pending],
  )
  const pendingCount = Object.keys(pending).length

  const columns = useMemo<ColDef<BuildingProperties>[]>(
    () => [
      { field: 'id', headerName: 'ID', width: 110 },
      { field: 'name', headerName: 'Name', flex: 1, minWidth: 180 },
      { field: 'archetype', headerName: 'Archetype', editable: true },
      { field: 'floors', headerName: 'Floors', editable: true, width: 110 },
      {
        field: 'pvYieldKwh',
        headerName: 'PV yield, kWh/yr (synthetic)',
        width: 220,
      },
    ],
    [],
  )

  useEffect(() => {
    const api = apiRef.current
    if (!api) return
    if (!selectedId) {
      api.deselectAll()
      return
    }
    const node = api.getRowNode(selectedId)
    if (node && !node.isSelected()) {
      node.setSelected(true, true)
      api.ensureNodeVisible(node)
    }
  }, [selectedId])

  function handleEditRequest(event: CellEditRequestEvent<BuildingProperties>) {
    const field = event.colDef.field
    const row = event.data
    if (!row || (field !== 'archetype' && field !== 'floors')) return
    const result = validate(field, event.newValue)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setError(null)
    setPending((current) => ({
      ...current,
      [row.id]: { ...current[row.id], [field]: result.value },
    }))
  }

  function applyEdits() {
    setCommitted(rows)
    setPending({})
    setError(null)
  }

  function cancelEdits() {
    setPending({})
    setError(null)
  }

  return (
    <div className={styles.column} data-testid="grid-spike">
      <div className={styles.toolbar} role="group" aria-label="Pending edits">
        <span data-testid="pending-count">
          {pendingCount} pending {pendingCount === 1 ? 'row' : 'rows'}
        </span>
        <button
          type="button"
          onClick={applyEdits}
          disabled={pendingCount === 0}
        >
          Apply
        </button>
        <button
          type="button"
          onClick={cancelEdits}
          disabled={pendingCount === 0 && !error}
        >
          Cancel
        </button>
        {error ? (
          <p className={styles.alert} role="alert">
            {error}
          </p>
        ) : null}
      </div>
      <div className={styles.grow}>
        <AgGridReact<BuildingProperties>
          theme={themeQuartz}
          rowData={rows}
          columnDefs={columns}
          getRowId={(params) => params.data.id}
          readOnlyEdit
          onCellEditRequest={handleEditRequest}
          rowSelection={{
            mode: 'singleRow',
            checkboxes: false,
            enableClickSelection: true,
          }}
          onSelectionChanged={(event) =>
            onSelect(event.api.getSelectedRows()[0]?.id ?? null)
          }
          onGridReady={(event) => {
            apiRef.current = event.api
            exposeInstance('grid', event.api)
          }}
        />
      </div>
    </div>
  )
}
