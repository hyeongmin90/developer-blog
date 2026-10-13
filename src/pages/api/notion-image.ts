import type { NextApiRequest, NextApiResponse } from "next"
import { notionFetch, NotionBlock } from "src/apis/notion-client/getBlocks"

type NotionPage = {
  id: string
  parent: { type: string; data_source_id?: string; database_id?: string }
  properties: {
    status?: { select?: { name?: string } | null }
    thumbnail?: { files?: Array<{ file?: { url: string }; external?: { url: string } }> }
  }
}

const validId = (id: string) => /^[0-9a-f]{32}$|^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
const normalized = (id?: string) => (id || "").replace(/-/g, "").toLowerCase()

// Check all ancestors so a guessed private block ID cannot expose its image.
async function belongsToPage(block: NotionBlock, pageId: string): Promise<boolean> {
  let parent = block.parent as { type: string; page_id?: string; block_id?: string }
  for (let depth = 0; depth < 12; depth++) {
    if (parent?.type === "page_id") {
      return normalized(parent.page_id) === normalized(pageId)
    }
    if (parent?.type !== "block_id" || !parent.block_id) return false
    const ancestor = await notionFetch<NotionBlock>(
      "blocks/" + encodeURIComponent(parent.block_id)
    )
    parent = ancestor.parent
  }
  return false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") return res.status(405).end()
  const postId = typeof req.query.postId === "string" ? req.query.postId : ""
  const blockId = typeof req.query.blockId === "string" ? req.query.blockId : ""
  if (!validId(postId) || (blockId && !validId(blockId))) {
    return res.status(400).end()
  }

  try {
    const page = await notionFetch<NotionPage>("pages/" + encodeURIComponent(postId))
    const dataSourceId = process.env.NOTION_DATA_SOURCE_ID
    const parentId = page.parent?.data_source_id ?? page.parent?.database_id
    const status = page.properties?.status?.select?.name
    // Database parents are accepted for compatibility with older Notion API variants.
    const databasePageId = process.env.NOTION_PAGE_ID
    const isBlogRow =
      normalized(parentId) === normalized(dataSourceId) ||
      normalized(parentId) === normalized(databasePageId)
    if (!isBlogRow || !["Public", "PublicOnDetail"].includes(status || "")) {
      return res.status(404).end()
    }

    let url: string | undefined
    if (blockId) {
      const block = await notionFetch<NotionBlock>("blocks/" + encodeURIComponent(blockId))
      if (!(await belongsToPage(block, postId))) return res.status(404).end()
      const media = block[block.type] as
        | { file?: { url: string }; external?: { url: string } }
        | undefined
      if (!["image", "file", "pdf", "video"].includes(block.type)) {
        return res.status(404).end()
      }
      url = media?.file?.url ?? media?.external?.url
    } else {
      const image = page.properties?.thumbnail?.files?.[0]
      url = image?.file?.url ?? image?.external?.url
    }

    if (!url || !/^https:\/\//i.test(url)) return res.status(404).end()
    // Notion's signed S3 URLs expire after a few minutes. Redirect to a fresh
    // URL instead of embedding the short-lived signature in static HTML.
    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=90")
    res.setHeader("Location", url)
    return res.status(302).end()
  } catch (error) {
    console.error("Notion image lookup failed:", error)
    return res.status(502).end()
  }
}
