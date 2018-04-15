import React from 'react'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import AddIcon from 'grommet/components/icons/base/Add'
import { Table, TableColumn, LinkCell, TextCell, AnyCell } from '../table'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import BmcNew from './bmcNew'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose } from 'recompose'
import { connect } from 'react-redux'
import { bmcsListGQL } from '../../graphql/bmc'
import withLayerState from '../../hoc/withLayerState'
import * as comparators from '../../util/comparators'

const sortByName = comparators.string(['name'])
const sortByIp = comparators.string(['ip'])
const sortByType = comparators.string(['bmcType'])

class BmcsList_ extends React.Component {
  render() {
    const { data, layers, ...props } = this.props

    return (
      <div>
        <Table
          keyCol="id"
          data={data.bmcs}
          filterKeys={['name', 'ip']}
          pagination={true}
        >
          <TableColumn
            label="Name"
            sortFn={sortByName}
            cell={
              <LinkCell linkFn={b => `/bmcs/${b.id}`} textFn={b => b.name} />
            }
          />
          <TableColumn
            label="IP"
            sortFn={sortByIp}
            cell={<TextCell col="ip" />}
          />
          <TableColumn
            label="Type"
            sortFn={sortByType}
            cell={<TextCell col="bmcType" />}
          />
        </Table>

        <Button icon={<AddIcon />} label="Add a BMC" onClick={props.openForm} />
        <Layer
          closer={true}
          show={layers.showForm}
          onClose={props.closeForm}
          align="right"
        >
          <Box pad="medium">
            <BmcNew
              addWithMac={props.query.addWithMac}
              query={props.query}
              onDone={props.closeForm}
            />
          </Box>
        </Layer>
      </div>
    )
  }
}

export const BmcsList = compose(
  graphql(bmcsListGQL, { options: { notifyOnNetworkStatusChange: true } }),
  withProps(ownProps => ({
    query: parse(ownProps.location.search),
    queryString: ownProps.location.search,
  })),
  withLayerState([['form', null, ({ query }) => query.addWithMac || false]]),
  withApolloStatus(NetworkLoading, NetworkError)
)(BmcsList_)

export default BmcsList
