import { gql } from 'react-apollo'

export const availableIPsGQL = gql`
  query($networkId: Int!, $limit: Int) {
    availableIps(networkId: $networkId, limit: $limit) {
      staticIps
      reservedIps
    }
  }
`

export const networkGQL = gql`
  query($id: Int!) {
    network(id: $id) {
      id
      name
      subnet
      reservedNet
      staticNet
      machines {
        id
        name
      }
    }
  }
`

export const networksListGQL = gql`
  {
    networks {
      id
      name
      subnet
      reservedNet
      staticNet
    }
  }
`

export const changeNetworkGQL = gql`
  mutation changeNetwork(
    $id: Int!
    $name: String!
    $subnet: String!
    $staticNet: String
    $reservedNet: String
  ) {
    changeNetwork(
      id: $id
      name: $name
      subnet: $subnet
      staticNet: $staticNet
      reservedNet: $reservedNet
    ) {
      ok
      errors
      network {
        id
        name
        subnet
      }
    }
  }
`
export const deleteNetworkGQL = gql`
  mutation deleteNetwork($id: Int!) {
    deleteNetwork(id: $id) {
      ok
      errors
      network {
        id
        name
        subnet
      }
    }
  }
`

export const createNetworkGQL = gql`
  mutation createNetwork(
    $name: String!
    $subnet: String!
    $staticNet: String
    $reservedNet: String
  ) {
    createNetwork(
      name: $name
      subnet: $subnet
      staticNet: $staticNet
      reservedNet: $reservedNet
    ) {
      ok
      errors
      network {
        id
        name
        subnet
      }
    }
  }
`
