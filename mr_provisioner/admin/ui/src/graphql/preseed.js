import { gql } from 'react-apollo'

export const preseedGQL = gql`
  query($id: Int!) {
    preseed(id: $id) {
      id
      filename
      description
      fileType
      fileContent
      knownGood
      public
      user {
        id
        username
      }
      machines {
        id
        name
      }
    }
  }
`

export const preseedsListGQL = gql`
  {
    preseeds {
      id
      filename
      description
      fileType
      knownGood
      public
      user {
        id
        username
      }
    }
  }
`

export const changePreseedMetaGQL = gql`
  mutation changePreseedMeta(
    $id: Int!
    $fileType: String!
    $filename: String!
    $description: String
  ) {
    changePreseedMeta(
      id: $id
      fileType: $fileType
      filename: $filename
      description: $description
    ) {
      ok
      errors
      preseed {
        id
        filename
      }
    }
  }
`

export const changePreseedFlagsGQL = gql`
  mutation changePreseedFlags(
    $id: Int!
    $knownGood: Boolean
    $public: Boolean
  ) {
    changePreseedFlags(id: $id, knownGood: $knownGood, public: $public) {
      ok
      errors
      preseed {
        id
        filename
        description
        knownGood
        public
      }
    }
  }
`

export const changePreseedContentsGQL = gql`
  mutation changePreseedContents($id: Int!, $fileContent: String) {
    changePreseedContents(id: $id, fileContent: $fileContent) {
      ok
      errors
      preseed {
        id
        filename
      }
    }
  }
`

export const deletePreseedGQL = gql`
  mutation deletePreseed($id: Int!) {
    deletePreseed(id: $id) {
      ok
      errors
      preseed {
        id
        filename
      }
    }
  }
`

export const createPreseedGQL = gql`
  mutation createPreseed(
    $filename: String!
    $fileType: String!
    $knownGood: Boolean
    $public: Boolean
    $description: String
    $fileContent: String
  ) {
    createPreseed(
      filename: $filename
      fileType: $fileType
      knownGood: $knownGood
      public: $public
      description: $description
      fileContent: $fileContent
    ) {
      ok
      errors
      preseed {
        id
        filename
      }
    }
  }
`
