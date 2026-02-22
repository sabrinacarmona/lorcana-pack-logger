/** Raw card entry from embedded database or API: [name, version, setCode, setName, cn, cost, ink, rarity, type, imageUrl] */
export type RawCard = [string, string, string, string, string, number, string, string, string, string]

export interface Card {
  name: string
  version: string
  /** Combined display string: "Name – Version" or just "Name" if no version */
  display: string
  setCode: string
  setName: string
  /** Collector number as string */
  cn: string
  cost: number
  ink: string
  rarity: string
  type: string[]
  /** Small card image URL from Lorcast API */
  imageUrl: string
}

export interface Pull {
  /** Unique key: "setCode-cn-variant" */
  key: string
  card: Card
  variant: 'normal' | 'foil'
  count: number
  /** Pack number assigned at add time (immutable once set) */
  packNumber: number
}
