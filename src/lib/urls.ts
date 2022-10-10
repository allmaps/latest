import type { Map } from '@allmaps/annotation'

export function getUrls(map: Map) {
  const mapId = map.id
  const imageUri = map.image.uri
  const imageId = map.image.id
  const annotationUrl = `https://annotations.allmaps.org/images/${imageId}`

  return {
    viewer: `https://viewer.allmaps.org/#data=data%3Atext%2Fx-url%2C${encodeURIComponent(
      annotationUrl
    )}`,
    editor: `https://editor.allmaps.org/#/mask?url=${imageUri}&image=${imageId}&map=${mapId}`
  }
}
