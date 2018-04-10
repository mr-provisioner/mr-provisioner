import React from 'react'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Split from 'grommet/components/Split'
import Sidebar from 'grommet/components/Sidebar'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import EditIcon from 'grommet/components/icons/base/Edit'
import TrashIcon from 'grommet/components/icons/base/Trash'
import Menu from 'grommet/components/Menu'
import Columns from 'grommet/components/Columns'
import Heading from 'grommet/components/Heading'
import Timestamp from 'grommet/components/Timestamp'
import Section from 'grommet/components/Section'
import Label from 'grommet/components/Label'
import Anchor from 'grommet/components/Anchor'
import CheckBox from 'grommet/components/CheckBox'
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
import { archGQL, changeArchGQL } from '../../graphql/arch'
import * as messageActions from '../../actions/message'
import ArchEdit from './archEdit'
import ArchAddSubarch from './archAddSubarch'
import ArchEditSubarch from './archEditSubarch'
import ArchRemoveSubarch from './archRemoveSubarch'
import ArchDelete from './archDelete'
import { check, perms, Check } from '../../util/permissions'
import withOwnUser from '../../hoc/withOwnUser'
import withLayerState from '../../hoc/withLayerState'
import MachineTiles from '../machine/machineTiles'
import * as comparators from '../../util/comparators'

function ArchOverview({ ownUser, arch, onEdit }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Overview
        </Heading>
        <Check permission={perms.ARCH_ADMIN} entity={arch}>
          <Button icon={<EditIcon />} onClick={onEdit} />
        </Check>
      </Box>
      <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
        <Box justify="between" direction="row" pad="small">
          <span>
            <Label>Description</Label>
          </span>
          <span className="secondary">
            {arch.description}
          </span>
        </Box>
      </Box>
    </Section>
  )
}

const bootloaderName = subarch =>
  subarch.bootloader
    ? `${subarch.bootloader.filename} (${subarch.bootloader.description})`
    : 'None'

const sortByName = comparators.string(['name'])
const sortByDescription = comparators.string(['description'])
const sortByBootloader = comparators.string([], bootloaderName)
const sortByEfiboot = comparators.boolean(['efiboot'])

function ArchSubarchs({ arch, onAdd, onEdit, onRemove }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Subarchitecture
        </Heading>
        <Check permission={perms.ARCH_ADMIN}>
          <Button icon={<AddIcon />} onClick={onAdd} />
        </Check>
      </Box>
      <Table keyCol="id" data={arch.subarchs}>
        <TableColumn
          label="Name"
          sortFn={sortByName}
          cell={<TextCell col="name" />}
        />
        <TableColumn
          label="Description"
          sortFn={sortByDescription}
          cell={<TextCell col="description" />}
        />
        <TableColumn
          label="Bootloader"
          sortFn={sortByBootloader}
          cell={<TextCell textFn={bootloaderName} />}
        />
        <TableColumn
          label="Efiboot"
          sortFn={sortByEfiboot}
          cell={
            <AnyCell
              fn={p =>
                <CheckBox disabled={true} toggle={true} checked={p.efiboot} />}
            />
          }
        />
        <TableColumn
          label=""
          cell={
            <AnyCell
              fn={s =>
                <div>
                  <Check permission={perms.ARCH_ADMIN} entity={arch}>
                    <span style={{ marginRight: '1.5em' }}>
                      <Anchor onClick={() => onEdit(s.id)}>Edit</Anchor>
                    </span>
                    <span>
                      <Anchor onClick={() => onRemove(s.id)}>Remove</Anchor>
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

class Arch_ extends React.Component {
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
              {data.arch.name}
            </Heading>

            <ArchOverview
              arch={data.arch}
              ownUser={ownUser}
              onEdit={props.openEditOverview}
            />

            <ArchSubarchs
              arch={data.arch}
              onAdd={props.openAddSubarch}
              onEdit={props.openEditSubarch}
              onRemove={props.openRemoveSubarch}
            />

            <Section>
              <Heading tag="h3">Linked machines</Heading>
              <MachineTiles machines={data.arch.machines} />
            </Section>
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
            <Check permission={perms.ARCH_ADMIN} entity={data.arch}>
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
                  <Check permission={perms.ARCH_ADMIN}>
                    <Button
                      icon={<TrashIcon />}
                      label="Delete Architecture"
                      onClick={props.openDeleteArch}
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
            <ArchEdit arch={data.arch} onDone={props.closeEditOverview} />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showAddSubarch}
          onClose={props.closeAddSubarch}
          align="right"
        >
          <Box pad="medium">
            <ArchAddSubarch arch={data.arch} onDone={props.closeAddSubarch} />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showEditSubarch}
          onClose={props.closeEditSubarch}
          align="right"
        >
          <Box pad="medium">
            <ArchEditSubarch
              arch={data.arch}
              subarch={layers.editSubarchVar}
              onDone={props.closeEditSubarch}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showRemoveSubarch}
          onClose={props.closeRemoveSubarch}
          align="right"
        >
          <Box pad="medium">
            <ArchRemoveSubarch
              arch={data.arch}
              subarch={layers.removeSubarchVar}
              onCancel={props.closeRemoveSubarch}
              onDone={props.closeRemoveSubarch}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeleteArch}
          onClose={props.closeDeleteArch}
          align="right"
        >
          <Box pad="medium">
            <ArchDelete
              arch={data.arch}
              onCancel={props.closeDeleteArch}
              onDone={() => history.push('/archs')}
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

export const Arch = compose(
  graphql(archGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      variables: { id: match.params.arch_id },
    }),
  }),
  connect(null, mapDispatchToProps),
  withOwnUser(),
  withLayerState([
    'editOverview',
    'addSubarch',
    [
      'editSubarch',
      ({ data }, id) => data.arch.subarchs.find(i => i.id === id),
    ],
    [
      'removeSubarch',
      ({ data }, id) => data.arch.subarchs.find(i => i.id === id),
    ],
    'deleteArch',
  ]),
  withApolloStatus(NetworkLoading, NetworkError)
)(Arch_)

export default Arch
