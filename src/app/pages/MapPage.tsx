import {
  Layer,
  Map as MapView,
  NavigationControl,
  Source,
  type MapRef,
} from '@vis.gl/react-maplibre'
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Checkbox, Label, Radio, RadioGroup } from 'react-aria-components'
import type { LngLat } from '../../domain/types.ts'
import { STAGE_IDS } from '../../domain/workflow.ts'
import {
  useAppearance,
  useServices,
  useWorkbenchSnapshot,
} from '../WorkbenchContext.tsx'
import type { DataPalette } from '../appearance/appearances.ts'
import { ActionButton } from '../components/ActionButton.tsx'
import { CapabilityBadge, StatusTag } from '../components/CapabilityBadge.tsx'
import { EmptyState } from '../components/EmptyState.tsx'
import formStyles from '../components/forms.module.css'
import { computeMetric, METRICS, type MetricId } from './mapMetrics.ts'
import styles from './map.module.css'

const POINT_KINDS = new Set(['transformer', 'utilityPv', 'bus'])

type Hover = { id: string; label: string; x: number; y: number }

function baseStyle(background: string): StyleSpecification {
  // No basemap: synthetic data only, no tiles, no token (decision 0007). The
  // background is the workbench ground of the active appearance.
  return {
    version: 8,
    sources: {},
    layers: [
      {
        id: 'background',
        type: 'background',
        paint: { 'background-color': background },
      },
    ],
  }
}

function fillExpression(
  min: number,
  max: number,
  palette: DataPalette,
): ExpressionSpecification {
  const ramp = palette.sequential
  const span = max - min || 1
  const stops = ramp.flatMap((color, index) => [
    min + (span * index) / (ramp.length - 1),
    color,
  ])
  return [
    'case',
    ['<', ['get', 'value'], 0],
    palette.noData,
    ['interpolate', ['linear'], ['get', 'value'], ...stops],
  ] as unknown as ExpressionSpecification
}

function boundsOf(points: LngLat[]): [number, number, number, number] | null {
  if (points.length === 0) return null
  let [west, south] = points[0] ?? [0, 0]
  let [east, north] = [west, south]
  for (const [lng, lat] of points) {
    west = Math.min(west, lng)
    east = Math.max(east, lng)
    south = Math.min(south, lat)
    north = Math.max(north, lat)
  }
  return [west, south, east, north]
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return 'No data'
  return `${value.toLocaleString('en-US')}${unit ? ` ${unit}` : ''}`
}

