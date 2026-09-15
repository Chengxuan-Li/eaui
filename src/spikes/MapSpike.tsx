import {
  Layer,
  Map as MapView,
  Source,
  type MapRef,
} from '@vis.gl/react-maplibre'
import type { StyleSpecification } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import { buildings, SPIKE_CENTER } from './fixtures.ts'
import { exposeInstance, recordMount } from './probe.ts'
import styles from './spikes.module.css'

// A style with no basemap: only a background layer. Spike question: does
// MapLibre render GeoJSON sources without any tile source or token?
const emptyStyle: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [
    {
      id: 'background',
      type: 'background',
      paint: { 'background-color': '#e9edf1' },
    },
  ],
}

type MapSpikeProps = {
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function MapSpike({ selectedId, onSelect }: MapSpikeProps) {
  const mapRef = useRef<MapRef>(null)
  const previousSelection = useRef<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    recordMount('map')
  }, [])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    if (!map || !loaded) return
    if (previousSelection.current) {
      map.setFeatureState(
        { source: 'buildings', id: previousSelection.current },
        { selected: false },
      )
    }
    if (selectedId) {
      map.setFeatureState(
        { source: 'buildings', id: selectedId },
        { selected: true },
      )
    }
    previousSelection.current = selectedId
  }, [selectedId, loaded])

  return (
    <div className={styles.fill} data-testid="map-spike" data-loaded={loaded}>
      <MapView
        ref={mapRef}
        mapStyle={emptyStyle}
        initialViewState={{ ...SPIKE_CENTER, zoom: 15.5 }}
        interactiveLayerIds={['buildings-fill']}
        style={{ width: '100%', height: '100%' }}
        onLoad={(event) => {
          exposeInstance('map', event.target)
          setLoaded(true)
        }}
        onClick={(event) => {
          const id: unknown = event.features?.[0]?.properties?.id
          onSelect(typeof id === 'string' ? id : null)
        }}
      >
        <Source id="buildings" type="geojson" data={buildings} promoteId="id">
          <Layer
            id="buildings-fill"
            type="fill"
            paint={{
              'fill-color': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                '#1f6fd1',
                [
                  'interpolate',
                  ['linear'],
                  ['get', 'pvYieldKwh'],
                  2000,
                  '#dfe8f1',
                  12000,
                  '#2f6b3a',
                ],
              ],
              'fill-outline-color': '#5b6573',
            }}
          />
        </Source>
      </MapView>
    </div>
  )
}
