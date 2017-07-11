import React from 'react'
import Box from 'grommet/components/Box'
import Tiles from 'grommet/components/Tiles'
import Tile from 'grommet/components/Tile'
import Anchor from 'grommet/components/Anchor'
import Header from 'grommet/components/Header'
import Heading from 'grommet/components/Heading'
import { Link } from 'react-router-dom'

export function MachineTiles({ machines }) {
  return (
    <Tiles fill={true} size="large">
      {machines &&
        machines.map(m =>
          <Tile key={m.id} align="start">
            <Header size="medium" pad={{ horizontal: 'medium' }}>
              <Heading tag="h4">
                <Link to={`/machines/${m.id}`}>
                  {m.name}
                </Link>
              </Heading>
            </Header>
          </Tile>
        )}
    </Tiles>
  )
}

export default MachineTiles
