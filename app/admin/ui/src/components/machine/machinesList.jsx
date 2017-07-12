import React from 'react'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import CheckBox from 'grommet/components/CheckBox'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import MachineNew from './machineNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose, withProps } from 'recompose'
import { parse } from 'query-string'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { machinesListGQL } from '../../graphql/machine'
import { check, perms, Check } from '../../util/permissions'
import withLayerState from '../../hoc/withLayerState'
import withOwnUser from '../../hoc/withOwnUser'
import * as prefsActions from '../../actions/prefs'
import * as comparators from '../../util/comparators'

const sortByName = comparators.string(['name'])
const sortByInterfaces = comparators.arrayLength(['interfaces'])
const sortByAssignee = comparators.string([
  'assignments',
  0,
  'user',
  'username',
])
const sortByNetboot = comparators.boolean(['netbootEnabled'])
const sortByBmc = comparators.string(['bmc', 'name'])

function InterfacesCell({ data }) {
  return (
    <div>
      {data.interfaces.map(intf =>
        <div key={intf.id}>
          {intf.mac + (intf.lease ? ` (${intf.lease.ipv4})` : '')}
        </div>
      )}
    </div>
  )
}

function AssigneesCell({ data }) {
  return (
    <div>
      {data.assignments.map(a =>
        <div key={a.id}>
          {`${a.user.username}` +
            (a.reason && a.reason.length > 0 ? ` (${a.reason})` : '')}
        </div>
      )}
    </div>
  )
}

class MachinesList_ extends React.Component {
  render() {
    const { actions, prefs, ownUser, data, layers, ...props } = this.props

    let machines = data.machines

    if (prefs['machinesList.onlyMine'])
      machines = machines.filter(
        m => !!m.assignments.find(a => a.user.id == ownUser.id)
      )

    return (
      <div>
        <Table
          keyCol="id"
          data={machines}
          filterKeys={[
            'name',
            'interfaces.mac',
            'bmc.name',
            'bmc.ip',
            'assignments.reason',
            'assignments.user.username',
          ]}
          pagination={true}
          additionalControls={
            <CheckBox
              label="Only show my machines"
              checked={prefs['machinesList.onlyMine']}
              onChange={ev =>
                actions.setPref('machinesList.onlyMine', ev.target.checked)}
              toggle={true}
              reverse={false}
            />
          }
        >
          <TableColumn
            label="Name"
            sortFn={sortByName}
            cell={
              <LinkCell
                linkFn={m => `/machines/${m.id}`}
                textFn={m => m.name}
              />
            }
          />
          <TableColumn
            label="Interfaces"
            sortFn={sortByInterfaces}
            cell={<InterfacesCell />}
          />
          <TableColumn
            label="BMC"
            sortFn={sortByBmc}
            cell={
              <LinkCell
                cond={m => m.bmc}
                linkFn={m => `/bmcs/${m.bmc.id}`}
                textFn={m => m.bmc.name}
              />
            }
          />
          <TableColumn
            label="Netboot"
            sortFn={sortByNetboot}
            cell={
              <AnyCell
                fn={m =>
                  <CheckBox
                    disabled={true}
                    toggle={true}
                    checked={m.netbootEnabled}
                  />}
              />
            }
          />
          <TableColumn
            label="Assignees"
            sortFn={sortByAssignee}
            cell={<AssigneesCell />}
          />
        </Table>

        <Check permission={perms.MACHINE_ADMIN}>
          <Button
            icon={<AddIcon />}
            label="Add a machine"
            onClick={props.openForm}
          />
        </Check>
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <MachineNew
              addWithMac={props.query.addWithMac}
              query={props.query}
              onDone={props.closeForm}
            />
          </Box>
        </Layer>
      </div>
    )
  }
}

const mapStateToProps = (state, ownProps) => ({
  prefs: state.prefs || {},
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...prefsActions }, dispatch),
})

export const MachinesList = compose(
  graphql(machinesListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withProps(ownProps => ({
    query: parse(ownProps.location.search),
    queryString: ownProps.location.search,
  })),
  withLayerState([['form', null, ({ query }) => query.addWithMac || false]]),
  withOwnUser(),
  connect(mapStateToProps, mapDispatchToProps),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachinesList_)

export default MachinesList
