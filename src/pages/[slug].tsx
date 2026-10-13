import Detail from "src/routes/Detail"
import { filterPosts } from "src/libs/utils/notion"
import { CONFIG } from "site.config"
import { NextPageWithLayout } from "../types"
import CustomError from "src/routes/Error"
import { getPosts } from "src/apis"
import { getBlocks } from "src/apis/notion-client/getBlocks"
import MetaConfig from "src/components/MetaConfig"
import { GetStaticProps } from "next"
import { QueryClient, dehydrate } from "@tanstack/react-query"
import { queryKey } from "src/constants/queryKey"
import usePostQuery from "src/hooks/usePostQuery"
import { FilterPostsOptions } from "src/libs/utils/notion/filterPosts"

const filter: FilterPostsOptions = {
  acceptStatus: ["Public", "PublicOnDetail"],
  acceptType: ["Paper", "Post", "Page"],
}

// Generate post pages on demand; avoid hitting Notion's rate limit during every build.
export const getStaticPaths = async () => ({
  paths: [],
  fallback: "blocking" as const,
})

export const getStaticProps: GetStaticProps = async (context) => {
  const slug = context.params?.slug
  if (typeof slug !== "string") return { notFound: true }

  const posts = await getPosts()
  const detailPosts = filterPosts(posts, filter)
  const postDetail = detailPosts.find((post) => post.slug === slug)
  if (!postDetail) return { notFound: true, revalidate: 300 }

  const blocks = await getBlocks(postDetail.id)
  const pageLinks = Object.fromEntries(
    detailPosts.map((post) => [post.id.replace(/-/g, "").toLowerCase(), post.slug])
  )
  const client = new QueryClient()
  client.setQueryData(queryKey.posts(), filterPosts(posts))
  client.setQueryData(queryKey.post(slug), { ...postDetail, blocks, pageLinks })

  return {
    props: { dehydratedState: dehydrate(client) },
    revalidate: 300,
  }
}

const DetailPage: NextPageWithLayout = () => {
  const post = usePostQuery()
  if (!post) return <CustomError />

  const image = post.thumbnail
    ? (post.thumbnail.startsWith("/") ? CONFIG.link + post.thumbnail : post.thumbnail)
    : `${CONFIG.ogImageGenerateURL}/${encodeURIComponent(post.title)}.png`

  const date = post.date?.start_date || post.createdTime || ""
  const meta = {
    title: post.title,
    date: new Date(date).toISOString(),
    image,
    description: post.summary || "",
    type: post.type[0],
    url: `${CONFIG.link}/${post.slug}`,
  }

  return (
    <>
      <MetaConfig {...meta} />
      <Detail />
    </>
  )
}

DetailPage.getLayout = (page) => <>{page}</>
export default DetailPage
