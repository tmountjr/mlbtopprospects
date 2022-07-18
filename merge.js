import fs from 'fs';
import crypto from 'crypto';

const global = JSON.parse(fs.readFileSync('./prospects/top100.json').toString());
const byTeam = JSON.parse(fs.readFileSync('./prospects/byTeam.json').toString());

class Player {
  constructor(name, position, eta, team) {
    this.name = name;
    this.position = position;
    this.eta = eta;
    this.global_rank = null;
    this.team_rank = null;
    this.team = team;
  }

  get hash() {
    return crypto.createHash('md5').update(`${this.name}|${this.position}|${this.eta}|${this.team}`).digest('hex')
  }
}

const players = new Map();
for (const team in byTeam) {
  for (const p of byTeam[team]) {
    const player = new Player(p.name, p.position, p.eta, p.team);
    player.team_rank = p.rank;
    const playerHash = player.hash;
    if (!players.has(playerHash)) {
      players.set(playerHash, player);
    }
  }
}

for (const p of global) {
  let player = new Player(p.name, p.position, p.eta, p.team);
  const playerHash = player.hash;
  if (!players.has(playerHash)) {
    player.global_rank = p.rank;
  } else {
    player = players.get(playerHash);
    player.global_rank = p.rank;
  }
  players.set(playerHash, player);
}

const merged = Array.from(players.values());
fs.writeFileSync('./prospects/merged.json', JSON.stringify(merged));

// also dump this as a CSV
const header = 'Name,Position,ETA,Global Rank,Team Rank,Team';
const contents = merged.map(p => {
  const line = [p.name, p.position, p.eta, p.global_rank, p.team_rank, p.team].map(v => `"${v}"`).join(',');
  return `${line}\n`;
});
fs.writeFileSync('./prospects/merged.csv', `${header}\n${contents}`);