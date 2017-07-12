import React from 'react'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import EditIcon from 'grommet/components/icons/base/Edit'
import TrashIcon from 'grommet/components/icons/base/Trash'
import LockIcon from 'grommet/components/icons/base/Lock'
import UserAdminIcon from 'grommet/components/icons/base/UserAdmin'
import Menu from 'grommet/components/Menu'
import Split from 'grommet/components/Split'
import Sidebar from 'grommet/components/Sidebar'
import Columns from 'grommet/components/Columns'
import Heading from 'grommet/components/Heading'
import Section from 'grommet/components/Section'
import Label from 'grommet/components/Label'
import Layer from '../layer'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, withState, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { userGQL } from '../../graphql/user'
import * as messageActions from '../../actions/message'
import UserChangePassword from './userChangePassword'
import UserEditInfo from './userEditInfo'
import UserEditPrivilege from './userEditPrivilege'
import UserDelete from './userDelete'
import withLayerState from '../../hoc/withLayerState'

function UserOverview({ user, onEdit }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Overview
        </Heading>
        <Button icon={<EditIcon />} onClick={onEdit} />
      </Box>
      <Columns maxCount={2} size="medium" justify="between" responsive={false}>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Email</Label>
            </span>
            <span className="secondary">
              {user.email}
            </span>
          </Box>
        </Box>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Privilege level</Label>
            </span>
            <span className="secondary">
              {user.admin ? 'admin' : 'user'}
            </span>
          </Box>
        </Box>
      </Columns>
    </Section>
  )
}

class User_ extends React.Component {
  render() {
    const { history, data, layers, ...props } = this.props

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
              {data.user.username}
            </Heading>

            <UserOverview user={data.user} onEdit={props.openEditInfo} />
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
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
                  icon={<UserAdminIcon />}
                  label="Change Privileges"
                  onClick={props.openEditPrivilege}
                  plain={true}
                />
                <Button
                  icon={<LockIcon />}
                  label="Change Password"
                  onClick={props.openChangePassword}
                  plain={true}
                />
                <Button
                  icon={<TrashIcon />}
                  label="Delete User"
                  onClick={props.openDeleteUser}
                  plain={true}
                />
              </Menu>
            </Box>
          </Sidebar>
        </Split>

        <Layer
          closer={true}
          show={layers.showChangePassword}
          onClose={props.closeChangePassword}
          align="right"
        >
          <Box pad="medium">
            <UserChangePassword
              user={data.user}
              onDone={props.closeChangePassword}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showEditInfo}
          onClose={props.closeEditInfo}
          align="right"
        >
          <Box pad="medium">
            <UserEditInfo user={data.user} onDone={props.closeEditInfo} />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showEditPrivilege}
          onClose={props.closeEditPrivilege}
          align="right"
        >
          <Box pad="medium">
            <UserEditPrivilege
              user={data.user}
              onDone={props.closeEditPrivilege}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeleteUser}
          onClose={props.closeDeleteUser}
          align="right"
        >
          <Box pad="medium">
            <UserDelete
              user={data.user}
              onCancel={props.closeDeleteUser}
              onDone={() => history.push('/users')}
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

export const User = compose(
  graphql(userGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      variables: { id: match.params.user_id },
    }),
  }),
  connect(null, mapDispatchToProps),
  withLayerState(['editInfo', 'editPrivilege', 'changePassword', 'deleteUser']),
  withApolloStatus(NetworkLoading, NetworkError)
)(User_)

export default User
