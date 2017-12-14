import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import CheckBox from 'grommet/components/CheckBox'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import ArchNew from './archNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose } from 'recompose'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { archsListGQL } from '../../graphql/arch'
import withLayerState from '../../hoc/withLayerState'
import withOwnUser from '../../hoc/withOwnUser'
import * as prefsActions from '../../actions/prefs'
import * as comparators from '../../util/comparators'

const sortByName = comparators.string(['name'])

class ArchsList_ extends React.Component {
  state = {
    showForm: false,
  }

  handleFormClose = ev => this.setState({ showForm: false })

  handleFormOpen = ev => this.setState({ showForm: true })

  render() {
    const { actions, prefs, ownUser, data, layers, ...props } = this.props

    return (
      <div>
        <Table
          keyCol="id"
          data={data.archs}
          filterKeys={['name', 'description']}
          pagination={true}
        >
          <TableColumn
            label="Name"
            sortFn={sortByName}
            cell={
              <LinkCell linkFn={a => `/archs/${a.id}`} textFn={a => a.name} />
            }
          />
          <TableColumn
            label="Description"
            sortFn={sortByName}
            cell={<TextCell col="description" />}
          />
        </Table>

        <Button
          icon={<AddIcon />}
          label="Add an Architecture"
          onClick={props.openForm}
        />
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <ArchNew onDone={props.closeForm} />
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

export const ArchsList = compose(
  graphql(archsListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withLayerState(['form']),
  withOwnUser(),
  connect(mapStateToProps, mapDispatchToProps),
  withApolloStatus(NetworkLoading, NetworkError)
)(ArchsList_)

export default ArchsList
