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
import CheckBox from 'grommet/components/CheckBox'
import Columns from 'grommet/components/Columns'
import Heading from 'grommet/components/Heading'
import Section from 'grommet/components/Section'
import Label from 'grommet/components/Label'
import Timestamp from 'grommet/components/Timestamp'
import { Link } from 'react-router-dom'
import Layer from '../layer'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, withState, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { imageGQL, changeImageFlagsGQL } from '../../graphql/image'
import * as messageActions from '../../actions/message'
import ImageEditMeta from './imageEditMeta'
import ImageDelete from './imageDelete'
import { check, perms, Check } from '../../util/permissions'
import withOwnUser from '../../hoc/withOwnUser'
import withLayerState from '../../hoc/withLayerState'
import MachineTiles from '../machine/machineTiles'

function ImageOverview({
  ownUser,
  image,
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
        <Check permission={perms.IMAGE_OWNER} entity={image}>
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
              {image.description}
            </span>
          </Box>

          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Type</Label>
            </span>
            <span className="secondary">
              {image.fileType}
            </span>
          </Box>

          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Architecture</Label>
            </span>
            <span className="secondary">
              {image.arch
                ? <Link to={'/archs/' + image.arch.id}>{`${image.arch
                    .name} (${image.arch.description || ''})`}</Link>
                : 'None'}
            </span>
          </Box>

          <Box justify="between" direction="row" pad="small">
            <span>
              <Label>Owner</Label>
            </span>
            <span className="secondary">
              {image.user ? image.user.username : '(none)'}
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
                disabled={!check(ownUser, perms.IMAGE_OWNER, image)}
                toggle={true}
                checked={image.knownGood}
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
                disabled={!check(ownUser, perms.IMAGE_OWNER, image)}
                toggle={true}
                checked={image.public}
                onChange={onPublicChange}
              />
            </span>
          </Box>
        </Box>
      </Columns>
    </Section>
  )
}

class Image_ extends React.Component {
  handlePublicChange = ev => {
    const { actions, data } = this.props

    this.props
      .flagsMutation({
        variables: {
          id: data.image.id,
          public: ev.target.checked,
        },
      })
      .then(({ data: { changeImageFlags: { ok, image, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Image ${image.filename} marked as ${!image.public
              ? 'non-'
              : ''}public, but: ${errors.join(', ')}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Image ${image.filename} marked as ${!image.public
              ? 'non-'
              : ''}public.`
          )
        else
          actions.showErrorMessage(
            `Error changing public setting for image ${image.filename}: ${errors.join(
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
          id: data.image.id,
          knownGood: ev.target.checked,
        },
      })
      .then(({ data: { changeImageFlags: { ok, image, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Image ${image.filename} marked as ${!image.knownGood
              ? 'not '
              : ''}known good, but: ${errors.join(', ')}.`
          )
        else if (ok)
          actions.showOkMessage(
            `Image ${image.filename} marked as ${!image.knownGood
              ? 'not '
              : ''}known good.`
          )
        else
          actions.showErrorMessage(
            `Error changing public setting for image ${image.filename}: ${errors.join(
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
        <Split
          flex="left"
          priority="left"
          fixed={false}
          showOnResponsive="both"
        >
          <Box pad={{ horizontal: 'large' }}>
            <Heading tag="h2">
              {data.image.filename}
            </Heading>

            <ImageOverview
              image={data.image}
              ownUser={ownUser}
              onEdit={props.openEditMeta}
              onKnownGoodChange={this.handleKnownGoodChange}
              onPublicChange={this.handlePublicChange}
            />

            <Section>
              <Heading tag="h3">Linked machines</Heading>
              <MachineTiles machines={data.image.machines} />
            </Section>
          </Box>
          <Sidebar full={true} size="small" pad={{ horizontal: 'medium' }}>
            <Check permission={perms.IMAGE_OWNER} entity={data.image}>
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
                    label="Delete Image"
                    onClick={props.openDeleteImage}
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
            <ImageEditMeta image={data.image} onDone={props.closeEditMeta} />
          </Box>
        </Layer>

        <Layer
          closer={true}
          show={layers.showDeleteImage}
          onClose={props.closeDeleteImage}
          align="right"
        >
          <Box pad="medium">
            <ImageDelete
              image={data.image}
              onCancel={props.closeDeleteImage}
              onDone={() => history.push('/images')}
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

export const Image = compose(
  graphql(imageGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      variables: { id: match.params.image_id },
    }),
  }),
  graphql(changeImageFlagsGQL, {
    name: 'flagsMutation',
    options: ({ match }) => ({
      refetchQueries: [
        {
          query: imageGQL,
          variables: { id: match.params.image_id },
        },
      ],
    }),
  }),
  connect(null, mapDispatchToProps),
  withOwnUser(),
  withLayerState(['editMeta', 'deleteImage']),
  withApolloStatus(NetworkLoading, NetworkError)
)(Image_)

export default Image