export function MapPage() {
  const headingId = useId()
  const { workbench, layout } = useServices()
  const state = useWorkbenchSnapshot((snapshot) => snapshot.state)
  const appearance = useAppearance()
  const palette = appearance.data
  const mapRef = useRef<MapRef>(null)
  const [loaded, setLoaded] = useState(false)
  const [preferredMetric, setPreferredMetric] = useState<MetricId>('floors')
  const [showGrid, setShowGrid] = useState(true)
  const [hover, setHover] = useState<Hover | null>(null)

  const metrics = useMemo(
    () =>
      Object.fromEntries(
        METRICS.map((metric) => [metric.id, computeMetric(state, metric.id)]),
      ) as Record<MetricId, ReturnType<typeof computeMetric>>,
    [state],
  )
  // Fall back to the first available metric instead of showing an empty ramp.
  const metricId: MetricId = metrics[preferredMetric].available
    ? preferredMetric
    : (METRICS.find((metric) => metrics[metric.id].available)?.id ??
      preferredMetric)
  const metric =
    METRICS.find((candidate) => candidate.id === metricId) ?? METRICS[0]
  const values = metrics[metricId]

  const buildingsGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: state.buildingIds.flatMap((id) => {
        const building = state.buildings[id]
        if (!building) return []
        return [
          {
            type: 'Feature' as const,
            id,
            properties: {
              id,
              name: building.name,
              value: values.values[id] ?? -1,
            },
            geometry: {
              type: 'Polygon' as const,
              coordinates: [building.footprint],
            },
          },
        ]
      }),
    }),
    [state.buildingIds, state.buildings, values],
  )

  const gridElements = Object.values(state.gridElements)
  const hasGrid = gridElements.length > 0
  const gridLines = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: gridElements
        .filter((element) => element.kind === 'line')
        .map((element) => ({
          type: 'Feature' as const,
          id: element.id,
          properties: { id: element.id, name: element.name },
          geometry: {
            type: 'LineString' as const,
            coordinates: element.coordinates,
          },
        })),
    }),
    [gridElements],
  )
  const gridPoints = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: gridElements
        .filter(
          (element) => POINT_KINDS.has(element.kind) && element.coordinates[0],
        )
        .filter((element) => element.kind !== 'bus' || element.id === 'BUS-SUB')
        .map((element) => ({
          type: 'Feature' as const,
          id: element.id,
          properties: {
            id: element.id,
            name: element.name,
            kind: element.kind,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: element.coordinates[0] ?? [0, 0],
          },
        })),
    }),
    [gridElements],
  )

  const bounds = useMemo(
    () =>
      boundsOf(
        state.buildingIds.flatMap((id) => state.buildings[id]?.footprint ?? []),
      ),
    [state.buildingIds, state.buildings],
  )

  // Fit once the map is ready and whenever the footprints change.
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !loaded || !bounds) return
    // Keep footprints clear of the legend in the top-right corner.
    map.fitBounds(bounds, {
      padding: { top: 24, bottom: 40, left: 64, right: 232 },
      duration: 0,
    })
  }, [loaded, bounds])

  // Mirror the shared selection into feature state.
  const selection = state.selection
  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !loaded) return
    for (const source of ['buildings', 'grid-lines', 'grid-points']) {
      if (map.getSource(source)) map.removeFeatureState({ source })
    }
    if (selection.entityType === 'building' && map.getSource('buildings')) {
      for (const id of selection.ids) {
        map.setFeatureState({ source: 'buildings', id }, { selected: true })
      }
    }
    if (selection.entityType === 'gridElement') {
      for (const id of selection.ids) {
        for (const source of ['grid-lines', 'grid-points']) {
          if (map.getSource(source)) {
            map.setFeatureState({ source, id }, { selected: true })
          }
        }
      }
    }
  }, [loaded, selection, buildingsGeoJson, gridLines, gridPoints, showGrid])

  if (state.buildingIds.length === 0) {
    return (
      <section className={styles.page} aria-labelledby={headingId}>
        <header className={styles.header}>
          <h2 id={headingId}>Map</h2>
          <CapabilityBadge id="map.view" />
        </header>
        <EmptyState
          title="No footprints yet"
          message="The map shows synthetic building footprints once the first workflow stage has captured them."
          stageId={STAGE_IDS.location}
        />
      </section>
    )
  }

  const ink = palette.ink
  const selectedIds = selection.entityType ? selection.ids : []
  const unavailable = METRICS.filter(
    (candidate) => !metrics[candidate.id].available,
  )
  const ramp = palette.sequential

  return (
    <section className={styles.page} aria-labelledby={headingId}>
      <header className={styles.header}>
        <h2 id={headingId}>Map</h2>
        <CapabilityBadge id="map.view" />
        <RadioGroup
          className={styles.metricGroup}
          value={metricId}
          orientation="horizontal"
          onChange={(value) => {
            const next = METRICS.find((candidate) => candidate.id === value)
            if (next) setPreferredMetric(next.id)
          }}
        >
          <Label className={formStyles.label}>Color buildings by</Label>
          <div className={formStyles.options}>
            {METRICS.map((candidate) => (
              <Radio
                key={candidate.id}
                value={candidate.id}
                className={formStyles.radio}
                isDisabled={!metrics[candidate.id].available}
              >
                {candidate.label}
              </Radio>
            ))}
          </div>
        </RadioGroup>
        <Checkbox
          className={formStyles.checkbox}
          isSelected={showGrid && hasGrid}
          isDisabled={!hasGrid}
          onChange={setShowGrid}
        >
          Grid overlay
        </Checkbox>
      </header>

      {unavailable.length > 0 ? (
        <p className={styles.note}>
          Not available yet:{' '}
          {unavailable
            .map((candidate) => `${candidate.label} (${candidate.requirement})`)
            .join(' ')}
          {hasGrid ? '' : ' Grid overlay (run "Grid definitions").'}
        </p>
      ) : null}

      <div className={styles.mapArea}>
        <MapView
          ref={mapRef}
          mapStyle={baseStyle(appearance.chrome.bg)}
          initialViewState={{ longitude: 0.003, latitude: 0.003, zoom: 15 }}
          style={{ width: '100%', height: '100%' }}
          interactiveLayerIds={
            showGrid && hasGrid
              ? ['buildings-fill', 'grid-lines-layer', 'grid-points-layer']
              : ['buildings-fill']
          }
          onLoad={() => setLoaded(true)}
          onMouseMove={(event) => {
            const feature = event.features?.[0]
            const id: unknown = feature?.properties?.id
            if (typeof id !== 'string') {
              setHover(null)
              return
            }
            const label =
              feature?.layer.id === 'buildings-fill'
                ? `${id}: ${formatValue(values.values[id] ?? null, metric?.unit ?? '')}`
                : `${String(feature?.properties?.name ?? id)}`
            setHover({ id, label, x: event.point.x, y: event.point.y })
          }}
          onMouseLeave={() => setHover(null)}
          onClick={(event) => {
            const feature = event.features?.[0]
            const id: unknown = feature?.properties?.id
            if (typeof id !== 'string') {
              if (selection.ids.length > 0) {
                workbench.execute({ type: 'selection.clear', input: {} })
              }
              return
            }
            const entityType =
              feature?.layer.id === 'buildings-fill'
                ? 'building'
                : 'gridElement'
            const additive =
              event.originalEvent.shiftKey &&
              selection.entityType === entityType
            const ids = additive
              ? selection.ids.includes(id)
                ? selection.ids.filter((selected) => selected !== id)
                : [...selection.ids, id]
              : [id]
            workbench.execute({
              type: 'selection.set',
              input: { entityType, ids },
            })
          }}
        >
          <NavigationControl position="top-left" showCompass={false} />
          <Source
            id="buildings"
            type="geojson"
            data={buildingsGeoJson}
            promoteId="id"
          >
            <Layer
              id="buildings-fill"
              type="fill"
              paint={{
                'fill-color': fillExpression(values.min, values.max, palette),
                'fill-outline-color': ink.surface,
              }}
            />
            <Layer
              id="buildings-selected"
              type="line"
              paint={{
                'line-color': palette.selection,
                'line-width': [
                  'case',
                  ['boolean', ['feature-state', 'selected'], false],
                  2.5,
                  0,
                ],
              }}
            />
          </Source>
          {showGrid && hasGrid ? (
            <>
              <Source
                id="grid-lines"
                type="geojson"
                data={gridLines}
                promoteId="id"
              >
                <Layer
                  id="grid-lines-layer"
                  type="line"
                  paint={{
                    'line-color': palette.networkLine,
                    'line-width': [
                      'case',
                      ['boolean', ['feature-state', 'selected'], false],
                      4,
                      2,
                    ],
                  }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              </Source>
              <Source
                id="grid-points"
                type="geojson"
                data={gridPoints}
                promoteId="id"
              >
                <Layer
                  id="grid-points-layer"
                  type="circle"
                  paint={{
                    'circle-color': palette.networkPoint,
                    'circle-radius': [
                      'case',
                      ['boolean', ['feature-state', 'selected'], false],
                      8,
                      5,
                    ],
                    'circle-stroke-width': 2,
                    'circle-stroke-color': [
                      'case',
                      ['boolean', ['feature-state', 'selected'], false],
                      palette.selection,
                      ink.surface,
                    ],
                  }}
                />
              </Source>
            </>
          ) : null}
        </MapView>

        {hover ? (
          <div
            className={styles.tooltip}
            style={{ left: hover.x + 12, top: hover.y + 12 }}
            aria-hidden="true"
          >
            {hover.label}
          </div>
        ) : null}

        <div className={styles.legend} aria-label="Map legend" role="group">
          <p className={styles.legendTitle}>
            <span>
              {metric?.label}
              {metric?.unit ? ` (${metric.unit})` : ''}
              {values.scenarioName ? `, ${values.scenarioName}` : ''}
            </span>
            <StatusTag status="simulated" />
          </p>
          <div
            className={styles.ramp}
            style={{
              background: `linear-gradient(to right, ${ramp.join(', ')})`,
            }}
          />
          <div className={styles.rampLabels}>
            <span>{formatValue(values.min, '')}</span>
            <span>{formatValue(values.max, '')}</span>
          </div>
          <p className={styles.legendRow}>
            <span
              className={styles.swatch}
              style={{ background: palette.noData }}
            />{' '}
            No data
          </p>
          {showGrid && hasGrid ? (
            <>
              <p className={styles.legendRow}>
                <span
                  className={styles.lineKey}
                  style={{ background: palette.networkLine }}
                />{' '}
                Feeder line
              </p>
              <p className={styles.legendRow}>
                <span
                  className={styles.dotKey}
                  style={{ background: palette.networkPoint }}
                />{' '}
                Transformer, substation, or utility PV
              </p>
            </>
          ) : null}
        </div>
      </div>

      <footer className={styles.footer}>
        <span data-testid="map-selection">
          {selectedIds.length === 0
            ? 'Nothing selected'
            : `${selectedIds.length} ${selection.entityType === 'building' ? 'building' : 'grid element'}${selectedIds.length === 1 ? '' : 's'} selected: ${selectedIds.slice(0, 5).join(', ')}${selectedIds.length > 5 ? ', …' : ''}`}
        </span>
        <ActionButton
          label="Clear selection"
          disabledReason={
            selectedIds.length > 0 ? null : 'Nothing is selected.'
          }
          onPress={() =>
            workbench.execute({ type: 'selection.clear', input: {} })
          }
        >
          Clear selection
        </ActionButton>
        <span className={styles.a11yNote}>
          The map canvas is not available to screen readers; the Table page
          lists the same buildings and shares the selection.
        </span>
        <ActionButton
          label="Open the Table page"
          disabledReason={null}
          onPress={() => layout.openPage('table')}
        >
          Open Table
        </ActionButton>
      </footer>
    </section>
  )
}
