import pathOr from 'ramda/src/pathOr'
import comparator from 'ramda/src/comparator'
import length from 'ramda/src/length'
import identity from 'ramda/src/identity'
import descend from 'ramda/src/descend'

export const arrayLength = path =>
  comparator(
    (a, b) => length(pathOr([], path, a)) < length(pathOr([], path, b))
  )

export const string = (path, xform = identity) => (a, b) =>
  pathOr('', path, a).localeCompare(pathOr('', path, b))

export const boolean = path => (a, b) =>
  pathOr(false, path, a) - pathOr(false, path, b)

export const date = path => (a, b) =>
  new Date(pathOr(0, path, a)) - new Date(pathOr(0, path, b))

export const descending = descend
