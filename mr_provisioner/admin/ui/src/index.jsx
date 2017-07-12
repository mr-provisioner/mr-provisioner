import React from 'react'
import ReactDOM from 'react-dom'
import { HashRouter as Router } from 'react-router-dom'
import { ApolloClient, ApolloProvider } from 'react-apollo'
import { createNetworkInterface } from './util/multipartNetworkInterface'
import { Provider } from 'react-redux'
import store from './store/index'
import App from './components/app'
import { logout } from './actions/auth'

const networkInterface = createNetworkInterface({
  uri: '/admin/graphql',
  opts: {
    credentials: 'same-origin',
  },
})

networkInterface.useAfter([
  {
    applyAfterware({ response }, next) {
      if (response.status === 401) {
        store.dispatch(logout())
      }

      next()
    },
  },
])

const client = new ApolloClient({
  networkInterface: networkInterface,
})

const DevTools =
  process.env.NODE_ENV !== 'production'
    ? require('./store/devtools').default
    : null

ReactDOM.render(
  <div style={{ height: '100%' }}>
    <Provider store={store}>
      <ApolloProvider client={client}>
        <Router>
          <App />
        </Router>
      </ApolloProvider>
    </Provider>
    {DevTools !== null && <DevTools store={store} />}
  </div>,
  document.getElementById('app')
)
