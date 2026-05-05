export type RoomType = 'kitchen' | 'bedroom' | 'living' | 'bathroom' | 'multipurpose'

export interface BaseInterior {
  id: string
  label: string
  filename: string
  roomType: RoomType
  description?: string
}

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  living: 'Salons',
  bedroom: 'Chambres',
  kitchen: 'Cuisines',
  bathroom: 'Salles de bain',
  multipurpose: 'Multi-usage',
}

export const ROOM_TYPE_ORDER: RoomType[] = ['living', 'bedroom', 'kitchen', 'bathroom', 'multipurpose']
