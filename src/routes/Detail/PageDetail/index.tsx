import React from "react"
import styled from "@emotion/styled"
import OfficialNotionRenderer from "../components/OfficialNotionRenderer"
import usePostQuery from "src/hooks/usePostQuery"
type Props = {}

const PageDetail: React.FC<Props> = () => {
  const data = usePostQuery()

  if (!data) return null
  return (
    <StyledWrapper>
      <OfficialNotionRenderer blocks={data.blocks} postId={data.id} pageLinks={data.pageLinks} />
    </StyledWrapper>
  )
}

export default PageDetail

const StyledWrapper = styled.div`
  margin: 0 auto;
  max-width: 56rem;
`
