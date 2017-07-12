import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import CheckBox from 'grommet/components/CheckBox'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import PreseedNew from './preseedNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose } from 'recompose'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { preseedsListGQL } from '../../graphql/preseed'
import withLayerState from '../../hoc/withLayerState'
import withOwnUser from '../../hoc/withOwnUser'
import * as prefsActions from '../../actions/prefs'
import * as comparators from '../../util/comparators'

const sortByName = comparators.string(['filename'])
const sortByDesc = comparators.string(['description'])
const sortByType = comparators.string(['fileType'])
const sortByUser = comparators.string(['user', 'username'])
const sortByKnownGood = comparators.boolean(['knownGood'])
const sortByPublic = comparators.boolean(['public'])

class PreseedsList_ extends React.Component {
  state = {
    showForm: false,
    toast: null,
  }

  handleFormClose = ev => this.setState({ showForm: false })

  handleFormOpen = ev => this.setState({ showForm: true })

  render() {
    const { actions, prefs, ownUser, data, layers, ...props } = this.props

    let preseeds = data.preseeds

    if (prefs['preseedsList.onlyMine'])
      preseeds = preseeds.filter(p => p.user.id == ownUser.id)

    return (
      <div>
        <Table
          keyCol="id"
          data={preseeds}
          filterKeys={['filename', 'description', 'fileType', 'user.username']}
          pagination={true}
          additionalControls={
            <CheckBox
              label="Only show my preseeds"
              checked={prefs['preseedsList.onlyMine']}
              onChange={ev =>
                actions.setPref('preseedsList.onlyMine', ev.target.checked)}
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
                linkFn={p => `/preseeds/${p.id}`}
                textFn={p => p.filename}
              />
            }
          />
          <TableColumn
            label="Description"
            sortFn={sortByDesc}
            cell={<TextCell col="description" />}
          />
          <TableColumn
            label="Type"
            sortFn={sortByType}
            cell={<TextCell col="fileType" />}
          />
          <TableColumn
            label="Known Good"
            sortFn={sortByKnownGood}
            cell={
              <AnyCell
                fn={p =>
                  <CheckBox
                    disabled={true}
                    toggle={true}
                    checked={p.knownGood}
                  />}
              />
            }
          />
          <TableColumn
            label="Public"
            sortFn={sortByPublic}
            cell={
              <AnyCell
                fn={p =>
                  <CheckBox disabled={true} toggle={true} checked={p.public} />}
              />
            }
          />
          <TableColumn
            label="Owner"
            sortFn={sortByUser}
            cell={<TextCell textFn={p => p.user.username} />}
          />
        </Table>

        <Button
          icon={<AddIcon />}
          label="Add a Preseed"
          onClick={props.openForm}
        />
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <PreseedNew onDone={props.closeForm} />
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

export const PreseedsList = compose(
  graphql(preseedsListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withLayerState(['form']),
  withOwnUser(),
  connect(mapStateToProps, mapDispatchToProps),
  withApolloStatus(NetworkLoading, NetworkError)
)(PreseedsList_)

export default PreseedsList
