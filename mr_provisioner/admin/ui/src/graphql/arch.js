import { gql } from 'react-apollo'

export const archsListGQL = gql`
  {
    archs {
      id
      name
      description
      subarchs {
        efiboot
        id
        name
      }
    }
  }
`

export const archGQL = gql`
  query($id: Int!) {
    arch(id: $id) {
      id
      name
      description
      subarchs {
        id
        name
        description
        efiboot
        bootloader {
          id
          filename
          description
        }
      }
      machines {
        id
        name
      }
    }
  }
`

export const createArchGQL = gql`
  mutation createArch($name: String!, $description: String) {
    createArch(name: $name, description: $description) {
      ok
      errors
      arch {
        id
        name
      }
    }
  }
`

export const changeArchGQL = gql`
  mutation changeArch($id: Int!, $name: String!, $description: String) {
    changeArch(id: $id, name: $name, description: $description) {
      ok
      errors
      arch {
        id
        name
      }
    }
  }
`

export const deleteArchGQL = gql`
  mutation deleteArch($id: Int!) {
    deleteArch(id: $id) {
      ok
      errors
      arch {
        id
        name
      }
    }
  }
`

export const createSubarchGQL = gql`
  mutation createSubarch(
    $archId: Int!
    $name: String!
    $description: String
    $bootloaderId: Int
    $efiboot: Boolean
  ) {
    createSubarch(
      archId: $archId
      name: $name
      description: $description
      bootloaderId: $bootloaderId
      efiboot: $efiboot
    ) {
      ok
      errors
      subarch {
        id
        name
        efiboot
        arch {
          id
          name
        }
      }
    }
  }
`

export const changeSubarchGQL = gql`
  mutation changeSubarch(
    $id: Int!
    $name: String!
    $description: String
    $bootloaderId: Int
    $efiboot: Boolean
  ) {
    changeSubarch(
      id: $id
      name: $name
      description: $description
      bootloaderId: $bootloaderId
      efiboot: $efiboot
    ) {
      ok
      errors
      subarch {
        id
        name
        efiboot
        arch {
          id
          name
        }
      }
    }
  }
`

export const deleteSubarchGQL = gql`
  mutation deleteSubarch($id: Int!) {
    deleteSubarch(id: $id) {
      ok
      errors
      subarch {
        id
        name
      }
    }
  }
`
