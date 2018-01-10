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
import CheckBox from 'grommet/components/CheckBox'
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
import { withHandlers, withState, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import {
  preseedGQL,
  changePreseedContentsGQL,
  changePreseedFlagsGQL,
} from '../../graphql/preseed'
import * as messageActions from '../../actions/message'
import PreseedEditMeta from './preseedEditMeta'
import PreseedEditContents from './preseedEditContents'
import PreseedDelete from './preseedDelete'
import { check, perms, Check } from '../../util/permissions'
import withOwnUser from '../../hoc/withOwnUser'
import withLayerState from '../../hoc/withLayerState'
import MachineTiles from '../machine/machineTiles'

function PreseedContent_({ preseed, onEdit, onEditCancel, onDone, editing }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Contents
        </Heading>
        <Check permission={perms.PRESEED_OWNER} entity={preseed}>
          {!editing && <Button icon={<EditIcon />} onClick={onEdit} />}
        </Check>
      </Box>
      <Box pad={{ horizontal: 'none', vertical: 'small' }}>
        {!editing
          ? <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                wordBreak: 'break-all',
              }}
            >
              {preseed.fileContent}
            </pre>
          : <PreseedEditContents
              preseed={preseed}
              onCancel={onEditCancel}
              onDone={onDone}
            />}
      </Box>
    </Section>
  )
}

const PreseedContent = compose(
  withState('editing', 'updateEditing', false),
  withHandlers({
    onEdit: props => event => props.updateEditing(true),
    onEditCancel: props => event => props.updateEditing(false),
    onDone: props => event => props.updateEditing(false),
  })
)(PreseedContent_)

function PreseedOverview({
  ownUser,
  preseed,
  onEdit,
  onKnownGoodChange,
  onPublicChange,
}) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h3" style={{ marginBottom: 0 }}>
          Overview
        </Heading>
        <Check permission={perms.PRESEED_OWNER} entity={preseed}>
          <Button icon={<EditIcon />} onClick={onEdit} />
        </Check>
      </Box>
      <Columns maxCount={2} size="medium" justify="between" responsive={false}>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Description</Label>
            </span>
            <span className="secondary">
              {preseed.description}
            </span>
          </Box>

          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Type</Label>
            </span>
            <span className="secondary">
              {preseed.fileType}
            </span>
          </Box>
        </Box>
        <Box pad={{ horizontal: 'medium', vertical: 'small' }}>
          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Known good</Label>
            </span>
            <span className="secondary">
              <CheckBox
                disabled={!check(ownUser, perms.PRESEED_OWNER, preseed)}
                toggle={true}
                checked={preseed.knownGood}
                onChange={onKnownGoodChange}
              />
            </span>
          </Box>

          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Public</Label>
            </span>
            <span className="secondary">
              <CheckBox
                disabled={!check(ownUser, perms.PRESEED_OWNER, preseed)}
                toggle={true}
                checked={preseed.public}
                onChange={onPublicChange}
              />
            </span>
          </Box>
        </Box>
      </Columns>
    </Section>
  )
}

class Preseed_ extends React.Component {
  handlePublicChange = ev => {
    const { actions, data } = this.props

    this.props
      .flagsMutation({
        variables: {
          id: data.preseed.id,
          public: ev.target.checked,
        },
      })
      .then(({ data: { changePreseedFlags: { ok, preseed, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Preseed ${preseed.filename} marked as ${!preseed.public
              ? 'non-'
              : ''}public, but: ${errors.join(', ')}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Preseed ${preseed.filename} marked as ${!preseed.public
              ? 'non-'
              : ''}public.`
          )
        else
          actions.showErrorMessage(
            `Error changing public setting for preseed ${preseed.filename}: ${errors.join(
              ', '
            )}.`
          )
      })
      .catch(error => {
        actions.showErrorMessage(error.message || error)
      })
  }

  handleKnownGoodChange = ev => {
    const { actions, data } = this.props

    this.props
      .flagsMutation({
        variables: {
          id: data.preseed.id,
          knownGood: ev.target.checked,
        },
      })
      .then(({ data: { changePreseedFlags: { ok, preseed, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Preseed ${preseed.filename} marked as ${!preseed.knownGood
              ? 'not '
              : ''}known good, but: ${errors.join(', ')}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Preseed ${preseed.filename} marked as ${!preseed.knownGood
              ? 'not '
              : ''}known good.`
          )
        else
          actions.showErrorMessage(
            `Error changing public setting for preseed ${preseed.filename}: ${errors.join(
              ', '
            )}.`
          )
      })
      .catch(error => {
        actions.showErrorMessage(error.message || error)
      })
  }

  render() {
    const { history, data, ownUser, layers, ...props } = this.props

    return (
      <div>
        <DocumentTitle
          title={`${data.preseed.filename} - ${globalBannerName}`}
        />
        <Split
          flex="left"
          priority="left"
          fixed={false}
          showOnResponsive="both"
        >
          <Box pad={{ horizontal: 'large' }}>
            <Heading tag="h2">
              {data.preseed.filename}
            </Heading>

            <PreseedOverview
              preseed={data.preseed}
              ownUser={ownUser}
              onEdit={props.openEditMeta}
              onKnownGoodChange={this.handleKnownGoodChange}
              onPublicChange={this.handlePublicChange}
            />

            <PreseedContent preseed={data.preseed} />

            <Section>
              <Heading tag="h3">Linked machines</Heading>
              <MachineTiles machines={data.preseed.machines} />
            </Section>
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
            <Check permission={perms.PRESEED_OWNER} entity={data.preseed}>
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
                    label="Delete Preseed"
                    onClick={props.openDeletePreseed}
                    plain={true}
                  />
                </Menu>
              </Box>
            </Check>
          </Sidebar>
        </Split>

        <Layer
          closer={true}
          show={layers.showEditMeta}
          onClose={props.closeEditMeta}
          align="right"
        >
          <Box pad="medium">
            <PreseedEditMeta
              preseed={data.preseed}
              onDone={props.closeEditMeta}
            />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeletePreseed}
          onClose={props.closeDeletePreseed}
          align="right"
        >
          <Box pad="medium">
            <PreseedDelete
              preseed={data.preseed}
              onCancel={props.closeDeletePreseed}
              onDone={() => history.push('/preseeds')}
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

export const Preseed = compose(
  graphql(preseedGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      variables: { id: match.params.preseed_id },
    }),
  }),
  graphql(changePreseedFlagsGQL, {
    name: 'flagsMutation',
    options: ({ match }) => ({
      refetchQueries: [
        {
          query: preseedGQL,
          variables: { id: match.params.preseed_id },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withOwnUser(),
  withLayerState(['editMeta', 'deletePreseed']),
  withApolloStatus(NetworkLoading, NetworkError)
)(Preseed_)

export default Preseed
