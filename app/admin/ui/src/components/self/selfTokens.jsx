import React from 'react'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import Heading from 'grommet/components/Heading'
import Section from 'grommet/components/Section'
import Label from 'grommet/components/Label'
import Anchor from 'grommet/components/Anchor'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import Layer from '../layer'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { ownTokensListGQL, deleteOwnTokenGQL } from '../../graphql/self'
import * as messageActions from '../../actions/message'
import SelfAddToken from './selfAddToken'
import withLayerState from '../../hoc/withLayerState'
import * as comparators from '../../util/comparators'

const sortByToken = comparators.string(['token'])
const sortByDesc = comparators.string(['desc'])

function TokensList({ tokens, onAdd, onRemove }) {
  return (
    <Section>
      <Box align="center" direction="row">
        <Heading tag="h2" style={{ marginBottom: 0 }}>
          Tokens
        </Heading>
        <Button icon={<AddIcon />} onClick={onAdd} />
      </Box>
      <Table keyCol="id" data={tokens}>
        <TableColumn
          label="Description"
          sortFn={sortByDesc}
          cell={<TextCell col="desc" />}
        />
        <TableColumn
          label="Token"
          sortFn={sortByToken}
          cell={<TextCell col="token" />}
        />
        <TableColumn
          label=""
          cell={
            <AnyCell
              fn={i =>
                <div>
                  <span>
                    <Anchor onClick={() => onRemove(i.id)}>Remove</Anchor>
                  </span>
                </div>}
            />
          }
        />
      </Table>
    </Section>
  )
}

class SelfTokens_ extends React.Component {
  handleRemoveToken = id => {
    const { actions, data } = this.props

    this.props
      .deleteOwnToken({
        variables: {
          id: id,
        },
      })
      .then(({ data: { deleteOwnToken: { ok, errors } } }) => {
        if (ok && errors.length > 0)
          actions.showWarningMessage(
            `Token removed, but: ${errors.join(', ')}.`
          )
        else if (ok) actions.showOkMessage(`Token removed successfully.`)
        else
          actions.showErrorMessage(
            `Error deleting token: ${errors.join(', ')}.`
          )
      })
      .catch(error => {
        actions.showErrorMessage(error.message || error)
      })
  }

  render() {
    const { data, layers, ...props } = this.props

    return (
      <div>
        <Box pad={{ horizontal: 'large' }}>
          <TokensList
            tokens={data.tokens}
            onAdd={props.openAddToken}
            onRemove={this.handleRemoveToken}
          />
        </Box>

        <Layer
          closer={true}
          show={layers.showAddToken}
          onClose={props.closeAddToken}
          align="right"
        >
          <Box pad="medium">
            <SelfAddToken onDone={props.closeAddToken} />
          </Box>
        </Layer>
      </div>
    )
  }
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

export const SelfTokens = compose(
  graphql(ownTokensListGQL, {
    options: {
      notifyOnNetworkStatusChange: true,
    },
  }),
  graphql(deleteOwnTokenGQL, {
    name: 'deleteOwnToken',
    options: {
      refetchQueries: [
        {
          query: ownTokensListGQL,
        },
      ],
    },
  }),
  connect(null, mapDispatchToProps),
  withLayerState(['addToken']),
  withApolloStatus(NetworkLoading, NetworkError)
)(SelfTokens_)

export default SelfTokens
