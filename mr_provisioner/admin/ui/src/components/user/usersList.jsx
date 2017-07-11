import React from 'react'
import Header from 'grommet/components/Header'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import CheckBox from 'grommet/components/CheckBox'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import UserNew from './userNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose } from 'recompose'
import { connect } from 'react-redux'
import { usersListGQL } from '../../graphql/user'
import withLayerState from '../../hoc/withLayerState'
import * as comparators from '../../util/comparators'

const sortByUsername = comparators.string(['username'])
const sortByEmail = comparators.string(['email'])
const sortByPrivilege = comparators.boolean(['admin'])

class UsersList_ extends React.Component {
  state = {
    showForm: false,
    toast: null,
  }

  handleFormClose = ev => this.setState({ showForm: false })

  handleFormOpen = ev => this.setState({ showForm: true })

  render() {
    const { data, layers, ...props } = this.props

    return (
      <div>
        <Table
          keyCol="id"
          data={data.users}
          filterKeys={['username', 'email']}
          pagination={true}
        >
          <TableColumn
            label="Name"
            sortFn={sortByUsername}
            cell={
              <LinkCell
                linkFn={u => `/users/${u.id}`}
                textFn={u => u.username}
              />
            }
          />
          <TableColumn
            label="Email"
            sortFn={sortByEmail}
            cell={<TextCell col="email" />}
          />
          <TableColumn
            label="Privilege level"
            sortFn={sortByPrivilege}
            cell={<TextCell textFn={u => (u.admin ? 'admin' : 'user')} />}
          />
        </Table>

        <Button
          icon={<AddIcon />}
          label="Add a user"
          onClick={props.openForm}
        />
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <UserNew onDone={props.closeForm} />
          </Box>
        </Layer>
      </div>
    )
  }
}

export const UsersList = compose(
  graphql(usersListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withLayerState(['form']),
  withApolloStatus(NetworkLoading, NetworkError)
)(UsersList_)

export default UsersList
