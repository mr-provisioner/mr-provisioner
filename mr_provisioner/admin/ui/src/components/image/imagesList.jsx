import React from 'react'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import CheckBox from 'grommet/components/CheckBox'
import Timestamp from 'grommet/components/Timestamp'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import ImageNew from './imageNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose } from 'recompose'
import { bindActionCreators } from 'redux'
import { connect } from 'react-redux'
import { imagesListGQL } from '../../graphql/image'
import withLayerState from '../../hoc/withLayerState'
import withOwnUser from '../../hoc/withOwnUser'
import * as prefsActions from '../../actions/prefs'
import * as comparators from '../../util/comparators'

const archName = image => (image.arch ? image.arch.name : 'None')

const sortByName = comparators.string(['filename'])
const sortByDesc = comparators.string(['description'])
const sortByType = comparators.string(['fileType'])
const sortByUser = comparators.string(['user', 'username'])
const sortByArch = comparators.string([], archName)
const sortByUploadDate = comparators.date(['date'])
const sortByKnownGood = comparators.boolean(['knownGood'])
const sortByPublic = comparators.boolean(['public'])

class ImagesList_ extends React.Component {
  state = {
    showForm: false,
    toast: null,
  }

  handleFormClose = ev => this.setState({ showForm: false })

  handleFormOpen = ev => this.setState({ showForm: true })

  render() {
    const { actions, prefs, ownUser, data, layers, ...props } = this.props

    let images = data.images

    if (prefs['imagesList.onlyMine'])
      images = images.filter(m => m.user && m.user.id == ownUser.id)

    return (
      <div>
        <Table
          keyCol="id"
          data={images}
          filterKeys={[
            'filename',
            'description',
            'fileType',
            'arch.name',
            'user.username',
          ]}
          pagination={true}
          additionalControls={
            <CheckBox
              label="Only show my images"
              checked={prefs['imagesList.onlyMine']}
              onChange={ev =>
                actions.setPref('imagesList.onlyMine', ev.target.checked)}
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
                linkFn={p => `/images/${p.id}`}
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
            label="Arch"
            sortFn={sortByArch}
            cell={<TextCell textFn={archName} />}
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
            cell={
              <TextCell textFn={p => (p.user ? p.user.username : '(none)')} />
            }
          />

          <TableColumn
            label="Upload date"
            sortFn={sortByUploadDate}
            cell={<AnyCell fn={i => <Timestamp value={i.date} />} />}
          />
        </Table>

        <Button
          icon={<AddIcon />}
          label="Add an image"
          onClick={props.openForm}
        />
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <ImageNew onDone={props.closeForm} />
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

export const ImagesList = compose(
  graphql(imagesListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withLayerState(['form']),
  withOwnUser(),
  connect(mapStateToProps, mapDispatchToProps),
  withApolloStatus(NetworkLoading, NetworkError)
)(ImagesList_)

export default ImagesList
