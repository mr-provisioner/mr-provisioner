import React from 'react'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import EditIcon from 'grommet/components/icons/base/Edit'
import TrashIcon from 'grommet/components/icons/base/Trash'
import Menu from 'grommet/components/Menu'
import Split from 'grommet/components/Split'
import Sidebar from 'grommet/components/Sidebar'
import Columns from 'grommet/components/Columns'
import Heading from 'grommet/components/Heading'
import Section from 'grommet/components/Section'
import Label from 'grommet/components/Label'
import Anchor from 'grommet/components/Anchor'
import { Link } from 'react-router-dom'
import Layer from '../layer'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { networkGQL } from '../../graphql/network'
import * as messageActions from '../../actions/message'
import NetworkEdit from './networkEdit'
import NetworkDelete from './networkDelete'
import { check, perms, Check } from '../../util/permissions'
import withLayerState from '../../hoc/withLayerState'
import MachineTiles from '../machine/machineTiles'

function NetworkOverview({ network, onEdit }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Overview
        </Heading>
        <Check permission={perms.network_ADMIN}>
          <Button icon={<EditIcon />} onClick={onEdit} />
        </Check>
      </Box>
      <Columns maxCount={2} size="medium" justify="between" responsive={false}>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Subnet</Label>
            </span>
            <span className="secondary">
              {network.subnet}
            </span>
          </Box>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Static IPv4 pool</Label>
            </span>
            <span className="secondary">
              {network.staticNet}
            </span>
          </Box>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Reserved IPv4 pool</Label>
            </span>
            <span className="secondary">
              {network.reservedNet}
            </span>
          </Box>
        </Box>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }} />
      </Columns>
    </Section>
  )
}

// XXX: consider adding a table of machines using a network within this network view

class Network_ extends React.Component {
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
              {data.network.name}
            </Heading>

            <NetworkOverview network={data.network} onEdit={props.openEdit} />

            <Section>
              <Heading tag="h3">Linked machines</Heading>
              <MachineTiles machines={data.network.machines} />
            </Section>
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
            <Check permission={perms.network_ADMIN} entity={data.network}>
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
                    icon={<TrashIcon />}
                    label="Delete network"
                    onClick={props.openDeleteNetwork}
                    plain={true}
                  />
                </Menu>
              </Box>
            </Check>
          </Sidebar>
        </Split>

        <Layer
          closer={true}
          show={layers.showEdit}
          onClose={props.closeEdit}
          align="right"
        >
          <Box pad="medium">
            <NetworkEdit network={data.network} onDone={props.closeEdit} />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeleteNetwork}
          onClose={props.closeDeleteNetwork}
          align="right"
        >
          <Box pad="medium">
            <NetworkDelete
              network={data.network}
              onCancel={props.closeDeleteNetwork}
              onDone={() => history.push('/networks')}
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

export const Network = compose(
  graphql(networkGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      variables: { id: match.params.network_id },
    }),
  }),
  connect(null, mapDispatchToProps),
  withLayerState(['edit', 'deleteNetwork']),
  withApolloStatus(NetworkLoading, NetworkError)
)(Network_)

export default Network
