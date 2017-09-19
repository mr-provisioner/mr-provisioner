from sqlalchemy import and_, or_
import operator
import sexpdata


def op_match(col, expr):
    if not isinstance(expr, str):
        raise TypeError('=~ operator requires a string as second operand')

    return col.like('%' + expr + '%')


OP_TABLE = {
    'or': or_,
    'and': and_,
    '=': operator.eq,
    '!=': operator.ne,
    '>': operator.gt,
    '>=': operator.ge,
    '<': operator.lt,
    '<=': operator.le,
    '=~': op_match,
}


def resolve_sym(sym_table, sym):
    if isinstance(sym, sexpdata.Symbol):
        s = sym.tosexp()
        return sym_table[s]
    else:
        return sym


def walk_ast(ast, sym_table):
    if not isinstance(ast, list):
        return resolve_sym(sym_table, ast)

    if len(ast) < 1:
        raise ValueError('s-expr is empty')

    op, *rest = ast

    if not isinstance(op, sexpdata.Symbol):
        raise ValueError('s-expr operation must be a symbol')

    op_name = op.tosexp()

    try:
        op_fn = OP_TABLE[op_name]
        subexps = [walk_ast(e, sym_table) for e in rest]
        return op_fn(*subexps)
    except KeyError:
        raise ValueError('`%s` is not a valid operation' % op_name)


def build_filter(query_str, sym_table):
    if not query_str:
        return None

    try:
        query = sexpdata.loads(query_str, nil=None)
        return walk_ast(query, sym_table)
    except AssertionError:
        raise ValueError('failed to parse query')
