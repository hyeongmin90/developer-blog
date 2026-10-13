import { NotionAPI } from "notion-client"

const notionRequestOptions = {
  gotOptions: {
    headers: {
      "user-agent":
        "Mozilla/5.0 (compatible; DeveloperBlog/1.0; +https://github.com/hyeongmin90/developer-blog)",
    },
  },
}

export const getRecordMap = async (pageId: string) => {
  const api = new NotionAPI()
  const recordMap = await api.getPage(pageId, notionRequestOptions)
  return recordMap
}
