import type { MapRef } from '@vis.gl/react-maplibre'
import type { CustomLayerInterface, Map as MapLibreMap } from 'maplibre-gl'
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type RefObject,
} from 'react'
import type { LngLat } from '../../domain/types.ts'
import styles from './map.module.css'
import { prismFaces, projectFaces, type WorldPoint } from './silhouette.ts'

// The 3D selection outline (decision 0013). A custom layer receives MapLibre's
// Mercator projection matrix every frame; the selected buildings' faces are
// projected with it and filled into a mask, and the mask is dilated and cut out
// on an overlay canvas so only the boundary of the visible silhouette remains.
// Like the 2D outline, it is a selection-colored line with a surface halo.

const LAYER_ID = 'selection-silhouette'
const SELECTION_WIDTH_PX = 2
const HALO_WIDTH_PX = 4
const DIRECTIONS = 16

export type SilhouettePrism = { footprint: LngLat[]; heightM: number }

type Input = {
  faces: WorldPoint[][]
  selectionColor: string
  haloColor: string
}

type Props = {
  mapRef: RefObject<MapRef | null>
  loaded: boolean
  enabled: boolean
  prisms: SilhouettePrism[]
  selectionColor: string
  haloColor: string
}

function drawSilhouette(
  map: MapLibreMap,
  canvas: HTMLCanvasElement,
  mask: HTMLCanvasElement,
  tint: HTMLCanvasElement,
  matrix: ArrayLike<number>,
  input: Input,
): void {
  const context = canvas.getContext('2d')
  if (!context) return
  const mapCanvas = map.getCanvas()
  const width = mapCanvas.clientWidth
  const height = mapCanvas.clientHeight
  const ratio = window.devicePixelRatio || 1
  const pixelWidth = Math.round(width * ratio)
  const pixelHeight = Math.round(height * ratio)
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth
    canvas.height = pixelHeight
  }
  context.clearRect(0, 0, canvas.width, canvas.height)
  if (width === 0 || height === 0 || input.faces.length === 0) return

  const shapes = projectFaces(input.faces, matrix, width, height)
  if (shapes.length === 0) return
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const shape of shapes) {
    for (const [x, y] of shape) {
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
    }
  }
  const pad = HALO_WIDTH_PX + 1
  const left = Math.floor(Math.max(0, minX - pad))
  const top = Math.floor(Math.max(0, minY - pad))
  const right = Math.ceil(Math.min(width, maxX + pad))
  const bottom = Math.ceil(Math.min(height, maxY + pad))
  if (right <= left || bottom <= top) return

  // The union of every projected face is the building's silhouette.
  const maskWidth = Math.ceil((right - left) * ratio)
  const maskHeight = Math.ceil((bottom - top) * ratio)
  mask.width = maskWidth
  mask.height = maskHeight
  const maskContext = mask.getContext('2d')
  if (!maskContext) return
  maskContext.setTransform(ratio, 0, 0, ratio, -left * ratio, -top * ratio)
  maskContext.fillStyle = input.selectionColor
  for (const shape of shapes) {
    maskContext.beginPath()
    shape.forEach(([x, y], index) => {
      if (index === 0) maskContext.moveTo(x, y)
      else maskContext.lineTo(x, y)
    })
    maskContext.closePath()
    maskContext.fill()
  }

  const dilate = (color: string, radius: number) => {
    tint.width = maskWidth
    tint.height = maskHeight
    const tintContext = tint.getContext('2d')
    if (!tintContext) return
    tintContext.drawImage(mask, 0, 0)
    tintContext.globalCompositeOperation = 'source-in'
    tintContext.fillStyle = color
    tintContext.fillRect(0, 0, maskWidth, maskHeight)
    for (const distance of [radius / 2, radius]) {
      for (let step = 0; step < DIRECTIONS; step++) {
        const angle = (step / DIRECTIONS) * 2 * Math.PI
        context.drawImage(
          tint,
          (left + Math.cos(angle) * distance) * ratio,
          (top + Math.sin(angle) * distance) * ratio,
        )
      }
    }
  }
  dilate(input.haloColor, HALO_WIDTH_PX)
  dilate(input.selectionColor, SELECTION_WIDTH_PX)
  // Remove the silhouette itself so building colors stay untouched.
  context.globalCompositeOperation = 'destination-out'
  context.drawImage(mask, left * ratio, top * ratio)
  context.globalCompositeOperation = 'source-over'
}

export function SelectionSilhouette({
  mapRef,
  loaded,
  enabled,
  prisms,
  selectionColor,
  haloColor,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const faces = useMemo(
    () => prisms.flatMap((prism) => prismFaces(prism.footprint, prism.heightM)),
    [prisms],
  )
  // Read by the render callback, which MapLibre calls outside React.
  const latest = useRef<Input>({ faces, selectionColor, haloColor })

  useLayoutEffect(() => {
    latest.current = { faces, selectionColor, haloColor }
    mapRef.current?.getMap().triggerRepaint()
  }, [faces, selectionColor, haloColor, mapRef])

  useEffect(() => {
    const map = mapRef.current?.getMap()
    const canvas = canvasRef.current
    if (!map || !loaded || !canvas) return
    const clear = () =>
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    if (!enabled) {
      clear()
      return
    }
    const mask = document.createElement('canvas')
    const tint = document.createElement('canvas')
    const layer: CustomLayerInterface = {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',
      // mainMatrix takes Mercator coordinates from 0 to 1 with conformal z;
      // modelViewProjectionMatrix expects world pixel coordinates instead.
      render: (_gl, options) =>
        drawSilhouette(
          map,
          canvas,
          mask,
          tint,
          options.defaultProjectionData.mainMatrix,
          latest.current,
        ),
    }
    // Style swaps (basemap, appearance) drop custom layers; add it back.
    const ensureLayer = () => {
      if (map.getLayer(LAYER_ID)) return
      try {
        map.addLayer(layer)
      } catch {
        // The style is still loading; the next styledata event retries.
      }
    }
    ensureLayer()
    map.on('styledata', ensureLayer)
    map.triggerRepaint()
    return () => {
      map.off('styledata', ensureLayer)
      try {
        if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      } catch {
        // The map is being removed with its style.
      }
      clear()
    }
  }, [mapRef, loaded, enabled])

  return (
    <canvas
      ref={canvasRef}
      className={styles.silhouette}
      data-testid="selection-silhouette"
      aria-hidden="true"
    />
  )
}
