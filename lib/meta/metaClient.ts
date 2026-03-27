const GRAPH_BASE = "https://graph.facebook.com/v19.0";
const GRAPH_PREVIEW_BASE = "https://graph.facebook.com/v25.0";

/** Ad formats supported by Meta preview API */
export type MetaAdPreviewFormat =
  | "DESKTOP_FEED_STANDARD"
  | "MOBILE_FEED_STANDARD"
  | "INSTAGRAM_EXPLORE_GRID_HOME"
  | "INSTAGRAM_SEARCH_CHAIN"
  | "FACEBOOK_STORY_MOBILE"
  | "RIGHT_COLUMN_STANDARD";

function upgradeFbCdnImageUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/fbcdn\.net|facebook\.com/.test(trimmed) && (/\b64x64\b|p64x64/.test(trimmed))) {
    return trimmed
      .replace(/\/p64x64\//g, "/p1080x1080/")
      .replace(/\b64x64\b/g, "1080x1080");
  }
  return trimmed;
}

export interface MetaAdAccount {
  id: string;
  name: string;
  account_id?: string;
}

export interface MetaAdAccountsResponse {
  data: MetaAdAccount[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
  error?: { message: string; type: string; code: number };
}

export interface MetaInsightRow {
  date_start: string;
  date_stop: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  inline_link_clicks?: string;
  reach?: string;
  ctr?: string;
  cpc?: string;
  actions?: Array<{ action_type: string; value: string }>;
  action_values?: Array<{ action_type: string; value: string }>;
}

export interface MetaInsightsResponse {
  data: MetaInsightRow[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
  error?: { message: string; type: string; code: number };
}

export interface MetaAdCreative {
  id: string;
  object_story_id?: string;
  thumbnail_url?: string;
  image_url?: string;
  image_url_full?: string;
  image_hash?: string;
  video_id?: string;
  video_source_url?: string;
  video_picture_url?: string;
  video_embed_html?: string;
  body?: string;
  title?: string;
  object_story_spec?: {
    link_data?: {
      image_hash?: string;
      image_url?: string;
      picture?: string;
      child_attachments?: Array<{
        image_hash?: string;
        image_url?: string;
        picture?: string;
        video_id?: string;
      }>;
    };
    photo_data?: { image_hash?: string; url?: string };
    video_data?: { image_url?: string; thumbnail_url?: string; video_id?: string };
  };
  asset_feed_spec?: {
    videos?: Array<{ video_id?: string; thumbnail_url?: string; image_url?: string }>;
    images?: Array<{ hash?: string; url?: string }>;
  };
}

export interface MetaAdInsight {
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
}

export interface MetaAd {
  id: string;
  name: string;
  effective_status?: string;
  adset?: { campaign?: { objective?: string } };
  adcreatives?: { data: MetaAdCreative[] };
  insights?: { data: MetaAdInsight[] };
}

export interface MetaAdsResponse {
  data: MetaAd[];
  paging?: {
    cursors?: { before: string; after: string };
    next?: string;
    previous?: string;
  };
  error?: { message: string; type: string; code: number };
}

function ensureActPrefix(accountId: string): string {
  if (accountId.startsWith("act_")) return accountId;
  return `act_${accountId}`;
}

/**
 * Fetch all ad accounts the token has access to.
 */
export async function fetchAdAccounts(token: string): Promise<MetaAdAccount[]> {
  const all: MetaAdAccount[] = [];
  const fields = "id,name,account_id";
  let url: string | null = `${GRAPH_BASE}/me/adaccounts?access_token=${encodeURIComponent(token)}&fields=${encodeURIComponent(fields)}`;

  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as MetaAdAccountsResponse;
    if (!res.ok) {
      throw new Error(data?.error?.message ?? `Meta API error: ${res.status}`);
    }
    if (data.error) {
      throw new Error(data.error.message);
    }
    if (data.data?.length) {
      all.push(...data.data);
    }
    url = data.paging?.next ?? null;
  }

