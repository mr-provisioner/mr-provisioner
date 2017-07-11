import { gql } from 'react-apollo'

export const userGQL = gql`
  query($id: Int!) {
    user(id: $id) {
      id
      username
      email
      sshKey
      admin
    }
  }
`

export const usersListGQL = gql`
  {
    users {
      id
      username
      email
      sshKey
      admin
    }
  }
`

export const usersListLimitedGQL = gql`
  {
    users {
      id
      username
    }
  }
`

export const changeUserPasswordGQL = gql`
  mutation changeUserPassword($id: Int!, $password: String!) {
    changeUserPassword(id: $id, password: $password) {
      ok
      errors
      user {
        id
        username
      }
    }
  }
`

export const changeUserInfoGQL = gql`
  mutation changeUserInfo($id: Int!, $username: String!, $email: String!) {
    changeUserInfo(id: $id, username: $username, email: $email) {
      ok
      errors
      user {
        id
        username
      }
    }
  }
`

export const changeUserAdminGQL = gql`
  mutation changeUserAdmin($id: Int!, $admin: Boolean!) {
    changeUserAdmin(id: $id, admin: $admin) {
      ok
      errors
      user {
        id
        username
      }
    }
  }
`

export const deleteUserGQL = gql`
  mutation deleteUser($id: Int!) {
    deleteUser(id: $id) {
      ok
      errors
      user {
        id
        username
      }
    }
  }
`

export const createUserGQL = gql`
  mutation createUser($admin: Boolean!, $username: String!, $email: String!) {
    createUser(admin: $admin, username: $username, email: $email) {
      ok
      errors
      user {
        id
        username
      }
      password
    }
  }
`
