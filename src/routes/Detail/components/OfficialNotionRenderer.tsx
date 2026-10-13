import React, { Fragment, ReactNode } from "react"
import styled from "@emotion/styled"
import { NotionBlock, NotionRichText } from "src/apis/notion-client/getBlocks"

type Props = {
  blocks: NotionBlock[]
  postId: string
  pageLinks?: Record<string, string>
}

const normalizeId = (id: string) => id.replace(/-/g, "").toLowerCase()

function localLink(url: string, pageLinks: Record<string, string>): string {
  try {
    const target = new URL(url, "https://local.invalid")
    if (target.hostname === "morethan-log.vercel.app") {
      return target.pathname + target.search + target.hash
    }
    if (target.hostname === "local.invalid" && target.pathname.startsWith("/p/")) {
      const id = target.pathname.match(/[a-f0-9]{32}/i)?.[0]
      if (id && pageLinks[normalizeId(id)]) return "/" + pageLinks[normalizeId(id)]
    }
    if (target.hostname === "local.invalid") return url
    if (target.hostname === "notion.so" || target.hostname.endsWith(".notion.so") ||
        target.hostname === "app.notion.com" || target.hostname.endsWith(".notion.site")) {
      const matches = target.pathname.match(/[a-f0-9]{32}|[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/ig)
      const id = matches?.[matches.length - 1]
      if (id && pageLinks[normalizeId(id)]) return "/" + pageLinks[normalizeId(id)]
    }
    return url
  } catch {
    return url
  }
}

function Rich({
  items,
  pageLinks,
}: {
  items?: NotionRichText[]
  pageLinks: Record<string, string>
}) {
  return (
    <>
      {(items ?? []).map((item, i) => {
        let node: ReactNode = item.plain_text ?? item.text?.content ?? ""
        const a = item.annotations
        if (a?.code) node = <code>{node}</code>
        if (a?.bold) node = <strong>{node}</strong>
        if (a?.italic) node = <em>{node}</em>
        if (a?.strikethrough) node = <del>{node}</del>
        if (a?.underline) node = <u>{node}</u>
        const href = item.href ?? item.text?.link?.url
        if (href) {
          const link = localLink(href, pageLinks)
          node = <a href={link} rel={/^https?:\/\//.test(link) ? "noopener noreferrer" : undefined}>{node}</a>
        } else if (item.mention?.type === "page" && item.mention.page?.id) {
          const slug = pageLinks[normalizeId(item.mention.page.id)]
          if (slug) node = <a href={"/" + slug}>{node}</a>
        }
        return <Fragment key={i}>{node}</Fragment>
      })}
    </>
  )
}

function Blocks({ blocks, postId, pageLinks }: Props) {
  const child = (block: NotionBlock) =>
    block.children?.length ? (
      <Blocks blocks={block.children} postId={postId} pageLinks={pageLinks} />
    ) : null

  const rich = (items?: NotionRichText[]) => <Rich items={items} pageLinks={pageLinks || {}} />

  const imageUrl = (id: string) =>
    "/api/notion-image?postId=" + encodeURIComponent(postId) +
    "&blockId=" + encodeURIComponent(id)

  return (
    <>
      {blocks.map((block) => {
        const data = block[block.type] || {}
        const value = data.rich_text as NotionRichText[] | undefined
        const content = rich(value)
        let element: ReactNode

        switch (block.type) {
          case "paragraph":
            element = <p>{content}</p>
            break
          case "heading_1":
            element = <h1 id={block.id}>{content}</h1>
            break
          case "heading_2":
            element = <h2 id={block.id}>{content}</h2>
            break
          case "heading_3":
            element = <h3 id={block.id}>{content}</h3>
            break
          case "bulleted_list_item":
            element = <ul><li>{content}{child(block)}</li></ul>
            break
          case "numbered_list_item":
            element = <ol><li>{content}{child(block)}</li></ol>
            break
          case "to_do":
            element = <label className="todo"><input type="checkbox" disabled checked={!!data.checked} /> {content}</label>
            break
          case "quote":
            element = <blockquote>{content}{child(block)}</blockquote>
            break
          case "callout":
            element = <aside className="callout"><span>{data.icon?.emoji || "💡"}</span><div>{content}{child(block)}</div></aside>
            break
          case "code":
            element = <pre><code data-language={data.language}>{(value || []).map(x => x.plain_text ?? x.text?.content ?? "").join("")}</code></pre>
            break
          case "image":
            element = <figure><img src={imageUrl(block.id)} alt={(data.caption || []).map((x: NotionRichText) => x.plain_text).join("") || "Notion image"} loading="lazy" /><figcaption>{rich(data.caption)}</figcaption></figure>
            break
          case "divider":
            element = <hr />
            break
          case "toggle":
            element = <details><summary>{content}</summary>{child(block)}</details>
            break
          case "bookmark":
          case "link_preview":
          case "embed":
            element = <p><a href={localLink(data.url || "#", pageLinks || {})}>{data.url || "External link"}</a></p>
            break
          case "file":
          case "pdf":
            element = <p><a href={imageUrl(block.id)} target="_blank" rel="noopener noreferrer">파일 열기: {data.name || block.type.toUpperCase()}</a></p>
            break
          case "video":
            element = <p><a href={imageUrl(block.id)} target="_blank" rel="noopener noreferrer">영상 열기</a></p>
            break
          case "equation":
            element = <pre className="equation">{data.expression}</pre>
            break
          case "table":
            element = <div className="table-scroll"><table><tbody>{child(block)}</tbody></table></div>
            break
          case "table_row":
            element = <tr>{(data.cells || []).map((cell: NotionRichText[], i: number) => <td key={i}>{rich(cell)}</td>)}</tr>
            break
          case "column_list":
            element = <div className="columns">{child(block)}</div>
            break
          case "column":
            element = <div className="column">{child(block)}</div>
            break
          case "synced_block":
            element = child(block)
            break
          case "child_page": {
            const slug = (pageLinks || {})[normalizeId(block.id)]
            element = <p><a href={slug ? "/" + slug : "https://www.notion.so/" + normalizeId(block.id)}>{data.title || "하위 페이지"}</a></p>
            break
          }
          case "table_of_contents":
            element = null
            break
          default:
            element = <>{content}{child(block)}</>
        }
        return <Fragment key={block.id}>{element}</Fragment>
      })}
    </>
  )
}

export default function OfficialNotionRenderer({
  blocks,
  postId,
  pageLinks = {},
}: Props) {
  return (
    <StyledWrapper>
      <Blocks blocks={blocks} postId={postId} pageLinks={pageLinks} />
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  line-height: 1.85;
  overflow-wrap: anywhere;
  p, ul, ol, blockquote, pre, figure, details { margin: 0.8rem 0 1.2rem; }
  h1, h2, h3 { color: inherit; font-weight: 700; line-height: 1.4; scroll-margin-top: 6rem; }
  h1 { font-size: 1.8rem; margin: 2.4rem 0 1rem; }
  h2 { font-size: 1.5rem; margin: 2.1rem 0 0.8rem; }
  h3 { font-size: 1.2rem; margin: 1.8rem 0 0.7rem; }
  a { text-decoration: underline; text-underline-offset: 3px; }
  ul, ol { padding-left: 1.5rem; }
  li { padding-left: 0.25rem; }
  li > ul, li > ol { margin: 0.25rem 0; }
  blockquote { border-left: 3px solid #8b949e; padding: 0.3rem 1rem; opacity: 0.9; }
  .callout { display: flex; gap: 0.75rem; border-radius: 0.65rem; background: rgba(127,127,127,0.12); padding: 1rem; margin: 1rem 0; }
  pre { overflow-x: auto; padding: 1rem; border-radius: 0.65rem; background: #161b22; color: #e6edf3; line-height: 1.55; font-size: 0.9rem; }
  :not(pre) > code { background: rgba(127,127,127,0.17); border-radius: 0.25rem; padding: 0.12rem 0.3rem; font-size: 0.92em; }
  figure img { display: block; max-width: 100%; height: auto; border-radius: 0.65rem; }
  figcaption { color: #8b949e; font-size: 0.82rem; text-align: center; }
  .table-scroll { overflow-x: auto; margin: 1.2rem 0; }
  table { width: 100%; border-collapse: collapse; }
  td { border: 1px solid #7775; padding: 0.5rem 0.7rem; }
  .todo { display: block; margin: 0.6rem 0; }
  .columns { display: flex; gap: 1.2rem; }
  .column { flex: 1; min-width: 0; }
  hr { margin: 2rem 0; opacity: 0.3; }
  @media(max-width: 640px) { .columns { display: block; } }
`;
