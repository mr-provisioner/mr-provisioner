import { gql } from 'react-apollo'

export const selfGQL = gql`
  {
    ownUser {
      id
      username
      email
      sshKey
      admin
    }
  }
`

export const ownTokensListGQL = gql`
  {
    tokens {
      id
      token
      desc
    }
  }
`

export const changeOwnPasswordGQL = gql`
  mutation changeOwnPassword($password: String!) {
    changeOwnPassword(password: $password) {
      ok
      errors
    }
  }
`

export const changeOwnSshKeyGQL = gql`
  mutation changeOwnSshKey($sshKey: String) {
    changeOwnSshKey(sshKey: $sshKey) {
      ok
      errors
    }
  }
`

export const deleteOwnTokenGQL = gql`
  mutation deleteOwnToken($id: Int!) {
    deleteOwnToken(id: $id) {
      ok
      errors
    }
  }
`

export const createOwnTokenGQL = gql`
  mutation createOwnToken($desc: String) {
    createOwnToken(desc: $desc) {
      ok
      errors
      token {
        id
        token
        desc
      }
    }
  }
`
