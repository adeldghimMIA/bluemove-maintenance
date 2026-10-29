const MAX_COTE = 1024
const QUALITE = 0.7

/** Redimensionne une photo (appareil ou galerie) et la renvoie en data URL JPEG légère. */
export async function compresserPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Image illisible'))
      i.src = url
    })
    const ratio = Math.min(1, MAX_COTE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * ratio)
    canvas.height = Math.round(img.naturalHeight * ratio)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', QUALITE)
  } finally {
    URL.revokeObjectURL(url)
  }
}
