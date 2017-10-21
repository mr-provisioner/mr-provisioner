import React from 'react'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import EditIcon from 'grommet/components/icons/base/Edit'
import TrashIcon from 'grommet/components/icons/base/Trash'
import CliIcon from 'grommet/components/icons/base/Cli'
import PowerIcon from 'grommet/components/icons/base/Power'
import InstallIcon from 'grommet/components/icons/base/Install'
import RefreshIcon from 'grommet/components/icons/base/Refresh'
import ClearIcon from 'grommet/components/icons/base/Clear'
import Menu from 'grommet/components/Menu'
import Split from 'grommet/components/Split'
import Sidebar from 'grommet/components/Sidebar'
import CheckBox from 'grommet/components/CheckBox'
import Columns from 'grommet/components/Columns'
import Heading from 'grommet/components/Heading'
import Timestamp from 'grommet/components/Timestamp'
import Section from 'grommet/components/Section'
import Label from 'grommet/components/Label'
import Anchor from 'grommet/components/Anchor'
import { Link } from 'react-router-dom'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import Layer from '../layer'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, withProps, compose } from 'recompose'
import { parse } from 'query-string'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import {
  machineGQL,
  changeMachineNetbootGQL,
  machineResetConsoleGQL,
  machineChangePowerGQL,
} from '../../graphql/machine'
import * as messageActions from '../../actions/message'
import MachineEditOverview from './machineEditOverview'
import MachineEditProvisioning from './machineEditProvisioning'
import MachineAddInterface from './machineAddInterface'
import MachineEditInterface from './machineEditInterface'
import MachineRemoveInterface from './machineRemoveInterface'
import MachineAddAssignee from './machineAddAssignee'
import MachineEditAssignee from './machineEditAssignee'
import MachineRemoveAssignee from './machineRemoveAssignee'
import MachineDelete from './machineDelete'
import { check, perms, Check } from '../../util/permissions'
import withOwnUser from '../../hoc/withOwnUser'
import withLayerState from '../../hoc/withLayerState'
import { BMCInfo } from './bmcInfoField'
import * as comparators from '../../util/comparators'

function MachineOverview({ machine, onEdit }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Overview
        </Heading>
        <Check permission={perms.MACHINE_ADMIN}>
          <Button icon={<EditIcon />} onClick={onEdit} />
        </Check>
      </Box>
      <Columns maxCount={2} size="medium" justify="between" responsive={false}>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Power state</Label>
            </span>
            <span className="secondary">
              {machine.powerState}
            </span>
          </Box>
        </Box>
        {machine.bmc
          ? <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
              <Box justify="between" direction="row" pad="small">
                <span>
                  <Label>BMC</Label>
                </span>
                <span className="secondary">
                  <Link to={'/bmcs/' + machine.bmc.id}>
                    {machine.bmc.name}
                  </Link>
                </span>
              </Box>
              <BMCInfo bmc={machine.bmc} bmcInfo={machine.bmcInfo} />
            </Box>
          : null}
      </Columns>
    </Section>
  )
}

function MachineProvisioning({ machine, ownUser, onEdit, onNetbootChange }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Provisioning
        </Heading>
        <Check permission={perms.MACHINE_USER} entity={machine}>
          <Button icon={<EditIcon />} onClick={onEdit} />
        </Check>
      </Box>
      <Columns maxCount={2} size="large" justify="between" responsive={false}>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Kernel</Label>
            </span>
            <span className="secondary">
              {machine.kernel
                ? <Link to={'/images/' + machine.kernel.id}>{`${machine.kernel
                    .filename} (${machine.kernel.description})`}</Link>
                : 'None'}
            </span>
          </Box>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Kernel cmdline</Label>
            </span>
            <span className="secondary">
              {machine.kernelOpts || '(not set)'}
            </span>
          </Box>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Initrd</Label>
            </span>
            <span className="secondary">
              {machine.initrd
                ? <Link to={'/images/' + machine.initrd.id}>{`${machine.initrd
                    .filename} (${machine.initrd.description})`}</Link>
                : 'None'}
            </span>
          </Box>
        </Box>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Preseed</Label>
            </span>
            <span className="secondary">
              {machine.preseed
                ? <Link to={'/preseeds/' + machine.preseed.id}>{`${machine
                    .preseed.filename} (${machine.preseed.description})`}</Link>
                : 'None'}
            </span>
          </Box>
        </Box>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Netboot enabled</Label>
            </span>
            <span className="secondary">
              <CheckBox
                disabled={!check(ownUser, perms.MACHINE_USER, machine)}
                toggle={true}
                checked={machine.netbootEnabled}
                onChange={onNetbootChange}
              />
            </span>
          </Box>
        </Box>
      </Columns>
    </Section>
  )
}

