<script lang="ts">
  import { onMount } from 'svelte'

  import turfRewind from '@turf/rewind'
  import { createTransformer, polygonToWorld } from '@allmaps/transform'
  import { geoProjection, geoPath } from 'd3-geo'

  import { getUrls } from '$lib/urls.js'
  import { getProperties } from '$lib/properties.js'

  import type { Map } from '@allmaps/annotation'
  import type { Polygon } from 'geojson'

  type DisplayMap = {
    map: Map
    error?: string
    polygon?: Polygon
    urls?: {
      viewer?: string
      editor?: string
    }
    properties?: {
      hostname?: string
      timeAgo?: string
      areaStr?: string
    }
  }

  let maps: Map[] = []
  let displayMaps: DisplayMap[] = []

  let loadingSteps: number[] = []
  let loadingInterval = setInterval(() => {
    loadingSteps.push(loadingSteps.length)
    loadingSteps = loadingSteps
  }, 200)

  let errorCount = 0
  $: {
    errorCount = displayMaps.filter((map) => map.error).length
  }

  const mapsUrl = 'https://api.allmaps.org/maps'

  const mercator = geoProjection((x, y) => [
    x,
    Math.log(Math.tan(Math.PI / 4 + y / 2))
  ])

  const path = geoPath().projection(mercator)

  function geometryToPath(polygon: Polygon) {
    const width = 100
    const height = 100

    mercator.scale(1).translate([0, 0])

    const bounds = path.bounds(polygon)
    const scale =
      0.9 /
      Math.max(
        (bounds[1][0] - bounds[0][0]) / width,
        (bounds[1][1] - bounds[0][1]) / height
      )

    const translate: [number, number] = [
      (width - scale * (bounds[1][0] + bounds[0][0])) / 2,
      (height - scale * (bounds[1][1] + bounds[0][1])) / 2
    ]

    mercator.scale(scale).translate(translate)

    const d = path(polygon)

    const containsNaN = d && d.indexOf('NaN') > -1

    if (!containsNaN) {
      return d
    } else {
      return undefined
    }
  }

  onMount(async () => {
    const response = await fetch(mapsUrl)
    maps = await response.json()

    clearInterval(loadingInterval)
    loadingSteps = []

    displayMaps = maps.map((map) => {
      let error
      let polygon

      if (map.gcps.length >= 3) {
        if (map.pixelMask.length >= 3) {
          try {
            const transformer = createTransformer(map.gcps)
            const pixelMask = [...map.pixelMask, map.pixelMask[0]]

            polygon = polygonToWorld(transformer, pixelMask) as Polygon

            // d3-geo requires the opposite polygon winding order of
            // the GoeJSON spec: https://github.com/d3/d3-geo
            turfRewind(polygon, { mutate: true, reverse: true })
          } catch (err) {
            let message = 'Unknown Error'
            if (err instanceof Error) {
              message = err.message
            }
            error = message
          }
        } else {
          error = 'pixel mask should have more than 2 points'
        }
      } else {
        error = 'map should have more than 2 gcps'
      }

      return {
        map,
        error,
        polygon,
        urls: getUrls(map),
        properties: getProperties(map, polygon)
      }
    })
  })
</script>

<ol class="masks">
  <li class="header">
    <h1>
      The latest maps edited with <a href="https://editor.allmaps.org"
        >Allmaps Editor</a
      >
    </h1>
    {#if displayMaps.length}
      <p>{displayMaps.length} maps, {errorCount} with errors</p>
    {/if}
    <!-- Add config:
    - switch between pixel mask and geo mask
    - sort!
    - hide errors
  -->
  </li>

  {#each loadingSteps as index}
    <li class="loading-step" style:scale={0.9 - 0.02 * index} />
  {/each}

  {#each displayMaps as { map, error, polygon, urls, properties }, index}
    <li class:error class:mask={true}>
      <div class="properties">
        <div class="hostname">{properties?.hostname}</div>
        <div class="timeago">updated {properties?.timeAgo}</div>
        <div>
          <a href={urls?.editor}>editor</a> / <a href={urls?.viewer}>viewer</a>
        </div>
        <div class="grow" />
        <!-- TODO: add square km. -->
        {#if error}
          <div class="error">
            {error}
          </div>
        {:else}
          <div class="numbers">
            <span>{map.gcps.length} gcps</span>
            <span>{map.pixelMask.length} mask pts</span>
            <span>{properties?.areaStr}</span>
          </div>
        {/if}
      </div>
      {#if error}
        <a href={urls?.editor}>
          <svg viewBox="0 0 100 100">
            <line x1="10" y1="10" x2="90" y2="90" />
            <line x1="10" y1="90" x2="90" y2="10" />
          </svg>
        </a>
      {:else if polygon}
        <a href={urls?.viewer}>
          <svg viewBox="0 0 100 100">
            <path d={geometryToPath(polygon)} />
          </svg>
        </a>
      {/if}
    </li>
  {/each}
</ol>

<style>
  :global(body) {
    margin: 0;
    font-family: monospace;
  }

  .masks {
    list-style-type: none;
    display: grid;

    --grid-layout-gap: 5px;
    --grid-column-count: 5;
    --grid-item--min-width: 180px;

    gap: var(--grid-layout-gap);
    margin: var(--grid-layout-gap);
    padding: 0;

    /* From:
      https://css-tricks.com/an-auto-filling-css-grid-with-max-columns/ */

    --gap-count: calc(var(--grid-column-count) - 1);
    --total-gap-width: calc(var(--gap-count) * var(--grid-layout-gap));
    --grid-item--max-width: calc(
      (100% - var(--total-gap-width)) / var(--grid-column-count)
    );

    grid-template-columns: repeat(
      auto-fill,
      minmax(max(var(--grid-item--min-width), var(--grid-item--max-width)), 1fr)
    );
  }

  .masks .header {
    padding: var(--grid-layout-gap);
  }

  .masks h1 {
    margin: 0;
  }

  .masks li {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 5px;
    overflow: hidden;
  }

  .masks li.mask > * {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .masks svg {
    fill: none;
    stroke: white;
    stroke-width: 2.2px;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .masks li.error {
    stroke-opacity: 0.25;
  }

  .masks li:nth-child(even) {
    background-color: rgb(99, 216, 230);
  }

  .masks li:nth-child(odd) {
    background-color: rgb(255, 199, 66);
  }

  .masks li.error {
    background-color: rgb(254, 94, 96);
  }

  .masks li.header {
    background-color: rgba(240, 240, 240, 1);
  }

  .masks li.loading-step {
    background-color: rgba(230, 230, 230, 1);
  }

  .properties {
    box-sizing: border-box;
    z-index: 100;
    /* font-size: 50%; */
    display: grid;
    gap: var(--grid-layout-gap);
    padding: var(--grid-layout-gap);
    grid-template-columns: auto;
    grid-template-rows: auto auto auto 1fr auto;
    pointer-events: none;
  }

  .numbers {
    display: grid;
    justify-items: center;
    align-items: center;
    gap: var(--grid-layout-gap);
    grid-template-columns: 1fr 1fr 1fr;
    font-size: 80%;
  }

  a,
  a:visited {
    color: black;
  }

  .properties > * {
    pointer-events: all;
  }

  .properties .grow {
    pointer-events: none;
  }

  .properties .hostname {
    word-break: break-all;
  }

  .properties .hostname,
  .properties .error {
    font-weight: bold;
  }

  .properties .error {
    text-align: center;
  }
</style>
