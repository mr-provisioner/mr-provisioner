import React from 'react'
import { Link } from 'react-router-dom'
import Box from 'grommet/components/Box'
import Table_ from 'grommet/components/Table'
import TableHeader_ from 'grommet/components/TableHeader'
import TableRow_ from 'grommet/components/TableRow'
import ReactPaginate from 'react-paginate'
import Search from 'grommet/components/Search'
import Anchor from 'grommet/components/Anchor'
import Fuse from 'fuse.js'
import { escapeRegExp } from '../util/index'

export function TableColumn(props) {
  const { label, cell } = props
}

export class Table extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      sortAscending: props.sortAscending || true,
      sortIndex: props.sortIndex || 0,
      page: 0,
      pageSize: 15,
      showAll: false,
      searchText: '',
    }
  }

  handleSort = (index, ascending) =>
    this.setState({ sortAscending: ascending, sortIndex: index })

  handlePageChange = ({ selected }) => this.setState({ page: selected })

  handleSearchChange = ev => this.setState({ searchText: ev.target.value })

  getFilteredData = () => {
    if (this.state.searchText.length === 0) {
      return this.props.data
    }

    let fuse = new Fuse(this.props.data, {
      shouldSort: true,
      caseSensitive: false,
      minMatchCharLength: 0,
      location: 0,
      distance: 30,
      threshold: 0.25,
      keys: this.props.filterKeys,
    })

    let filteredData = fuse.search(escapeRegExp(this.state.searchText))

    return filteredData
  }

  handlePageSizeChange = ev =>
    this.setState({ pageSize: parseInt(ev.target.value) })

  render() {
    const {
      data,
      children,
      keyCol,
      filterKeys,
      pagination,
      additionalControls,
      ...otherProps
    } = this.props

    let labels = []
    let columns = []

    React.Children.forEach(children, child => {
      labels.push(child.props.label)
      columns.push(child.props)
    })

    const sortCol = columns[this.state.sortIndex]

    const filteredData = this.getFilteredData()

    let sortedData = filteredData.slice()

    if (sortCol.sortFn) {
      sortedData.sort(sortCol.sortFn)
      if (!this.state.sortAscending) sortedData.reverse()
    }

    let indexStart, indexEnd
    let pageCount = 1

    if (pagination && !this.state.showAll) {
      pageCount = Math.floor(
        (filteredData.length + this.state.pageSize - 1) / this.state.pageSize
      )

      indexStart = this.state.page * this.state.pageSize
      indexEnd = indexStart + this.state.pageSize
      indexEnd = indexEnd < sortedData.length ? indexEnd : sortedData.length

      sortedData = sortedData.slice(indexStart, indexEnd)
    }

    return (
      <div>
        <Box align="end" alignContent="end" justify="between" direction="row">
          <Box>
            {pagination && <div />}
            {additionalControls &&
              <Box>
                {additionalControls}
              </Box>}
          </Box>
          {filterKeys &&
            filterKeys.length > 0 &&
            <Search
              placeHolder="Search"
              inline={true}
              value={this.state.searchText}
              onDOMChange={this.handleSearchChange}
            />}
        </Box>
        <Table_ {...otherProps}>
          <TableHeader_
            labels={labels}
            onSort={this.handleSort}
            sortIndex={this.state.sortIndex}
            sortAscending={this.state.sortAscending}
          />
          <tbody>
            {sortedData.map((row, index) =>
              <TableRow_
                key={row[keyCol]}
                className={
                  index % 2 === 0
                    ? 'grommetux-background-color-index-light-1'
                    : 'grommetux-background-color-index-light-2'
                }
              >
                {columns.map((col, index) =>
                  <td key={labels[index] || index}>
                    {React.cloneElement(col.cell, { data: row })}
                  </td>
                )}
              </TableRow_>
            )}
          </tbody>
        </Table_>
        {pagination &&
          <Box align="end" alignContent="end" direction="row" justify="between">
            <Box>
              <p>
                {!this.state.showAll
                  ? `Showing ${indexStart +
                      1} to ${indexEnd} of ${data.length} entries`
                  : `Showing all ${data.length} entries`}
                <span style={{ display: 'inline-block', marginLeft: '1em' }}>
                  <Anchor
                    onClick={() =>
                      this.setState(state => ({ showAll: !state.showAll }))}
                  >
                    {this.state.showAll ? 'Show less' : 'Show all'}
                  </Anchor>
                </span>
              </p>
            </Box>
            <ReactPaginate
              containerClassName="react-paginate"
              pageCount={pageCount}
              pageRangeDisplayed={3}
              marginPagesDisplayed={2}
              onPageChange={this.handlePageChange}
              forcePage={this.state.page}
            />
          </Box>}
      </div>
    )
  }
}

export function LinkCell({ data, cond, linkFn, textFn, linkCol, textCol }) {
  if (linkCol) linkFn = data => data[linkCol]

  if (textCol) textFn = data => data[textCol]

  return (
    (!cond || cond(data)) &&
    <Link to={linkFn(data)}>
      {textFn(data)}
    </Link>
  )
}

export function TextCell({ data, cond, textFn, col }) {
  if (col) textFn = data => data[col]

  return (
    (!cond || cond(data)) &&
    <span>
      {textFn(data)}
    </span>
  )
}

export function AnyCell({ data, cond, fn }) {
  return (!cond || cond(data)) && fn(data)
}
