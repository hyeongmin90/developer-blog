// Notion's official API supports both database rows and article content.
// Keep API tokens on the server: never fetch these endpoints from a browser.
export const NOTION_VERSION = "2025-09-03"

export type NotionRichText = {
  plain_text?: string
  href?: string | null
  type?: string
  text?: { content?: string; link?: { url: string } | null }
  mention?: { type?: string; page?: { id: string } }
  annotations?: {
    bold?: boolean
    italic?: boolean
    strikethrough?: boolean
    underline?: boolean
    code?: boolean
  }
}

export type NotionBlock = {
  id: string
  type: string
  has_children: boolean
  children?: NotionBlock[]
  [key: string]: any
}

type BlockList = {
  results: NotionBlock[]
  has_more: boolean
  next_cursor: string | null
}

export async function notionFetch<T>(path: string): Promise<T> {
  const token = process.env.NOTION_API_TOKEN
  if (!token) throw new Error("NOTION_API_TOKEN is not configured")

  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.notion.com/v1/" + path, {
      headers: {
        Authorization: "Bearer " + token,
        "Notion-Version": NOTION_VERSION,
      },
    })

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"))
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? Math.min(retryAfter * 1000, 5000)
        : 700 * (attempt + 1)
      await new Promise((resolve) => setTimeout(resolve, delay))
      continue
    }

    if (!response.ok) {
      throw new Error(
        "Notion API " + path.split("?")[0] + " failed (HTTP " + response.status + ")"
      )
    }

    return (await response.json()) as T
  }

  throw new Error("Notion API retries exhausted")
}

async function childBlocks(parentId: string, depth: number): Promise<NotionBlock[]> {
  if (depth > 8) return []

  const blocks: NotionBlock[] = []
  let cursor: string | null = null
  do {
    const params = new URLSearchParams({ page_size: "100" })
    if (cursor) params.set("start_cursor", cursor)
    const result: BlockList = await notionFetch<BlockList>(
      "blocks/" + encodeURIComponent(parentId) + "/children?" + params.toString()
    )
    blocks.push(...result.results)
    cursor = result.has_more ? result.next_cursor : null
  } while (cursor)

  for (const block of blocks) {
    if (block.has_children && block.type !== "child_database") {
      block.children = await childBlocks(block.id, depth + 1)
    }
  }
  return blocks
}

export async function getBlocks(pageId: string): Promise<NotionBlock[]> {
  return childBlocks(pageId, 0)
}