export const netConfigType = intf =>
  intf.network && intf.staticIpv4
    ? 'static'
    : intf.network && intf.reservedIpv4 ? 'dynamic-reserved' : 'dynamic'

export const netConfigIpv4 = intf => {
  const configType = netConfigType(intf)
  return configType === 'static'
    ? intf.staticIpv4 || ''
    : configType === 'dynamic-reserved' ? intf.reservedIpv4 || '' : ''
}

const netName = intf =>
  intf.network ? `${intf.network.name} (${intf.network.subnet})` : ''

const sortByIdentifier = comparators.string(['identifier'])
const sortByMac = comparators.string(['mac'])
const sortByNetName = comparators.string([], netName)
const sortByNetConfig = comparators.string([], netConfigType)
const sortByNetIpv4 = comparators.string([], netConfigIpv4)

function MachineInterfaces({ machine, onAdd, onEdit, onRemove }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Interfaces
        </Heading>
        <Check permission={perms.MACHINE_ADMIN}>
          <Button icon={<AddIcon />} onClick={onAdd} />
        </Check>
      </Box>
      <Table keyCol="id" data={machine.interfaces}>
        <TableColumn
          label="Identifier"
          sortFn={sortByIdentifier}
          cell={<TextCell col="identifier" />}
        />
        <TableColumn
          label="MAC"
          sortFn={sortByMac}
          cell={<TextCell col="mac" />}
        />
        <TableColumn
          label="Network"
          sortFn={sortByNetName}
          cell={<TextCell textFn={netName} />}
        />
        <TableColumn
          label="Configuration type"
          sortFn={sortByNetConfig}
          cell={<TextCell textFn={netConfigType} />}
        />
        <TableColumn
          label="Configured IPv4"
          sortFn={sortByNetIpv4}
          cell={<TextCell textFn={netConfigIpv4} />}
        />
        <TableColumn
          label="Lease IPv4"
          cell={<TextCell cond={i => i.lease} textFn={i => i.lease.ipv4} />}
        />
        <TableColumn
          label="Last seen"
          cell={
            <AnyCell
              cond={i => i.lease}
              fn={i => <Timestamp value={i.lease.lastSeen} />}
            />
          }
        />
        <TableColumn
          label=""
          cell={
            <AnyCell
              fn={i =>
                <div>
                  <Check permission={perms.MACHINE_USER} entity={machine}>
                    <span style={{ marginRight: '1.5em' }}>
                      <Anchor onClick={() => onEdit(i.id)}>Edit</Anchor>
                    </span>
                  </Check>
                  <Check permission={perms.MACHINE_ADMIN}>
                    <span>
                      <Anchor onClick={() => onRemove(i.id)}>Remove</Anchor>
                    </span>
                  </Check>
                </div>}
            />
          }
        />
      </Table>
    </Section>
  )
}

const sortByUsername = comparators.string(['user', 'username'])
const sortByReason = comparators.string(['reason'])

function MachineAssignees({ machine, onAdd, onEdit, onRemove }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Assignees
        </Heading>
        <Check permission={perms.MACHINE_ADMIN}>
          <Button icon={<AddIcon />} onClick={onAdd} />
        </Check>
      </Box>
      <Table keyCol="id" data={machine.assignments}>
        <TableColumn
          label="User"
          sortFn={sortByUsername}
          cell={<TextCell textFn={a => a.user.username} />}
        />
        <TableColumn
          label="Reason"
          sortFn={sortByReason}
          cell={<TextCell col="reason" />}
        />
        <TableColumn
          label="Assignment date"
          cell={
            <AnyCell
              cond={a => a.startDate}
              fn={a => <Timestamp value={a.startDate} />}
            />
          }
        />
        <TableColumn
          label=""
          cell={
            <AnyCell
              fn={a =>
                <div>
                  <Check permission={perms.MACHINE_ADMIN}>
                    <span style={{ marginRight: '1.5em' }}>
                      <Anchor onClick={() => onEdit(a.id)}>Edit</Anchor>
                    </span>
                    <span>
                      <Anchor onClick={() => onRemove(a.id)}>Remove</Anchor>
                    </span>
                  </Check>
                </div>}
            />
          }
        />
      </Table>
    </Section>
  )
}

