import turfArea from '@turf/area'

import type { Map } from '@allmaps/annotation'
import type { Polygon } from 'geojson'

const formatter = new Intl.RelativeTimeFormat(undefined, {
  numeric: 'auto'
})

type Division = {
  amount: number
  name: Intl.RelativeTimeFormatUnit
}

const divisions: Division[] = [
  { amount: 60, name: 'seconds' },
  { amount: 60, name: 'minutes' },
  { amount: 24, name: 'hours' },
  { amount: 7, name: 'days' },
  { amount: 4.34524, name: 'weeks' },
  { amount: 12, name: 'months' },
  { amount: Number.POSITIVE_INFINITY, name: 'years' }
]

function formatTimeAgo(date: Date) {
  // From https://blog.webdevsimplified.com/2020-07/relative-time-format/
  let duration = (date.getTime() - new Date().getTime()) / 1000
  for (let i = 0; i <= divisions.length; i++) {
    const division = divisions[i]
    if (Math.abs(duration) < division.amount) {
      return formatter.format(Math.round(duration), division.name)
    }
    duration /= division.amount
  }
}

export function getProperties(map: Map, polygon?: Polygon) {
  const { hostname } = new URL(map.image.uri)
  const timeAgo = formatTimeAgo(new Date(map.updatedAt as string))

  let areaStr
  if (polygon) {
    let area = turfArea(polygon) / (1000 * 1000)

    let maximumFractionDigits = 0
    if (area < 1) {
      maximumFractionDigits = 3
    } else if (area < 10) {
      maximumFractionDigits = 2
    } else if (area < 20) {
      maximumFractionDigits = 1
    }

    areaStr = `${new Intl.NumberFormat('en-US', {
      maximumFractionDigits
    }).format(area)} km²`
  }

  return {
    hostname,
    timeAgo,
    areaStr
  }
}