  return all;
}

/**
 * Fetch account-level insights broken down by day.
 * @param accountId - e.g. act_237828749660910 or 237828749660910
 * @param token - Meta access token
 * @param dateFrom - YYYY-MM-DD
 * @param dateTo - YYYY-MM-DD
 */
export async function fetchAccountInsights(
  accountId: string,
  token: string,
  dateFrom: string,
  dateTo: string
): Promise<MetaInsightsResponse> {
  const actId = ensureActPrefix(accountId);
  const params = new URLSearchParams({
    access_token: token,
    level: "account",
    fields: "spend,impressions,clicks,inline_link_clicks,reach,ctr,cpc,actions,action_values",
    time_increment: "1",
    limit: "100",
    "time_range": JSON.stringify({ since: dateFrom, until: dateTo }),
  });

  const all: MetaInsightRow[] = [];
  let url: string | null = `${GRAPH_BASE}/${actId}/insights?${params.toString()}`;

  while (url) {
    const res = await fetch(url);
    const data = (await res.json()) as MetaInsightsResponse;
    if (!res.ok) {
      throw new Error(data?.error?.message ?? `Meta API error: ${res.status}`);
    }
    if (data.error) {
      throw new Error(data.error.message);
    }
    if (data.data?.length) {
      all.push(...data.data);
    }
    url = data.paging?.next ?? null;
  }

  return { data: all };
}

async function fetchAdImagesByHash(
  accountId: string,
  hashes: string[],
  token: string
): Promise<Map<string, string>> {
  if (hashes.length === 0) return new Map();
  try {
    const actId = ensureActPrefix(accountId);
    const hashesParam = JSON.stringify(hashes);
    const url = `${GRAPH_BASE}/${actId}/adimages?access_token=${encodeURIComponent(token)}&hashes=${encodeURIComponent(hashesParam)}&fields=hash,url,permalink_url,original_width,original_height`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      data?: Array<{ hash?: string; url?: string; permalink_url?: string }>;
      images?: Record<string, { hash?: string; url?: string; permalink_url?: string }>;
      error?: { message: string };
    };
    if (data.error) return new Map();
    const map = new Map<string, string>();
    if (Array.isArray(data.data)) {
      for (const img of data.data) {
        const h = img.hash;
        const urlFull = img.url || img.permalink_url;
        if (h && urlFull) map.set(h, urlFull);
      }
    }
    if (data.images && typeof data.images === "object") {
      for (const [key, img] of Object.entries(data.images)) {
        const h = img?.hash ?? key;
        const urlFull = img?.url || img?.permalink_url;
        if (h && urlFull) map.set(h, urlFull);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Fetch creative by ID with full fields. Used when nested ads response
 * returns incomplete object_story_spec/asset_feed_spec (common for video_id).
 */
async function fetchCreativeDetails(
  creativeId: string,
  token: string
): Promise<Partial<MetaAdCreative> | null> {
  try {
    const url = `${GRAPH_BASE}/${creativeId}?access_token=${encodeURIComponent(token)}&fields=image_hash,thumbnail_url,object_story_spec,asset_feed_spec{videos{video_id,thumbnail_url},images{hash,url}}`;
    const res = await fetch(url);
    const data = (await res.json()) as Partial<MetaAdCreative> & { error?: { message: string } };
    if (data.error) return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Fetch ad preview iframe HTML from Meta preview API.
 * Uses creative_id or ad_id. Requires user access token (not page token).
 * @returns The body HTML (iframe) of the first preview, or null on error
 */
export async function fetchCreativePreview(
  creativeOrAdId: string,
  token: string,
  adFormat: MetaAdPreviewFormat = "DESKTOP_FEED_STANDARD"
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      ad_format: adFormat,
      access_token: token,
    });
    const url = `${GRAPH_PREVIEW_BASE}/${creativeOrAdId}/previews?${params.toString()}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      data?: Array<{ body?: string }>;
      error?: { message: string };
    };
    if (data.error || !res.ok) return null;
    const body = data.data?.[0]?.body;
    return typeof body === "string" && body.trim() ? body : null;
  } catch {
    return null;
  }
}

/**
 * Fallback: fetch video thumbnail via /picture endpoint (Graph API).
 * Returns ProfilePictureSource url when main video fields don't include picture.
 * @see https://developers.facebook.com/docs/graph-api/reference/video/picture/
 */
async function fetchVideoPictureFallback(
  videoId: string,
  token: string
): Promise<string | null> {
  try {
    const url = `${GRAPH_BASE}/${videoId}/picture?access_token=${encodeURIComponent(token)}&redirect=0&width=480&height=480`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      data?: Array<{ url?: string; width?: number; height?: number }>;
      error?: { message: string };
    };
    if (data.error) return null;
    const first = data.data?.[0];
    return first?.url ?? null;
  } catch {
    return null;
  }
}

async function fetchVideoDetails(
  videoId: string,
  token: string
): Promise<{ source: string | null; picture: string | null; embedHtml: string | null }> {
  try {
    const url = `${GRAPH_BASE}/${videoId}?access_token=${encodeURIComponent(token)}&fields=source,picture,thumbnails,embed_html,format{picture,width,height,embed_html}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      source?: string;
      picture?: string | { data?: { url?: string } };
      thumbnails?: { data?: Array<{ uri?: string; width?: number; height?: number }> };
      embed_html?: string;
      format?: Array<{ picture?: string; width?: number; height?: number; embed_html?: string }>;
      error?: { message: string };
    };
    if (data.error) return { source: null, picture: null, embedHtml: null };
    let pictureUrl =
      typeof data.picture === "string"
        ? data.picture
        : (data.picture as { data?: { url?: string } })?.data?.url ?? null;
    let embedHtml = data.embed_html ?? null;
    if (data.format?.length) {
      const largest = data.format.reduce((best, f) => {
        const area = (f.width ?? 0) * (f.height ?? 0);
        const bestArea = (best.width ?? 0) * (best.height ?? 0);
        return area > bestArea ? f : best;
      });
      if (largest.picture) pictureUrl = largest.picture;
      if (!embedHtml && largest.embed_html) embedHtml = largest.embed_html;
    }
    if (!pictureUrl && data.thumbnails?.data?.length) {
      const largestThumb = data.thumbnails.data.reduce((best, thumb) => {
        const area = (thumb.width ?? 0) * (thumb.height ?? 0);
        const bestArea = (best.width ?? 0) * (best.height ?? 0);
        return area > bestArea ? thumb : best;
      });
      if (largestThumb.uri) pictureUrl = largestThumb.uri;
    }
    if (!pictureUrl) {
      pictureUrl = await fetchVideoPictureFallback(videoId, token);
    }
    return { source: data.source ?? null, picture: pictureUrl, embedHtml };
  } catch {
    return { source: null, picture: null, embedHtml: null };
  }
}

const DELIVERY_ACTIVE_STATUSES = ["ACTIVE", "IN_PROCESS"] as const;

const PAGE_COVER_OBJECTIVES = ["PAGE_LIKES", "OUTCOME_PAGE_LIKES"];

function isPageCoverOrLikeAd(ad: MetaAd): boolean {
  const objective = ad.adset?.campaign?.objective;
  if (objective && PAGE_COVER_OBJECTIVES.includes(objective)) return true;
  const name = (ad.name || "").toLowerCase();
  if (/capa|cover|curtir\s*página|like\s*page|page\s*like/.test(name)) return true;
  return false;
}

function getCreativeVideoId(creative?: MetaAdCreative): string | undefined {
  return (
    creative?.video_id ||
    creative?.object_story_spec?.video_data?.video_id ||
    creative?.object_story_spec?.link_data?.child_attachments?.find((child) => !!child.video_id)?.video_id ||
    creative?.asset_feed_spec?.videos?.[0]?.video_id
  );
}

function hasDedicatedCreativePayload(creative?: MetaAdCreative): boolean {
  if (!creative) return false;
  return Boolean(
    creative.image_url ||
      creative.image_hash ||
      creative.thumbnail_url ||
      getCreativeVideoId(creative) ||
      creative.object_story_spec?.link_data?.image_hash ||
      creative.object_story_spec?.link_data?.image_url ||
      creative.object_story_spec?.link_data?.child_attachments?.length ||
      creative.object_story_spec?.photo_data?.image_hash ||
      creative.object_story_spec?.photo_data?.url ||
      creative.object_story_spec?.video_data?.image_url ||
      creative.object_story_spec?.video_data?.thumbnail_url ||
      creative.asset_feed_spec?.images?.length ||
      creative.asset_feed_spec?.videos?.length
  );
}

function collectCreativeImageHashes(creative?: MetaAdCreative): string[] {
  if (!creative) return [];
  const hashes = new Set<string>();
  if (creative.image_hash) hashes.add(creative.image_hash);
  if (creative.object_story_spec?.link_data?.image_hash) {
    hashes.add(creative.object_story_spec.link_data.image_hash);
  }
  if (creative.object_story_spec?.photo_data?.image_hash) {
    hashes.add(creative.object_story_spec.photo_data.image_hash);
  }
  for (const child of creative.object_story_spec?.link_data?.child_attachments ?? []) {
    if (child.image_hash) hashes.add(child.image_hash);
  }
  for (const img of creative.asset_feed_spec?.images ?? []) {
    if (img.hash) hashes.add(img.hash);
  }
  return Array.from(hashes);
}

function resolveCreativeImageUrl(
  creative: MetaAdCreative,
  imageUrlsByHash: Map<string, string>
): string | null {
  for (const hash of collectCreativeImageHashes(creative)) {
    const fromHash = imageUrlsByHash.get(hash);
    if (fromHash) return fromHash;
  }

  return (
    creative.image_url ||
    creative.object_story_spec?.link_data?.image_url ||
    creative.object_story_spec?.video_data?.image_url ||
    creative.object_story_spec?.photo_data?.url ||
    creative.object_story_spec?.link_data?.child_attachments?.find((child) => !!child.image_url)?.image_url ||
    creative.object_story_spec?.link_data?.picture ||
    creative.object_story_spec?.link_data?.child_attachments?.find((child) => !!child.picture)?.picture ||
    creative.asset_feed_spec?.images?.[0]?.url ||
    creative.asset_feed_spec?.videos?.[0]?.image_url ||
    creative.thumbnail_url ||
    null
  );
}

function resolveCreativePosterUrl(creative: MetaAdCreative): string | null {
  return (
    creative.video_picture_url ||
    creative.object_story_spec?.video_data?.thumbnail_url ||
    creative.object_story_spec?.video_data?.image_url ||
    creative.object_story_spec?.link_data?.child_attachments?.find((child) => !!child.image_url)?.image_url ||
    creative.object_story_spec?.link_data?.child_attachments?.find((child) => !!child.picture)?.picture ||
    creative.object_story_spec?.link_data?.image_url ||
    creative.object_story_spec?.link_data?.picture ||
    creative.asset_feed_spec?.videos?.[0]?.thumbnail_url ||
    creative.asset_feed_spec?.videos?.[0]?.image_url ||
    creative.asset_feed_spec?.images?.[0]?.url ||
    creative.thumbnail_url ||
    null
  );
}

/**
 * Fetch all ads with creatives and insights, following paging.next.
 * Only returns ads with status de veiculação ativo: ACTIVE (inclui em aprendizado e
 * aprendizado limitado) ou IN_PROCESS. Exclui desativados (PAUSED, DELETED, etc.).
 * Exclui anúncios que promovem publicações existentes (object_story_id) — somente
 * criativos de anúncios dedicados (link_data, photo_data, video_data).
 * Enriches creatives with video_source_url when video_id is present.
 */
export async function fetchAdsWithCreatives(
  accountId: string,
  token: string,
  options?: { maxPages?: number; dateFrom?: string; dateTo?: string }
): Promise<MetaAd[]> {
  const actId = ensureActPrefix(accountId);
  const maxPages = options?.maxPages ?? 50;
  const allAds: MetaAd[] = [];
  const insightsField =
    options?.dateFrom && options?.dateTo
      ? `insights.time_range(${JSON.stringify({
          since: options.dateFrom,
          until: options.dateTo,
        })}){spend,impressions,clicks,ctr,cpc}`
      : "insights{spend,impressions,clicks,ctr,cpc}";
  const fields =
    `id,name,effective_status,adset{campaign{objective}},adcreatives{id,object_story_id,thumbnail_url,image_hash,video_id,body,title,object_story_spec,asset_feed_spec{videos{video_id,thumbnail_url},images{hash,url}}},${insightsField}`;
  const filtering = JSON.stringify([
    { field: "effective_status", operator: "IN", value: [...DELIVERY_ACTIVE_STATUSES] },
  ]);
  let url: string | null = `${GRAPH_BASE}/${actId}/ads?access_token=${encodeURIComponent(token)}&fields=${encodeURIComponent(fields)}&filtering=${encodeURIComponent(filtering)}&limit=100`;

  for (let page = 0; page < maxPages && url; page++) {
    const res = await fetch(url);
    const data = (await res.json()) as MetaAdsResponse;
    if (!res.ok) {
      throw new Error(data?.error?.message ?? `Meta API error: ${res.status}`);
    }
    if (data.error) {
      throw new Error(data.error.message);
    }
    if (data.data?.length) {
      for (const ad of data.data) {
        const status = ad.effective_status;
        if (!status || !(DELIVERY_ACTIVE_STATUSES as readonly string[]).includes(status)) continue;
        const creative = ad.adcreatives?.data?.[0];
        if (!creative) continue;
        if (creative.object_story_id) continue;
        if (isPageCoverOrLikeAd(ad)) continue;
        if (!hasDedicatedCreativePayload(creative)) continue;
        allAds.push(ad);
      }
    }
    url = data.paging?.next ?? null;
  }

  const creativeIdsToEnrich = new Set<string>();
  for (const ad of allAds) {
    const creative = ad.adcreatives?.data?.[0];
    if (!creative?.id) continue;
    const videoId = getCreativeVideoId(creative);
    const looksLikeVideoAd =
      !!creative.object_story_spec?.video_data ||
      !!creative.asset_feed_spec?.videos?.length ||
      !!creative.video_id;
    if (looksLikeVideoAd && !videoId) creativeIdsToEnrich.add(creative.id);
  }

  if (creativeIdsToEnrich.size > 0) {
    const enriched = await Promise.all(
      Array.from(creativeIdsToEnrich).map(async (cid) => {
        const details = await fetchCreativeDetails(cid, token);
        return [cid, details] as const;
      })
    );
    const enrichedMap = new Map(enriched.filter(([, d]) => d != null) as [string, Partial<MetaAdCreative>][]);
    for (const ad of allAds) {
      const creative = ad.adcreatives?.data?.[0];
      if (!creative?.id) continue;
      const details = enrichedMap.get(creative.id);
      if (!details) continue;
      Object.assign(creative, {
        image_hash: creative.image_hash || details.image_hash,
        thumbnail_url: creative.thumbnail_url || details.thumbnail_url,
        object_story_spec: { ...creative.object_story_spec, ...details.object_story_spec },
        asset_feed_spec: creative.asset_feed_spec || details.asset_feed_spec,
      });
    }
  }

  const videoIds = new Set<string>();
  for (const ad of allAds) {
    const creative = ad.adcreatives?.data?.[0];
    const videoId = getCreativeVideoId(creative);
    if (videoId) videoIds.add(videoId);
  }

  const videoDetails = new Map<
    string,
    { source: string | null; picture: string | null; embedHtml: string | null }
  >();
  if (videoIds.size > 0) {
    const results = await Promise.all(
      Array.from(videoIds).map(async (vid) => {
        const details = await fetchVideoDetails(vid, token);
        return [vid, details] as const;
      })
    );
    for (const [vid, details] of results) videoDetails.set(vid, details);
  }

  for (const ad of allAds) {
    const creative = ad.adcreatives?.data?.[0];
    if (!creative) continue;
    const c = creative as MetaAdCreative & {
      video_source_url?: string;
      video_picture_url?: string;
      video_embed_html?: string;
    };
    const videoId = getCreativeVideoId(creative);
    if (videoId) c.video_id = videoId;
    if (videoId && videoDetails.has(videoId)) {
      const { source, picture, embedHtml } = videoDetails.get(videoId)!;
      if (source) c.video_source_url = source;
      if (picture) c.video_picture_url = picture;
      if (embedHtml) c.video_embed_html = embedHtml;
    }
    if (!c.video_picture_url) {
      const fallbackPoster = resolveCreativePosterUrl(creative);
      if (fallbackPoster) c.video_picture_url = fallbackPoster;
    }
  }

  const imageHashes = new Set<string>();
  for (const ad of allAds) {
    const creative = ad.adcreatives?.data?.[0];
    if (!creative) continue;
    for (const hash of collectCreativeImageHashes(creative)) {
      imageHashes.add(hash);
    }
  }

  const imageUrlsByHash = imageHashes.size > 0
    ? await fetchAdImagesByHash(actId, Array.from(imageHashes), token)
    : new Map<string, string>();

  for (const ad of allAds) {
    const creative = ad.adcreatives?.data?.[0];
    if (!creative) continue;
    const resolvedImageUrl = resolveCreativeImageUrl(creative, imageUrlsByHash);
    if (resolvedImageUrl) {
      const upgraded = upgradeFbCdnImageUrl(resolvedImageUrl) || resolvedImageUrl;
      (creative as MetaAdCreative).image_url_full = upgraded;
    }
    if (!creative.video_picture_url) {
      const fallbackPoster = resolveCreativePosterUrl(creative);
      if (fallbackPoster) (creative as MetaAdCreative).video_picture_url = fallbackPoster;
    }
  }

  return allAds;
}