class Machine_ extends React.Component {
  handleNetbootChange = ev => {
    const { actions, data } = this.props

    this.props
      .netbootMutation({
        variables: {
          id: data.machine.id,
          netbootEnabled: ev.target.checked,
        },
      })
      .then(({ data: { changeMachineNetboot: { ok, machine, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Netboot for ${machine.name} ${machine.netbootEnabled
              ? 'enabled'
              : 'disabled'}, but: ${errors.join(', ')}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Netboot for ${machine.name} ${machine.netbootEnabled
              ? 'enabled'
              : 'disabled'}.`
          )
        else
          actions.showErrorMessage(
            `Error changing netboot setting for machine ${machine.name}: ${errors.join(
              ', '
            )}.`
          )
      })
      .catch(error => {
        actions.showErrorMessage(error.message || error)
      })
  }

  handleResetConsole = ev => {
    const { actions, data } = this.props

    this.props
      .resetConsoleMutation({
        variables: {
          id: data.machine.id,
        },
      })
      .then(({ data: { machineResetConsole: { ok, machine, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Console for ${machine.name} reset, but: ${errors.join(', ')}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Console for ${machine.name} reset successfully.`
          )
        else
          actions.showErrorMessage(
            `Error resetting console for machine ${machine.name}: ${errors.join(
              ', '
            )}.`
          )
      })
      .catch(error => {
        actions.showErrorMessage(error.message || error)
      })
  }

  handleChangePower = powerState => {
    const { actions, data } = this.props

    this.props
      .changePowerMutation({
        variables: {
          id: data.machine.id,
          powerState,
        },
      })
      .then(({ data: { machineChangePower: { ok, machine, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Power state for ${machine.name} changed, but: ${errors.join(
              ', '
            )}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Power state for ${machine.name} changed successfully.`
          )
        else
          actions.showErrorMessage(
            `Error changing power state for machine ${machine.name}: ${errors.join(
              ', '
            )}.`
          )
      })
      .catch(error => {
        actions.showErrorMessage(error.message || error)
      })
  }

  render() {
    const { history, data, ownUser, layers, ...props } = this.props

    return (
      <div>
        <Split
          flex="left"
          priority="left"
          fixed={false}
          showOnResponsive="both"
        >
          <Box pad={{ horizontal: 'large' }}>
            <Heading tag="h2">
              {data.machine.name}
            </Heading>

            <MachineOverview
              machine={data.machine}
              onEdit={props.openEditOverview}
            />

            <MachineInterfaces
              machine={data.machine}
              onAdd={props.openAddInterface}
              onEdit={props.openEditInterface}
              onRemove={props.openRemoveInterface}
            />

            <MachineProvisioning
              machine={data.machine}
              ownUser={ownUser}
              onEdit={props.openEditProvisioning}
              onNetbootChange={this.handleNetbootChange}
            />

            <MachineAssignees
              machine={data.machine}
              onAdd={props.openAddAssignee}
              onEdit={props.openEditAssignee}
              onRemove={props.openRemoveAssignee}
            />
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
            <Check permission={perms.MACHINE_USER} entity={data.machine}>
              <Box>
                <Header tag="h2" pad="medium" justify="between">
                  <Title>Actions</Title>
                </Header>
                <Menu
                  responsive={false}
                  inline={true}
                  direction="column"
                  pad={{ between: 'small' }}
                >
                  <Button
                    icon={<CliIcon />}
                    label="Console"
                    path={`/machines/${data.machine.id}/console`}
                    plain={true}
                  />

                  <Button
                    icon={<ClearIcon />}
                    label="Reset console"
                    onClick={this.handleResetConsole}
                    plain={true}
                  />

                  <Button
                    icon={<InstallIcon />}
                    label="PXE Reboot"
                    onClick={() => this.handleChangePower('pxe_reboot')}
                    plain={true}
                  />

                  <Button
                    icon={<RefreshIcon />}
                    label="Reboot"
                    onClick={() => this.handleChangePower('disk_reboot')}
                    plain={true}
                  />

                  <Button
                    icon={<PowerIcon />}
                    label={
                      data.machine.powerState === 'on'
                        ? 'Power off'
                        : 'Power on'
                    }
                    onClick={() =>
                      this.handleChangePower(
                        data.machine.powerState === 'on' ? 'off' : 'on'
                      )}
                    plain={true}
                  />

                  <Check permission={perms.MACHINE_ADMIN}>
                    <Button
                      icon={<TrashIcon />}
                      label="Delete Machine"
                      onClick={props.openDeleteMachine}
                      plain={true}
                    />
                  </Check>
                </Menu>
              </Box>
            </Check>
          </Sidebar>
        </Split>

        <Layer
          closer={true}
          show={layers.showEditOverview}
          onClose={props.closeEditOverview}
          align="right"
        >
          <Box pad="medium">
            <MachineEditOverview
              machine={data.machine}
              onDone={props.closeEditOverview}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showEditProvisioning}
          onClose={props.closeEditProvisioning}
          align="right"
        >
          <Box pad="medium">
            <MachineEditProvisioning
              machine={data.machine}
              onDone={props.closeEditProvisioning}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showAddInterface}
          onClose={props.closeAddInterface}
          align="right"
        >
          <Box pad="medium">
            <MachineAddInterface
              addWithMac={props.query.addWithMac}
              machine={data.machine}
              onDone={props.closeAddInterface}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showEditInterface}
          onClose={props.closeEditInterface}
          align="right"
        >
          <Box pad="medium">
            <MachineEditInterface
              machine={data.machine}
              intf={layers.editInterfaceVar}
              onDone={props.closeEditInterface}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showRemoveInterface}
          onClose={props.closeRemoveInterface}
          align="right"
        >
          <Box pad="medium">
            <MachineRemoveInterface
              machine={data.machine}
              intf={layers.removeInterfaceVar}
              onCancel={props.closeRemoveInterface}
              onDone={props.closeRemoveInterface}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showAddAssignee}
          onClose={props.closeAddAssignee}
          align="right"
        >
          <Box pad="medium">
            <MachineAddAssignee
              machine={data.machine}
              onDone={props.closeAddAssignee}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showEditAssignee}
          onClose={props.closeEditAssignee}
          align="right"
        >
          <Box pad="medium">
            <MachineEditAssignee
              machine={data.machine}
              assignee={layers.editAssigneeVar}
              onDone={props.closeEditAssignee}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showRemoveAssignee}
          onClose={props.closeRemoveAssignee}
          align="right"
        >
          <Box pad="medium">
            <MachineRemoveAssignee
              machine={data.machine}
              assignee={layers.removeAssigneeVar}
              onCancel={props.closeRemoveAssignee}
              onDone={props.closeRemoveAssignee}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeleteMachine}
          onClose={props.closeDeleteMachine}
          align="right"
        >
          <Box pad="medium">
            <MachineDelete
              machine={data.machine}
              onCancel={props.closeDeleteMachine}
              onDone={() => history.push('/machines')}
            />
          </Box>
        </Layer>
      </div>
    )
  }
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

export const Machine = compose(
  graphql(machineGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      pollInterval: 12500,
      variables: { id: match.params.machine_id },
    }),
  }),
  graphql(changeMachineNetbootGQL, {
    name: 'netbootMutation',
    options: ({ match }) => ({
      refetchQueries: [
        {
          query: machineGQL,
          variables: { id: match.params.machine_id },
        },
      ],
    }),
  }),
  graphql(machineResetConsoleGQL, {
    name: 'resetConsoleMutation',
    options: ({ match }) => ({
      refetchQueries: [
        {
          query: machineGQL,
          variables: { id: match.params.machine_id },
        },
      ],
    }),
  }),
  graphql(machineChangePowerGQL, {
    name: 'changePowerMutation',
    options: ({ match }) => ({
      refetchQueries: [
        {
          query: machineGQL,
          variables: { id: match.params.machine_id },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withOwnUser(),
  withProps(ownProps => ({
    query: parse(ownProps.location.search),
    queryString: ownProps.location.search,
  })),
  withLayerState([
    'editOverview',
    'editProvisioning',
    ['addInterface', null, ({ query }) => query.addWithMac || false],
    [
      'editInterface',
      ({ data }, id) => data.machine.interfaces.find(i => i.id === id),
    ],
    [
      'removeInterface',
      ({ data }, id) => data.machine.interfaces.find(i => i.id === id),
    ],
    'addAssignee',
    [
      'editAssignee',
      ({ data }, id) => data.machine.assignments.find(a => a.id === id),
    ],
    [
      'removeAssignee',
      ({ data }, id) => data.machine.assignments.find(a => a.id === id),
    ],
    'deleteMachine',
  ]),
  withApolloStatus(NetworkLoading, NetworkError)
)(Machine_)

export default Machine
