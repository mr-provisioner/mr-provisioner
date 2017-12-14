import { gql } from 'react-apollo'

export const imageGQL = gql`
  query($id: Int!) {
    image(id: $id) {
      id
      filename
      description
      fileType
      knownGood
      public
      date
      user {
        id
        username
      }
      machines {
        id
        name
      }
      arch {
        id
        name
      }
    }
  }
`

export const imagesListGQL = gql`
  {
    images {
      id
      filename
      description
      fileType
      knownGood
      public
      date
      user {
        id
        username
      }
      arch {
        id
        name
      }
    }
  }
`

export const changeImageMetaGQL = gql`
  mutation changeImageMeta(
    $id: Int!
    $fileType: String!
    $description: String!
    $archId: Int
  ) {
    changeImageMeta(
      id: $id
      fileType: $fileType
      description: $description
      archId: $archId
    ) {
      ok
      errors
      image {
        id
        filename
      }
    }
  }
`

export const changeImageFlagsGQL = gql`
  mutation changeImageFlags($id: Int!, $knownGood: Boolean, $public: Boolean) {
    changeImageFlags(id: $id, knownGood: $knownGood, public: $public) {
      ok
      errors
      image {
        id
        filename
        description
        knownGood
        public
      }
    }
  }
`

export const deleteImageGQL = gql`
  mutation deleteImage($id: Int!) {
    deleteImage(id: $id) {
      ok
      errors
      image {
        id
        filename
      }
    }
  }
`

export const createImageGQL = gql`
  mutation createImage(
    $fileType: String!
    $knownGood: Boolean
    $public: Boolean
    $description: String
    $archId: Int
  ) {
    createImage(
      fileType: $fileType
      knownGood: $knownGood
      public: $public
      description: $description
      archId: $archId
    ) {
      ok
      errors
      image {
        id
        filename
      }
    }
  }
`
