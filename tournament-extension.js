/* ================================
   TOURNAMENT EXTENSION (SAFE PATCH)
   ================================ */

/* -------- 1. HELPER -------- */
function tournamentById(id){
  return state.tournaments.find(t=>t.id===id);
}

function getTournamentRules(t){
  if(t?.rulesetId==='custom' && t.customRules){
    return {...t.customRules, name:'Eigenes Regelwerk'};
  }
  return RULESETS[t?.rulesetId] || RULESETS.all_fish;
}

/* -------- 2. SCORE ENGINE -------- */
function computeTournamentScores(tournament){
  const catches = state.catches
    .filter(c=>c.tournamentId === tournament.id)
    .sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));

  const rules = getTournamentRules(tournament);

  const allowed = tournament.participantIds?.length
    ? tournament.participantIds
    : state.participants.map(p=>p.id);

  const scoreMap = new Map(
    allowed.map(id=>[
      id,
      {
        participant: participantById(id),
        points:0,
        catches:0,
        totalWeight:0,
        bonuses:[],
        species:new Set()
      }
    ])
  );

  const add=(id,pts,label)=>{
    const row = scoreMap.get(id);
    if(!row) return;
    row.points += pts;
    if(label) row.bonuses.push(label);
  };

  catches.forEach((c)=>{
    const row = scoreMap.get(c.participantId);
    if(!row) return;

    row.catches++;
    row.totalWeight += Number(c.weightKg||0);
    row.points += rules.pointsPerFish || 0;

    const s = speciesName(c);
    if(rules.bonusNewSpecies && !row.species.has(s)){
      row.species.add(s);
      add(c.participantId, rules.bonusNewSpecies, `Neue Art ${s}`);
    }

    if(rules.bonusOver80cm && c.lengthCm >= 80){
      add(c.participantId, rules.bonusOver80cm, '>80cm');
    }
  });

  return {
    catches,
    rows:[...scoreMap.values()]
      .sort((a,b)=>b.points-a.points || b.totalWeight-a.totalWeight)
  };
}

/* -------- 3. STORY ENGINE -------- */
function buildTournamentStory(tournament,result){
  if(!result.catches.length){
    return `<p>Noch keine Daten für ${tournament.name}</p>`;
  }

  const leader = result.rows[0];
  const total = result.catches.length;

  const biggest = result.catches.reduce(
    (m,c)=>!m||c.weightKg>m.weightKg?c:m,null
  );

  return `
    <p><strong>${tournament.name}</strong> läuft!</p>
    <p>Leader: ${leader.participant?.name} mit ${leader.points} Punkten</p>
    <p>Grösster Fisch: ${speciesName(biggest)} ${biggest.lengthCm} cm</p>
    <p>${total} Fänge im Turnier</p>
  `;
}

/* -------- 4. SAFE RENDER PATCH -------- */
(function(){
  if(typeof renderTournaments !== 'function') return;

  const original = renderTournaments;

  renderTournaments = function(){
    original();

    try{
      const tournament = state.tournaments.find(t=>!t.finished);
      if(!tournament) return;

      const result = computeTournamentScores(tournament);

      const storyEl = document.getElementById('tournamentStory');
      if(storyEl){
        storyEl.innerHTML = buildTournamentStory(tournament,result);
      }

    }catch(e){
      console.warn('Tournament extension error', e);
    }
  };
})();
