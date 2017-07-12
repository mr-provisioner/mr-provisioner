import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import CheckBox from 'grommet/components/CheckBox'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import NetworkNew from './networkNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose } from 'recompose'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { networksListGQL } from '../../graphql/network'
import withLayerState from '../../hoc/withLayerState'
import withOwnUser from '../../hoc/withOwnUser'
import * as prefsActions from '../../actions/prefs'
import * as comparators from '../../util/comparators'

const sortByName = comparators.string(['name'])
const sortBySubnet = comparators.string(['subnet'])
const sortByStaticNet = comparators.string(['staticNet'])
const sortByReservedNet = comparators.string(['reservedNet'])

class NetworksList_ extends React.Component {
  state = {
    showForm: false,
    toast: null,
  }

  handleFormClose = ev => this.setState({ showForm: false })

  handleFormOpen = ev => this.setState({ showForm: true })

  render() {
    const { actions, prefs, ownUser, data, layers, ...props } = this.props

    return (
      <div>
        <Table
          keyCol="id"
          data={data.networks}
          filterKeys={['name', 'subnet', 'staticNet', 'reservedNet']}
          pagination={true}
        >
          <TableColumn
            label="Name"
            sortFn={sortByName}
            cell={
              <LinkCell
                linkFn={n => `/networks/${n.id}`}
                textFn={n => n.name}
              />
            }
          />
          <TableColumn
            label="Subnet"
            sortFn={sortBySubnet}
            cell={<TextCell col="subnet" />}
          />
          <TableColumn
            label="Static subnet"
            sortFn={sortByStaticNet}
            cell={<TextCell col="staticNet" />}
          />
          <TableColumn
            label="Reserved subnet"
            sortFn={sortByReservedNet}
            cell={<TextCell col="reservedNet" />}
          />
        </Table>

        <Button
          icon={<AddIcon />}
          label="Add a Network"
          onClick={props.openForm}
        />
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <NetworkNew onDone={props.closeForm} />
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

export const NetworksList = compose(
  graphql(networksListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withLayerState(['form']),
  withOwnUser(),
  connect(mapStateToProps, mapDispatchToProps),
  withApolloStatus(NetworkLoading, NetworkError)
)(NetworksList_)

export default NetworksList
