import React from 'react'
import AppContainer from 'grommet/components/App'
import Header from 'grommet/components/Header'
import Title from 'grommet/components/Title'
import Box from 'grommet/components/Box'
import Menu from 'grommet/components/Menu'
import Anchor from 'grommet/components/Anchor'
import UserSettingsIcon from 'grommet/components/icons/base/UserSettings'
import MoreIcon from 'grommet/components/icons/base/More'
import Section from 'grommet/components/Section'
import Paragraph from 'grommet/components/Paragraph'
import Footer from 'grommet/components/Footer'
import { Route, Link, Switch, Redirect, withRouter } from 'react-router-dom'
import MachinesList from './machine/machinesList'
import MachineConsole from './machine/machineConsole'
import Machine from './machine/machine'
import BmcsList from './bmc/bmcsList'
import Bmc from './bmc/bmc'
import PreseedsList from './preseed/preseedsList'
import Preseed from './preseed/preseed'
import ImagesList from './image/imagesList'
import Image from './image/image'
import NetworksList from './network/networksList'
import Network from './network/network'
import UsersList from './user/usersList'
import User from './user/user'
import Self from './self/self'
import SelfTokens from './self/selfTokens'
import RequireLogin from './requireLogin'
import Notifications from './notifications'
import DiscoveredList from './discovery/discoveredList'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux'
import { compose, branch, renderComponent } from 'recompose'
import { check, perms, Check } from '../util/permissions'
import * as authActions from '../actions/auth'

export function AppHeader_({ loggedIn, self, actions, history }) {
  return (
    <Section colorIndex="brand" pad={{ horizontal: 'large' }}>
      <Header size="medium" justify="between">
        <Title>
          {typeof globalBannerName === 'string'
            ? globalBannerName
            : 'mr-provisioner'}
        </Title>
        <Box flex={false} direction="row" responsive={false}>
          {loggedIn &&
            <Menu responsive={true} inline={true} direction="row">
              <Anchor
                className={
                  history.location.pathname.startsWith('/machines')
                    ? 'active'
                    : ''
                }
                path="/machines"
              >
                Machines
              </Anchor>
              <Anchor
                className={
                  history.location.pathname.startsWith('/images')
                    ? 'active'
                    : ''
                }
                path="/images"
              >
                Images
              </Anchor>
              <Anchor
                className={
                  history.location.pathname.startsWith('/preseeds')
                    ? 'active'
                    : ''
                }
                path="/preseeds"
              >
                Preseeds
              </Anchor>
              <Check permission={perms.BMC_ADMIN}>
                <Anchor
                  className={
                    history.location.pathname.startsWith('/bmcs')
                      ? 'active'
                      : ''
                  }
                  path="/bmcs"
                >
                  BMCs
                </Anchor>
              </Check>
              <Check permission={perms.BMC_ADMIN}>
                <Anchor
                  className={
                    history.location.pathname.startsWith('/discovery')
                      ? 'active'
                      : ''
                  }
                  path="/discovery"
                >
                  Discovery
                </Anchor>
              </Check>
              <Check permission={perms.NETWORK_ADMIN}>
                <Anchor
                  className={
                    history.location.pathname.startsWith('/networks')
                      ? 'active'
                      : ''
                  }
                  path="/networks"
                >
                  Networks
                </Anchor>
              </Check>
              <Check permission={perms.USER_ADMIN}>
                <Anchor
                  className={
                    history.location.pathname.startsWith('/users')
                      ? 'active'
                      : ''
                  }
                  path="/users"
                >
                  Users
                </Anchor>
              </Check>
              <Menu
                label={self.username}
                icon={<UserSettingsIcon />}
                dropAlign={{ right: 'right' }}
              >
                <Anchor path="/self">Settings</Anchor>
                <Anchor path="/self/tokens">Tokens</Anchor>
                <Anchor onClick={actions.logout}>Logout</Anchor>
              </Menu>
            </Menu>}
        </Box>
      </Header>
    </Section>
  )
}

const mapStateToProps = (state, ownProps) => ({
  loggedIn: state.auth.loggedIn,
  self: state.auth.self,
})

const mapDispatchToProps = dispatch => ({
  actions: bindActionCreators({ ...authActions }, dispatch),
})

const AppHeader = compose(
  withRouter,
  connect(mapStateToProps, mapDispatchToProps)
)(AppHeader_)

export function AppFooter(props) {
  return (
    <Section
      colorIndex="light-2"
      pad={{ horizontal: 'large', vertical: 'medium' }}
    >
      <Footer justify="between">
        <Box direction="row" align="center" pad={{ between: 'medium' }}>
          <Paragraph margin="none">© 2017 Linaro</Paragraph>
          <Menu direction="row" size="small" dropAlign={{ right: 'right' }}>
            <Anchor href="https://mr-provisioner.readthedocs.io">
              Documentation
            </Anchor>
          </Menu>
        </Box>
      </Footer>
    </Section>
  )
}

export function AppMain(props) {
  return (
    <Section pad={{ horizontal: 'large', vertical: 'medium' }}>
      <Switch>
        <Route exact path="/" render={() => <Redirect to="/machines" />} />
        <Route path="/machines">
          <Switch>
            <Route exact path="/machines" component={MachinesList} />
            <Route exact path="/machines/:machine_id" component={Machine} />
            <Route
              exact
              path="/machines/:machine_id/console"
              component={MachineConsole}
            />
          </Switch>
        </Route>
        <Route path="/bmcs">
          <Switch>
            <Route exact path="/bmcs" component={BmcsList} />
            <Route path="/bmcs/:bmc_id" component={Bmc} />
          </Switch>
        </Route>
        <Route path="/preseeds">
          <Switch>
            <Route exact path="/preseeds" component={PreseedsList} />
            <Route path="/preseeds/:preseed_id" component={Preseed} />
          </Switch>
        </Route>
        <Route path="/images">
          <Switch>
            <Route exact path="/images" component={ImagesList} />
            <Route path="/images/:image_id" component={Image} />
          </Switch>
        </Route>
        <Route path="/networks">
          <Switch>
            <Route exact path="/networks" component={NetworksList} />
            <Route path="/networks/:network_id" component={Network} />
          </Switch>
        </Route>
        <Route path="/users">
          <Switch>
            <Route exact path="/users" component={UsersList} />
            <Route path="/users/:user_id" component={User} />
          </Switch>
        </Route>
        <Route path="/self">
          <Switch>
            <Route exact path="/self" component={Self} />
            <Route path="/self/tokens" component={SelfTokens} />
          </Switch>
        </Route>
        <Route path="/discovery">
          <Switch>
            <Route exact path="/discovery" component={DiscoveredList} />
          </Switch>
        </Route>
      </Switch>
    </Section>
  )
}

export function App(props) {
  return (
    <div>
      <Notifications />
      <AppContainer centered={false}>
        <AppHeader />
        <RequireLogin>
          <AppMain />
        </RequireLogin>
        <AppFooter />
      </AppContainer>
    </div>
  )
}

export default App
