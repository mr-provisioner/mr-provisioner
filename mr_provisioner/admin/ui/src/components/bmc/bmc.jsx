import React from 'react'
import DocumentTitle from 'react-document-title'
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
import Timestamp from 'grommet/components/Timestamp'
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
import { bmcGQL } from '../../graphql/bmc'
import * as messageActions from '../../actions/message'
import BmcEdit from './bmcEdit'
import BmcDelete from './bmcDelete'
import { check, perms, Check } from '../../util/permissions'
import withLayerState from '../../hoc/withLayerState'
import MachineTiles from '../machine/machineTiles'
import { netConfigType, netConfigIpv4, netName } from '../../util/net'

function BmcOverview({ bmc, onEdit }) {
  return (
    <div>
      <Section>
        <Box align="center" direction="row">
          <Heading tag="h3" style={{ marginBottom: 0 }}>
            Overview
          </Heading>
          <Check permission={perms.BMC_ADMIN}>
            <Button icon={<EditIcon />} onClick={onEdit} />
          </Check>
        </Box>
        <Columns maxCount={2} size="medium" justify="between" responsive={false}>
          <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>Type</Label>
              </span>
              <span className="secondary">
                {bmc.bmcType}
              </span>
            </Box>

            <Check permission={perms.BMC_ADMIN}>
              <Box justify="between" direction="row" pad="small">
                <span>
                  <Label>Username</Label>
                </span>
                <span className="secondary">
                  {bmc.username}
                </span>
              </Box>
            </Check>

            <Check permission={perms.BMC_ADMIN}>
              <Box justify="between" direction="row" pad="small">
                <span>
                  <Label>Password</Label>
                </span>
                <span className="secondary">
                  {bmc.password}
                </span>
              </Box>
            </Check>
          </Box>
        </Columns>
      </Section>
      <Section>
        <Box align="center" direction="row">
          <Heading tag="h3" style={{ marginBottom: 0 }}>
            Network
          </Heading>
          <Check permission={perms.BMC_ADMIN}>
            <Button icon={<EditIcon />} onClick={onEdit} />
          </Check>
        </Box>
        <Columns maxCount={2} size="medium" justify="between" responsive={false}>
          <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>MAC</Label>
              </span>
              <span className="secondary">
                {bmc.interface.mac}
              </span>
            </Box>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>Network</Label>
              </span>
              <span className="secondary">
                {netName(bmc.interface)}
              </span>
            </Box>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>Configuration type</Label>
              </span>
              <span className="secondary">
                {netConfigType(bmc.interface, true)}
              </span>
            </Box>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>Configuration IPv4</Label>
              </span>
              <span className="secondary">
                <Anchor href={`http://${netConfigIpv4(bmc.interface, true)}`}>
                  {netConfigIpv4(bmc.interface, true)}
                </Anchor>
              </span>
            </Box>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>Lease IPv4</Label>
              </span>
              <span className="secondary">
                <Anchor href={`http://${bmc.interface.lease && bmc.interface.lease.ipv4}`}>
                  {bmc.interface.lease && bmc.interface.lease.ipv4}
                </Anchor>
              </span>
            </Box>
            <Box justify="between" direction="row" pad="small">
              <span>
                <Label>Last seen</Label>
              </span>
              <span className="secondary">
                {bmc.interface.lease && <Timestamp value={bmc.interface.lease.lastSeen}/>}
              </span>
            </Box>
          </Box>
        </Columns>
      </Section>
    </div>
  )
}

// XXX: consider adding a table of machines using a BMC within this BMC view

class Bmc_ extends React.Component {
  render() {
    const { history, data, layers, ...props } = this.props

    return (
      <div>
        <DocumentTitle title={`${data.bmc.name} - ${globalBannerName}`} />
        <Split
          flex="left"
          priority="left"
          fixed={false}
          showOnResponsive="both"
        >
          <Box pad={{ horizontal: 'large' }}>
            <Heading tag="h2">
              {data.bmc.name}
            </Heading>

            <BmcOverview bmc={data.bmc} onEdit={props.openEdit} />

            <Section>
              <Heading tag="h3">Linked machines</Heading>
              <MachineTiles machines={data.bmc.machines} />
            </Section>
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
            <Check permission={perms.BMC_ADMIN} entity={data.bmc}>
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
                    label="Delete BMC"
                    onClick={props.openDeleteBmc}
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
            <BmcEdit bmc={data.bmc} onDone={props.closeEdit} />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeleteBmc}
          onClose={props.closeDeleteBmc}
          align="right"
        >
          <Box pad="medium">
            <BmcDelete
              bmc={data.bmc}
              onCancel={props.closeDeleteBmc}
              onDone={() => history.push('/bmcs')}
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

export const Bmc = compose(
  graphql(bmcGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      variables: { id: match.params.bmc_id },
    }),
  }),
  connect(null, mapDispatchToProps),
  withLayerState(['edit', 'deleteBmc']),
  withApolloStatus(NetworkLoading, NetworkError)
)(Bmc_)

export default Bmc
