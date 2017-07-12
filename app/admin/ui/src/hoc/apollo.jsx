import { branch, renderComponent, compose } from 'recompose'

export const withApolloLoadingStatus = (LoadingComponent, propName = 'data') =>
  branch(
    props => props[propName].networkStatus === 1,
    renderComponent(LoadingComponent)
  )

export const withApolloErrorStatus = (ErrorComponent, propName = 'data') =>
  branch(props => props[propName].error, renderComponent(ErrorComponent))

export const withApolloStatus = (
  LoadingComponent,
  ErrorComponent,
  propName = 'data'
) =>
  compose(
    withApolloLoadingStatus(LoadingComponent, propName),
    withApolloErrorStatus(ErrorComponent, propName)
  )
