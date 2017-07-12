import configureStore from './configureStore'
import reducer from '../reducers/index'

const initialState = {}

export default configureStore(reducer, initialState)
