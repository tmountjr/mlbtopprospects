import * as fs from 'fs';

export function toCsv(players, filename) {
  const header = 'Name,Position,ETA,Global Rank,Team Rank,Team,Owner';
  const contents = players.map(player => {
    const line = [player.name, player.position, player.eta, player.global_rank, player.team_rank, player.team, player.owner]
      .map(v => `"${v}"`)
      .join(',')
    return `${line}\n`
  })
  fs.writeFileSync(filename, `${header}\n${contents}`)
}