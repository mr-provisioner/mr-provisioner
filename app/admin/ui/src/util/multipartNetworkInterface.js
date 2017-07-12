import { HTTPFetchNetworkInterface, printAST } from 'apollo-client'
import partition from 'ramda/src/partition'
import map from 'ramda/src/map'
import forEachObjIndexed from 'ramda/src/forEachObjIndexed'

const isFile = variable =>
  typeof File !== 'undefined' && variable instanceof File

const isFileList = variable =>
  typeof FileList !== 'undefined' && variable instanceof FileList

const isFileVariable = variable => isFile(variable) || isFileList(variable)

const expandFileList = variable =>
  isFileList(variable) ? Array.from(variable) : [variable]

const extractFilesFromVariables = variables => {
  const [files, vars] = partition(isFileVariable, variables)

  return [map(expandFileList, files), vars]
}

class MultipartHTTPFetchNetworkInterface extends HTTPFetchNetworkInterface {
  constructor(uri, opts) {
    super(uri, opts)
    this.multipartUri = uri
  }

  fetchFromRemoteEndpoint({ request, options }) {
    const [files, variables] = extractFilesFromVariables(
      request.variables || []
    )

    if (Object.keys(files).length > 0) {
      const form = new FormData()

      forEachObjIndexed(
        (values, key) => values.forEach(value => form.append(key, value)),
        files
      )

      form.append('operationName', request.operationName)
      form.append('query', printAST(request.query))
      form.append('variables', JSON.stringify(variables))

      return fetch(this.multipartUri, {
        method: 'POST',
        body: form,
        ...options,
      })
    } else {
      return super.fetchFromRemoteEndpoint({ request, options })
    }
  }
}

export function createNetworkInterface({ uri, opts = {} }) {
  return new MultipartHTTPFetchNetworkInterface(uri, opts)
}
