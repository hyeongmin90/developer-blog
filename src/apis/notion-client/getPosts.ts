import { TPost, TPosts, TPostStatus, TPostType } from "src/types"

// Notion's legacy private collection_query response is no longer reliable.
// Query the published blog database through the supported 2025-09-03 data-source API.
// Keep the unofficial client only for rendering individual article record maps.
const NOTION_API_VERSION = "2025-09-03"

type NotionRichText = { plain_text?: string }
type NotionProperty = {
  type?: string
  title?: NotionRichText[]
  rich_text?: NotionRichText[]
  select?: { name: string } | null
  multi_select?: { name: string }[]
  date?: { start: string } | null
  people?: { id: string; name?: string; avatar_url?: string | null }[]
  files?: {
    file?: { url: string }
    external?: { url: string }
  }[]
}

type NotionPage = {
  object: string
  id: string
  created_time: string
  properties: Record<string, NotionProperty>
}

type NotionQueryResponse = {
  results: NotionPage[]
  has_more: boolean
  next_cursor: string | null
}

const plainText = (property?: NotionProperty): string =>
  (property?.title ?? property?.rich_text ?? [])
    .map((part) => part.plain_text ?? "")
    .join("")

async function queryNotion<T>(
  dataSourceId: string,
  token: string,
  cursor?: string
): Promise<T> {
  const response = await fetch(
    `https://api.notion.com/v1/data_sources/${encodeURIComponent(dataSourceId)}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        page_size: 100,
        ...(cursor ? { start_cursor: cursor } : {}),
      }),
    }
  )

  if (!response.ok) {
    // Avoid logging secrets; the status is sufficient to diagnose missing access.
    throw new Error(
      `Notion data-source query failed (HTTP ${response.status}). Check NOTION_API_TOKEN, NOTION_DATA_SOURCE_ID, and the blog database's integration permissions.`
    )
  }

  return (await response.json()) as T
}

function toPost(page: NotionPage): TPost {
  const p = page.properties
  const status = p.status?.select?.name as TPostStatus | undefined
  const type = p.type?.select?.name as TPostType | undefined
  const image = p.thumbnail?.files?.[0]
  const authors = p.author?.people ?? []

  return {
    id: page.id,
    title: plainText(p.title),
    slug: plainText(p.slug),
    summary: plainText(p.summary),
    status: [status ?? "Private"],
    type: [type ?? "Post"],
    category: p.category?.select?.name ? [p.category.select.name] : [],
    tags: (p.tags?.multi_select ?? []).map((tag) => tag.name),
    date: { start_date: p.date?.date?.start ?? page.created_time },
    createdTime: page.created_time,
    fullWidth: false,
    thumbnail: image?.file?.url ?? image?.external?.url,
    author: authors.map((person) => ({
      id: person.id,
      name: person.name ?? "",
      profile_photo: person.avatar_url ?? undefined,
    })),
  }
}

export async function getPosts(): Promise<TPosts> {
  const token = process.env.NOTION_API_TOKEN
  const dataSourceId = process.env.NOTION_DATA_SOURCE_ID

  if (!token || !dataSourceId) {
    throw new Error(
      "Missing NOTION_API_TOKEN or NOTION_DATA_SOURCE_ID. Configure both in Vercel Environment Variables."
    )
  }

  const posts: TPosts = []
  let cursor: string | undefined

  do {
    const result = await queryNotion<NotionQueryResponse>(
      dataSourceId,
      token,
      cursor
    )
    posts.push(
      ...result.results
        .filter((page) => page.object === "page")
        .map(toPost)
    )
    cursor = result.has_more ? result.next_cursor ?? undefined : undefined
  } while (cursor)

  return posts.sort((a, b) => {
    const aTime = new Date(a.date?.start_date || a.createdTime).getTime()
    const bTime = new Date(b.date?.start_date || b.createdTime).getTime()
    return bTime - aTime
  })
}
