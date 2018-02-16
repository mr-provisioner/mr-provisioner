import { gql } from 'react-apollo'

export const machineNewGQL = gql`
  {
    bmcs {
      id
      ip
      name
      bmcType
    }
    images {
      id
      filename
      description
      fileType
      knownGood
      arch {
        id
        name
      }
    }
    archs {
      id
      name
      description
    }
    preseeds {
      id
      filename
      description
      fileType
      knownGood
    }
  }
`

export const createMachineGQL = gql`
  mutation createMachine(
    $name: String!
    $archId: Int
    $bmcId: Int
    $bmcInfo: String
    $macs: [String]
  ) {
    createMachine(
      name: $name
      archId: $archId
      bmcId: $bmcId
      bmcInfo: $bmcInfo
      macs: $macs
    ) {
      ok
      errors
      machine {
        id
        name
      }
    }
  }
`

export const changeMachineNetbootGQL = gql`
  mutation changeMachineNetboot($id: Int!, $netbootEnabled: Boolean!) {
    changeMachineNetboot(id: $id, netbootEnabled: $netbootEnabled) {
      ok
      errors
      machine {
        id
        name
        netbootEnabled
      }
    }
  }
`

export const machineResetConsoleGQL = gql`
  mutation machineResetConsole($id: Int!) {
    machineResetConsole(id: $id) {
      ok
      errors
      machine {
        id
        name
      }
    }
  }
`

export const machineChangePowerGQL = gql`
  mutation machineChangePower($id: Int!, $powerState: String!) {
    machineChangePower(id: $id, powerState: $powerState) {
      ok
      errors
      machine {
        id
        name
      }
    }
  }
`

export const changeMachineOverviewGQL = gql`
  mutation changeMachineOverview(
    $id: Int!
    $name: String!
    $archId: Int
    $bmcId: Int
    $bmcInfo: String
  ) {
    changeMachineOverview(
      id: $id
      name: $name
      archId: $archId
      bmcId: $bmcId
      bmcInfo: $bmcInfo
    ) {
      ok
      errors
      machine {
        id
        name
      }
    }
  }
`

export const changeMachineProvisioningGQL = gql`
  mutation changeMachineProvisioning(
    $id: Int!
    $kernelId: Int
    $kernelOpts: String
    $initrdId: Int
    $preseedId: Int
    $subarchId: Int
  ) {
    changeMachineProvisioning(
      id: $id
      kernelId: $kernelId
      kernelOpts: $kernelOpts
      initrdId: $initrdId
      preseedId: $preseedId
      subarchId: $subarchId
    ) {
      ok
      errors
      machine {
        id
        name
      }
    }
  }
`

export const deleteMachineGQL = gql`
  mutation deleteMachine($id: Int!) {
    deleteMachine(id: $id) {
      ok
      errors
      machine {
        id
        name
      }
    }
  }
`

export const addMachineInterfaceGQL = gql`
  mutation addMachineInterface(
    $machineId: Int!
    $mac: String!
    $networkId: Int
    $identifier: String
    $staticIpv4: String
    $reservedIpv4: String
  ) {
    addMachineInterface(
      machineId: $machineId
      mac: $mac
      networkId: $networkId
      identifier: $identifier
      staticIpv4: $staticIpv4
      reservedIpv4: $reservedIpv4
    ) {
      ok
      errors
      intf {
        id
        mac
      }
      machine {
        id
        name
      }
    }
  }
`

export const changeMachineInterfaceGQL = gql`
  mutation changeMachineInterface(
    $id: Int!
    $machineId: Int!
    $mac: String!
    $networkId: Int
    $identifier: String
    $staticIpv4: String
    $reservedIpv4: String
  ) {
    changeMachineInterface(
      id: $id
      machineId: $machineId
      mac: $mac
      networkId: $networkId
      identifier: $identifier
      staticIpv4: $staticIpv4
      reservedIpv4: $reservedIpv4
    ) {
      ok
      errors
      intf {
        id
        mac
      }
      machine {
        id
        name
      }
    }
  }
`

export const deleteMachineInterfaceGQL = gql`
  mutation deleteMachineInterface($id: Int!, $machineId: Int!) {
    deleteMachineInterface(id: $id, machineId: $machineId) {
      ok
      errors
      intf {
        id
        mac
      }
    }
  }
`

export const addMachineAssigneeGQL = gql`
  mutation addMachineAssignee(
    $machineId: Int!
    $userId: Int!
    $reason: String
  ) {
    addMachineAssignee(
      machineId: $machineId
      userId: $userId
      reason: $reason
    ) {
      ok
      errors
      assignment {
        id
        reason
        user {
          id
          username
        }
      }
    }
  }
`

export const changeMachineAssigneeGQL = gql`
  mutation changeMachineAssignee($id: Int!, $machineId: Int!, $reason: String) {
    changeMachineAssignee(id: $id, machineId: $machineId, reason: $reason) {
      ok
      errors
      assignment {
        id
        reason
        user {
          id
          username
        }
      }
    }
  }
`

export const deleteMachineAssigneeGQL = gql`
  mutation deleteMachineAssignee($id: Int!, $machineId: Int!) {
    deleteMachineAssignee(id: $id, machineId: $machineId) {
      ok
      errors
      user {
        id
        username
      }
    }
  }
`

export const machinesListGQL = gql`
  {
    machines {
      id
      name
      netbootEnabled
      arch {
        id
        name
      }
      bmc {
        id
        name
      }
      interfaces {
        id
        mac
        lease {
          ipv4
        }
      }
      assignments {
        id
        reason
        user {
          id
          username
        }
      }
    }
  }
`

export const machineGQL = gql`
  query($id: Int!) {
    machine(id: $id) {
      id
      name
      bmcInfo
      powerState
      kernelOpts
      netbootEnabled
      interfaces {
        id
        identifier
        mac
        network {
          id
          name
          subnet
        }
        staticIpv4
        reservedIpv4
        lease {
          ipv4
          lastSeen
        }
      }
      bmc {
        id
        name
        bmcType
        ip
        username
        password
      }
      arch {
        id
        name
        description
        subarchs {
          id
          name
          description
        }
      }
      subarch {
        id
        name
        description
      }
      kernel {
        id
        filename
        description
      }
      initrd {
        id
        filename
        description
      }
      preseed {
        id
        filename
        description
      }
      assignments {
        id
        reason
        startDate
        user {
          id
          username
        }
      }
    }
  }
`

export const machineConsoleGQL = gql`
  query($id: Int!) {
    consoleToken(machineId: $id) {
      host
      port
      token
    }
    machine(id: $id) {
      id
      name
    }
  }
`

export const machineEventLogGQL = gql`
  query($id: Int!, $limit: Int) {
    machineEvents(id: $id, limit: $limit) {
      id
      username
      date
      eventType
      info
    }
  }
`
