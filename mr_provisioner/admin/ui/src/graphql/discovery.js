import { gql } from 'react-apollo'

export const discoveredMacGQL = gql`
  query($id: Int!) {
    discoveredMac(id: $id) {
      id
      mac
      info
      lastSeen
    }
  }
`

export const discoveredMacsListGQL = gql`
  {
    discoveredMacs {
      id
      mac
      info
      lastSeen
    }
    machines {
      id
      name
      bmc {
        id
        name
      }
    }
  }
`
