import React from 'react'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Button from 'grommet/components/Button'
import Menu from 'grommet/components/Menu'
import Split from 'grommet/components/Split'
import Sidebar from 'grommet/components/Sidebar'
import Label from 'grommet/components/Label'
import Heading from 'grommet/components/Heading'
import { Link } from 'react-router-dom'
import DocumentDownloadIcon from 'grommet/components/icons/base/DocumentDownload'
import { NetworkLoading, NetworkError } from '../network'
import { withApolloStatus } from '../../hoc/apollo'
import { graphql } from 'react-apollo'
import { withHandlers, compose } from 'recompose'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import * as messageActions from '../../actions/message'
import { machineConsoleGQL } from '../../graphql/machine'
import Terminal from 'xterm'

const LOG_LIMIT = 32 * 1024 * 1024

class MachineConsole_ extends React.Component {
  ws = null
  term = null
  log = ''
  consoleDivRef = null

  disconnectWS() {
    if (this.term) {
      this.term.off('data', this.handleTermData)
    }

    if (this.ws) {
      this.ws.onclose = function() {}
      this.ws.onerror = function() {}
      this.ws.close()
      this.ws = null
    }
  }

  componentDidMount() {
    const { data } = this.props
    this.disconnectWS()
    this.log = ''

    const https = window.location.protocol === 'https:'
    const wsHost = data.consoleToken.host || window.location.hostname
    const wsPort = data.consoleToken.port || 8866
    const wsToken = data.consoleToken.token
    const wsUri = `${https
      ? 'wss'
      : 'ws'}://${wsHost}:${wsPort}/ws?token=${wsToken}`

    this.ws = new WebSocket(wsUri)
    this.ws.binaryType = 'arraybuffer'
    this.ws.onclose = this.handleWSClose
    this.ws.onerror = this.handleWSError

    this.term = new Terminal()
    this.term.open(this.consoleDivRef)

    this.ws.onmessage = this.handleWSMessage
    this.term.on('data', this.handleTermData)
  }

  componentWillUnmount() {
    this.disconnectWS()
    this.log = ''
  }

  handleTermData = data => {
    if (this.ws) this.ws.send(new TextEncode().encode(data))
  }

  handleWSMessage = msg => {
    if (msg.data instanceof ArrayBuffer) {
      const strData = String.fromCharCode.apply(null, new Uint8Array(msg.data))
      this.term.write(strData)
      this.logText(strData)
    } else {
      this.props.actions.showErrorMessage(`Server-side error: ${msg.data}.`, 0)
    }
  }

  handleWSClose = () => {
    this.props.actions.showErrorMessage(`WebSocket closed.`, 0)
  }

  handleWSError = () => {
    this.props.actions.showErrorMessage(`WebSocket error.`, 0)
  }

  logText = strData => {
    this.log += strData

    const excessChars = this.log.length - LOG_LIMIT

    if (excessChars > 0) {
      this.log = this.log.slice(excessChars)
    }
  }

  handleOpenLog = ev => {
    ev.preventDefault()
    window.open(
      'data:text/plain;base64,' + encodeURIComponent(window.btoa(this.log))
    )
  }

  render() {
    const { data } = this.props

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
              Console for{' '}
              <Link to={`/machines/${data.machine.id}`}>
                {data.machine.name}
              </Link>
            </Heading>
            <div
              ref={elem => {
                this.consoleDivRef = elem
              }}
            />
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
                  icon={<DocumentDownloadIcon />}
                  label="Download log"
                  onClick={this.handleOpenLog}
                  plain={true}
                />
              </Menu>
            </Box>
          </Sidebar>
        </Split>
      </div>
    )
  }
}

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...messageActions }, dispatch),
})

export const MachineConsole = compose(
  graphql(machineConsoleGQL, {
    options: ({ match }) => ({
      notifyOnNetworkStatusChange: true,
      fetchPolicy: 'network-only',
      variables: { id: match.params.machine_id },
    }),
  }),
  connect(null, mapDispatchToProps),
  withApolloStatus(NetworkLoading, NetworkError)
)(MachineConsole_)

export default MachineConsole
