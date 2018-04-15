import React from 'react'
import Box from 'grommet/components/Box'
import Tiles from 'grommet/components/Tiles'
import Tile from 'grommet/components/Tile'
import Anchor from 'grommet/components/Anchor'
import Header from 'grommet/components/Header'
import Heading from 'grommet/components/Heading'
import Timestamp from 'grommet/components/Timestamp'
import { Link } from 'react-router-dom'
import Select from '../select'
import { NetworkLoading, NetworkError } from '../network'
import Layer from '../layer'
import withLayerState from '../../hoc/withLayerState'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { compose, withProps, withState } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { discoveredMacsListGQL } from '../../graphql/discovery'
import Search from 'grommet/components/Search'
import * as comparators from '../../util/comparators'

function buildQueryStr(d) {
  let q = `?addWithMac=${d.mac}`

  if (d.info && d.info.hostname) q = `${q}&hostname=${d.info.hostname}`

  if (d.info && d.info.arch) q = `${q}&arch=${d.info.arch}`

  return q
}

const matchValue = (searchText, value) =>
  value === null
    ? false
    : typeof value === 'object'
      ? Object.keys(value).reduce(
          (m, k) => m || matchValue(searchText, value[k]),
          false
        )
      : Array.isArray(value)
        ? value.reduce((m, v) => m || matchValue(searchText, v), false)
        : `${value}`.toLowerCase().indexOf(searchText) >= 0

function matchesSearch(searchText, d) {
  if (d.mac.toLowerCase().indexOf(searchText) >= 0) return true

  return matchValue(searchText, d.info || {})
}

const sortByLastSeen = comparators.descending(comparators.date(['lastSeen']))

function DiscoveredList_({ data, layers, history, ...props }) {
  let discoveredMacs = data.discoveredMacs
    .map(d => ({
      ...d,
      info: JSON.parse(d.info),
    }))
    .sort(sortByLastSeen)

  if (props.searchText)
    discoveredMacs = discoveredMacs.filter(d =>
      matchesSearch(props.searchText.toLowerCase(), d)
    )

  return (
    <div>
      <Box
        align="end"
        alignContent="end"
        justify="between"
        direction="row"
        pad={{ vertical: 'small' }}
      >
        <Box />
        <Search
          placeHolder="Search"
          inline={true}
          value={props.searchText}
          onDOMChange={ev => props.updateSearchText(ev.target.value)}
        />
      </Box>
      <Tiles fill={true} size="large">
        {discoveredMacs &&
          discoveredMacs.map(d =>
            <Tile key={d.id} align="start" separator="top">
              <Header size="small" pad={{ horizontal: 'small' }}>
                <Heading tag="h4">
                  {d.mac}
                </Heading>
              </Header>
              <Box pad={{ horizontal: 'small' }}>
                <dl style={{ marginBottom: '0' }}>
                  <dt>Last seen</dt>
                  <dd>
                    <Timestamp value={d.lastSeen} />
                  </dd>
                  {Object.keys(d.info || {}).reduce(
                    (acc, k) =>
                      acc.concat([
                        <dt key={`k-${k}`}>
                          {k}
                        </dt>,
                        <dd key={`v-${k}`}>
                          {d.info[k]}
                        </dd>,
                      ]),
                    []
                  )}
                </dl>
              </Box>
              <Box
                pad={{ horizontal: 'small' }}
                direction="row"
                justify="between"
              >
                <span style={{ marginRight: '2em', padding: '8px 0px' }}>
                  <Anchor
                    onClick={() => history.push(`/machines${buildQueryStr(d)}`)}
                  >
                    New machine
                  </Anchor>
                </span>
                <span style={{ marginBottom: '1em', padding: '8px 0px' }}>
                  <Anchor onClick={() => props.openAddToMachine(d)}>
                    Add to existing
                  </Anchor>
                </span>
                <span style={{ marginRight: '2em', padding: '8px 0px' }}>
                  <Anchor
                    onClick={() => history.push(`/bmcs${buildQueryStr(d)}`)}
                  >
                    New BMC
                  </Anchor>
                </span>
              </Box>

              <Box
                pad={{ horizontal: 'small' }}
                direction="row"
                justify="between"
              />
            </Tile>
          )}
      </Tiles>
      <Layer
        closer={true}
        show={layers.showAddToMachine}
        onClose={props.closeAddToMachine}
        align="center"
      >
        <Box pad="medium">
          <Header>
            <Heading tag="h2">Select a machine</Heading>
          </Header>
          <Select
            options={data.machines}
            value={null}
            searchKeys={['name', 'bmc.name']}
            onChange={id =>
              history.push(
                `/machines/${id}${buildQueryStr(layers.addToMachineVar)}`
              )}
            valueKey="id"
            labelFn={m => `${m.name} (${m.bmc ? m.bmc.name : 'no BMC'})`}
          />
        </Box>
      </Layer>
    </div>
  )
}

export const DiscoveredList = compose(
  graphql(discoveredMacsListGQL, {
    options: {
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'network-only',
    },
  }),
  withState('searchText', 'updateSearchText', ''),
  withLayerState([['addToMachine', (props, d) => d]]),
  withApolloStatus(NetworkLoading, NetworkError)
)(DiscoveredList_)

export default DiscoveredList
