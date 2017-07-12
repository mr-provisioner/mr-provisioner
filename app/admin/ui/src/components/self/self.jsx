import React from 'react'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import EditIcon from 'grommet/components/icons/base/Edit'
import LockIcon from 'grommet/components/icons/base/Lock'
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
import { selfGQL } from '../../graphql/self'
import SelfEditSSHKey from './selfEditSshKey'
import * as messageActions from '../../actions/message'
import SelfChangePassword from './selfChangePassword'
import withLayerState from '../../hoc/withLayerState'

function SelfSSHKey_({ ownUser, onEdit, onEditCancel, onDone, editing }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          SSH Keys
        </Heading>
        {!editing && <Button icon={<EditIcon />} onClick={onEdit} />}
      </Box>
      <Box
        pad={{ horizontal: 'none', vertical: 'small' }}
        size="full"
        basis="full"
      >
        {!editing
          ? <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                wordBreak: 'break-all',
              }}
            >
              {ownUser.sshKey}
            </pre>
          : <SelfEditSSHKey
              ownUser={ownUser}
              onCancel={onEditCancel}
              onDone={onDone}
            />}
      </Box>
    </Section>
  )
}

const SelfSSHKey = compose(
  withState('editing', 'updateEditing', false),
  withHandlers({
    onEdit: props => event => props.updateEditing(true),
    onEditCancel: props => event => props.updateEditing(false),
    onDone: props => event => props.updateEditing(false),
  })
)(SelfSSHKey_)

function SelfOverview({ ownUser }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Overview
        </Heading>
      </Box>
      <Columns maxCount={2} size="medium" justify="between" responsive={false}>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Email</Label>
            </span>
            <span className="secondary">
              {ownUser.email}
            </span>
          </Box>
        </Box>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }} />
      </Columns>
    </Section>
  )
}

class Self_ extends React.Component {
  render() {
    const { data, layers, ...props } = this.props

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
              {data.ownUser.username}
            </Heading>

            <SelfOverview ownUser={data.ownUser} />
            <SelfSSHKey ownUser={data.ownUser} />
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
                  icon={<LockIcon />}
                  label="Change Password"
                  onClick={props.openChangePassword}
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
            <SelfChangePassword
              onCancel={props.closeChangePassword}
              onDone={props.closeChangePassword}
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

export const Self = compose(
  graphql(selfGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
    }),
  }),
  connect(null, mapDispatchToProps),
  withLayerState(['changePassword']),
  withApolloStatus(NetworkLoading, NetworkError)
)(Self_)

export default Self
