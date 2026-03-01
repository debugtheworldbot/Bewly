// https://app.quicktype.io/?l=ts

export interface forYouResult {
  code: number
  message: string
  ttl: number
  data: Data | null
}

export interface Data {
  item: Item[]
  items?: Item[]
  side_bar_column: any[]
  business_card: null
  floor_info: null
  user_feature: null
  preload_expose_pct: number
  preload_floor_expose_pct: number
  mid: number
}

export interface Item {
  id: number
  bvid: string
  cid: number
  goto: Goto
  uri: string
  pic: string
  pic_4_3: string
  title: string
  duration: number
  pubdate: number
  owner: Owner
  stat: Stat
  av_feature: null
  is_followed: number
  rcmd_reason: RcmdReason
  show_info: number
  track_id: string
  pos: number
  room_info: null
  ogv_info: null
  business_info: null
  is_stock: number
  enable_vt: number
  vt_display: string
}

export enum Goto {
  AV = 'av',
}

export interface Owner {
  mid: number
  name: string
  face: string
}

export interface RcmdReason {
  reason_type: number
  content?: string
}

export interface Stat {
  view: number
  like: number
  danmaku: number
  vt: number
}

interface ForYouRequestParams {
  fresh_idx: number
  ps: number
}

const WEB_RECOMMEND_ENDPOINTS = [
  'https://api.bilibili.com/x/web-interface/wbi/index/top/feed/rcmd',
  'https://api.bilibili.com/x/web-interface/index/top/feed/rcmd',
  'https://api.bilibili.com/x/web-interface/index/top/feed',
  'https://api.bilibili.com/x/web-interface/wbi/index/top/feed',
] as const

export async function getRecommendVideosInPageContext(params: ForYouRequestParams): Promise<forYouResult> {
  const urlParams = new URLSearchParams({
    fresh_idx: `${params.fresh_idx}`,
    ps: `${params.ps}`,
    feed_version: 'V2',
    fresh_type: '4',
    plat: '1',
  })

  let lastResult: forYouResult | null = null
  for (const endpoint of WEB_RECOMMEND_ENDPOINTS) {
    const response = await fetch(`${endpoint}?${urlParams.toString()}`, {
      method: 'GET',
      credentials: 'include',
    })

    const parsed = await parseForYouResponse(response)
    const endpointPath = new URL(endpoint).pathname
    const responseWithEndpoint = parsed.code === 0
      ? parsed
      : { ...parsed, message: `[${endpointPath}] ${parsed.message}` }
    lastResult = responseWithEndpoint

    if (responseWithEndpoint.code === 0)
      return responseWithEndpoint
  }

  return lastResult || {
    code: -1,
    message: 'Web recommendation request failed',
    ttl: 0,
    data: null,
  }
}

async function parseForYouResponse(response: Response): Promise<forYouResult> {
  const responseText = await response.text()

  try {
    const parsedData = JSON.parse(responseText) as forYouResult & { data?: Data | null }
    normalizeForYouItems(parsedData)

    if (typeof parsedData?.code === 'number')
      return parsedData

    return {
      code: response.status || -1,
      message: 'Invalid API response payload',
      ttl: 0,
      data: null,
    }
  }
  catch {
    const preview = responseText.trim().replace(/\s+/g, ' ').slice(0, 120)
    return {
      code: response.status || -1,
      message: preview || `Unexpected non-JSON response (HTTP ${response.status})`,
      ttl: 0,
      data: null,
    }
  }
}

function normalizeForYouItems(payload: forYouResult & { data?: Data | null }) {
  if (!payload || payload.code !== 0 || !payload.data)
    return

  const data = payload.data as Data & { items?: Item[], feed_items?: Item[] }
  if (!Array.isArray(data.item)) {
    if (Array.isArray(data.items))
      data.item = data.items
    else if (Array.isArray(data.feed_items))
      data.item = data.feed_items
    else
      data.item = []
  }
}
