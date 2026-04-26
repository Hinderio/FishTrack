function getTournamentBonusMap(){
  const map = {};
  const list = window.state.tournaments || (typeof tournaments !== "undefined" ? tournaments : []) || [];

  list.forEach(t => {
    if (!t || !t.finished || !t.winner) return;

    const names = Array.isArray(t.winner.names)
      ? t.winner.names
      : (t.winner.name ? [t.winner.name] : []);

    const points = Number(t.winnerPoints ?? t.winner_points ?? 0);
    if (!points || points <= 0) return;

    names.forEach(name => {
      const cleanName = String(name || "").replace(/[^a-zA-Z0-9 äöüÄÖÜß]/g, "").trim();
      if (!cleanName) return;
      map[cleanName] = (map[cleanName] || 0) + points;
    });

    const ids = Array.isArray(t.winner.participantIds) ? t.winner.participantIds : [];
    ids.forEach(id => {
      if (!id) return;
      map[id] = (map[id] || 0) + points;
    });
  });

  return map;
}

function tournamentBonusTier(points){
  if(points >= 250) return 6;
  if(points >= 200) return 5;
  if(points >= 150) return 4;
  if(points >= 100) return 3;
  if(points >= 50) return 2;
  return 1;
}




const STORAGE_KEY='fishtrack-norway-v2';const THEME_KEY='fishtrack-theme';const speciesPalette={'Barsch':'#8ff0a7','Hecht':'#ffb84d','Zander':'#66e7ff','Forelle':'#ff8ab4','Dorsch':'#b7a0ff','Andere':'#d4dbe3'};const RULESETS={all_fish:{id:'all_fish',name:'Jeder Fisch zählt',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:5,bonusLargestPerSpecies:3,bonusNewArea:0,bonusOver80cm:0,bonusOver100cm:0},first_fish:{id:'first_fish',name:'Erster Fisch gewinnt',pointsPerFish:1,bonusFirstFish:10,bonusLargestFish:5,bonusLargestPerSpecies:0,bonusNewArea:0,bonusOver80cm:0,bonusOver100cm:0},species_hunter:{id:'species_hunter',name:'Artenjäger',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:0,bonusLargestPerSpecies:5,bonusNewArea:0,bonusOver80cm:0,bonusOver100cm:0,bonusNewSpecies:3},trophy_hunter:{id:'trophy_hunter',name:'Trophy Hunter',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:10,bonusLargestPerSpecies:3,bonusNewArea:0,bonusOver80cm:2,bonusOver100cm:5},explorer:{id:'explorer',name:'Entschneidern / Spot Explorer',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:5,bonusLargestPerSpecies:0,bonusNewArea:5,bonusOver80cm:0,bonusOver100cm:0}};const defaultData={meta:{tripName:'Fish Battle / Global',tripSubtitle:'Fänge, Fangorte und Teilnehmer-Leaderboard'},participants:[{id:crypto.randomUUID(),name:'Nico',color:'#4ad7d1',avatar:'🎣'},{id:crypto.randomUUID(),name:'Dad',color:'#ffb84d',avatar:'🧢'}],catches:[],tournaments:[]};(()=>{const now=new Date(),p1=defaultData.participants[0].id,p2=defaultData.participants[1].id,baseLat=59.915,baseLng=10.78,demo=[['Hecht',91,6.8,p1,-6,6,'Gummifisch','Nordufer'],['Barsch',34,0.65,p2,-5,18,'Spinner','Steg'],['Zander',63,2.7,p1,-4,21,'Jig','Tiefenkante'],['Barsch',29,0.42,p1,-3,7,'Wobbler','Schilfkante'],['Hecht',78,4.9,p2,-2,9,'Jerkbait','Bucht Ost'],['Forelle',47,1.4,p1,-1,14,'Spinner','Zulauf'],['Zander',58,2.1,p2,0,20,'Jig','Tiefenkante']];defaultData.catches=demo.map((d,i)=>{const dt=new Date(now);dt.setDate(now.getDate()+d[4]);dt.setHours(d[5],20,0,0);return{id:crypto.randomUUID(),species:d[0],customSpecies:'',lengthCm:d[1],weightKg:d[2],participantId:d[3],timestamp:dt.toISOString(),bait:d[6],spotLabel:d[7],note:'',location:{lat:baseLat+((i%3)*0.015),lng:baseLng+((i%4)*0.02),label:d[7]},createdAt:new Date().toISOString()}})})();

let state = loadState();
window.state = state;

const db = window.supabaseClient;

async function loadFromSupabase() {
  if (!db) {
    hasLoadedFromSupabase = true;
    return;
  }

  try {
    const { data: participants, error: participantsError } = await db
      .from('participants')
      .select('*');

    const { data: tournaments, error: tournamentsError } = await db
      .from('tournaments')
      .select('*');

    const { data: catches, error: catchesError } = await db
  .from('catches')
  .select('*')
  .order('caught_at', { ascending: true });    
    
    if (participantsError) throw participantsError;
    if (tournamentsError) throw tournamentsError;
    if (catchesError) throw catchesError;
    console.log('geladene catches aus supabase', catches);

    state.participants = participants || [];
    state.tournaments = (tournaments || []).map(t => ({
      ...t,
      start: t.start ?? t.start_date ?? '',
      end: t.end ?? t.end_date ?? '',
      rulesetId: t.rulesetId ?? t.ruleset_id ?? 'all_fish',
      customRules: t.customRules ?? t.custom_rules ?? null,
      participantIds: t.participantIds ?? t.participant_ids ?? [],
      finished: Boolean(t.finished),
      finishedAt: t.finishedAt ?? t.finished_at ?? null,
      winner: t.winner ?? null,
      winnerPoints: Number(t.winnerPoints ?? t.winner_points ?? 0)
    }));
window.state.tournaments = state.tournaments;

state.catches = (catches || []).map(c => ({
  id: c.id,
  species: c.species || 'Andere',
  customSpecies: c.customSpecies || c.custom_species || '',
  participantId: c.participantId || c.angler || '',
  tournamentId: c.tournamentId || c.tournament_id || '',
  lengthCm: Number(c.lengthCm ?? c.length_cm ?? 0),
  weightKg: Number(c.weightKg ?? c.weight_kg ?? 0),
  timestamp: c.timestamp || c.caught_at,
  bait: c.bait || '',
  spotLabel: c.spotLabel || c.spot_label || '',
  note: c.note || '',
  createdAt: c.createdAt || c.created_at || c.caught_at || new Date().toISOString(),
  location: {
    lat: c.latitude != null 
      ? Number(c.latitude) 
      : (c.location?.lat != null ? Number(c.location.lat) : null),
    
    lng: c.longitude != null 
      ? Number(c.longitude) 
      : (c.location?.lng != null ? Number(c.location.lng) : null),
    label: c.location?.label || c.spotLabel || c.spot_label || ''
  }
}));

if (typeof renderCharts === 'function') {
  renderCharts();
}

if (typeof window.renderSpeciesTimeline === 'function') {
  try {
  if (typeof renderSpeciesTimeline === "function") {
  try {
    renderSpeciesTimeline();
  } catch (e) {
    console.warn("Timeline error:", e);
  }
}
} catch (e) {
  console.warn("Timeline error:", e);
}
}

hasLoadedFromSupabase = true;
localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
ensureCatchDropdownFields();
rerender();
if (typeof refreshAnalyticsTournamentSelect === 'function') refreshAnalyticsTournamentSelect();

  } catch (err) {
    console.error('Fehler beim Laden aus Supabase:', err);
    hasLoadedFromSupabase = true;
  }
}

async function saveCatchToSupabase(entry) {
  if (!db) return;

  const payload = {
  id: entry.id,
  tournament_id: entry.tournamentId || null,
  angler: entry.participantId || '',
  species: entry.species || 'Andere',
  weight_kg: entry.weightKg ? Number(entry.weightKg) : null,
  length_cm: entry.lengthCm ? Number(entry.lengthCm) : null,
  country: 'Norway',
  latitude: entry.location?.lat != null ? Number(entry.location.lat) : null,
  longitude: entry.location?.lng != null ? Number(entry.location.lng) : null,
  caught_at: entry.timestamp,
  bait: entry.bait || null,
  spot_label: entry.spotLabel || null,
  note: entry.note || null
};

const { error, data } = await db
  .from('catches')
  .upsert(payload, { onConflict: 'id' })
  .select();

  console.log('payload:', payload);
  console.log('result:', data);

  if (error) {
    console.error('Catch speichern fehlgeschlagen:', error);
  } else {
    console.log('Catch gespeichert');
  }
}

window.saveCatchToSupabase = saveCatchToSupabase;

async function saveParticipantToSupabase(participant) {
  if (!db) return;

  const { error } = await db
    .from('participants')
    .upsert(participant, { onConflict: 'id' });

  if (error) {
    console.error('Participant speichern fehlgeschlagen:', error, participant);
  }
}

async function saveTournamentToSupabase(tournament) {
  if (!db) return;

  const payload = {
    id: tournament.id,
    name: tournament.name,
    country: 'Norway',
    start_date: tournament.start || null,
    end_date: tournament.end || null,
    ruleset_id: tournament.rulesetId || 'all_fish',
    custom_rules: tournament.customRules || null,
    participant_ids: tournament.participantIds || [],
    finished: Boolean(tournament.finished),
    finished_at: tournament.finishedAt || null,
    winner: tournament.winner || null,
    winner_points: Number(tournament.winnerPoints || 0)
  };

  const { error } = await db
    .from('tournaments')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Tournament speichern fehlgeschlagen:', error, payload);
  } else {
    console.log('Tournament gespeichert');
  }
}


let charts = {};
let map;let markersLayer;let selectedDashboardCatchId=null;let pendingCatchFocusId=null;let beforeInstallPromptEvent=null;let activeTournamentId=null;let weatherEnabled=false;let weatherControlAdded=false;let weatherControlEl=null;let weatherPopupRequestId=0;const WEATHER_CACHE_TTL=10*60*1000;const weatherCache=new Map();function formatWeatherValue(value,suffix=''){const n=Number(value);return Number.isFinite(n)?`${Math.round(n)}${suffix}`:'–'}function getWeatherCacheKey(lat,lon){return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`}async function getWeather(lat,lon){const key=getWeatherCacheKey(lat,lon),cached=weatherCache.get(key),now=Date.now();if(cached&&now-cached.timestamp<WEATHER_CACHE_TTL)return cached.data;const params=new URLSearchParams({latitude:String(lat),longitude:String(lon),current:['temperature_2m','relative_humidity_2m','apparent_temperature','precipitation','cloud_cover','wind_speed_10m','wind_direction_10m','weather_code'].join(','),wind_speed_unit:'ms',timezone:'auto'});try{const res=await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);if(!res.ok) throw new Error(`Weather ${res.status}`);const data=await res.json();if(data?.current)weatherCache.set(key,{timestamp:now,data});return data}catch(err){console.error('Weather fetch failed',err);return null}}function weatherDescription(code){const map={0:'Klar',1:'Meist klar',2:'Teilweise bewölkt',3:'Bedeckt',45:'Neblig',48:'Raureifnebel',51:'Leichter Niesel',53:'Niesel',55:'Starker Niesel',56:'Leichter gefrierender Niesel',57:'Gefrierender Niesel',61:'Leichter Regen',63:'Regen',65:'Starker Regen',66:'Leichter gefrierender Regen',67:'Gefrierender Regen',71:'Leichter Schnee',73:'Schnee',75:'Starker Schneefall',77:'Schneekörner',80:'Leichte Regenschauer',81:'Regenschauer',82:'Starke Regenschauer',85:'Leichte Schneeschauer',86:'Schneeschauer',95:'Gewitter',96:'Gewitter mit Hagel',99:'Starkes Gewitter mit Hagel'};return map[code]||'Wetterdaten'}function buildWeatherPopupHtml(data){const current=data?.current;if(!current)return '<div class="weather-popup weather-popup--error">Keine Wetterdaten verfügbar.</div>';const updated=current.time?new Date(current.time).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}):'–';return `<div class="weather-popup"><div class="weather-popup__header">🌤️ <strong>${formatWeatherValue(current.temperature_2m,'°C')}</strong><span>${weatherDescription(current.weather_code)}</span></div><div class="weather-popup__grid"><div><span>Gefühlt</span><strong>${formatWeatherValue(current.apparent_temperature,'°C')}</strong></div><div><span>Wind</span><strong>${formatWeatherValue(current.wind_speed_10m,' m/s')}</strong></div><div><span>Wolken</span><strong>${formatWeatherValue(current.cloud_cover,'%')}</strong></div><div><span>Feuchte</span><strong>${formatWeatherValue(current.relative_humidity_2m,'%')}</strong></div><div><span>Niederschlag</span><strong>${Number.isFinite(Number(current.precipitation))?`${Number(current.precipitation).toFixed(1)} mm`:'–'}</strong></div><div><span>Aktualisiert</span><strong>${updated}</strong></div></div></div>`}function setWeatherControlState({loading=false}={}){if(!weatherControlEl)return;weatherControlEl.classList.toggle('active',weatherEnabled);weatherControlEl.classList.toggle('loading',loading);weatherControlEl.setAttribute('aria-pressed',weatherEnabled?'true':'false');weatherControlEl.setAttribute('title',weatherEnabled?'Wettermodus aktiv – Klick auf Karte für Wetterdaten':'Wettermodus aktivieren');weatherControlEl.innerHTML=loading?'<span class="weather-spinner" aria-hidden="true"></span>':'🌡️'}function initWeatherControl(){if(!map||weatherControlAdded||typeof L==="undefined")return;const control=L.control({position:"topright"});control.onAdd=function(){const div=L.DomUtil.create("button","leaflet-bar weather-control");div.type='button';div.setAttribute('aria-label','Wettermodus auf der Karte umschalten');div.innerHTML='🌡️';weatherControlEl=div;setWeatherControlState();L.DomEvent.disableClickPropagation(div);L.DomEvent.on(div,"click",(e)=>{L.DomEvent.stop(e);weatherEnabled=!weatherEnabled;setWeatherControlState();if(!weatherEnabled&&map)map.closePopup()});return div};control.addTo(map);weatherControlAdded=true;if(!map._weatherClickBound){map.on("click",async function(e){if(!weatherEnabled)return;const requestId=++weatherPopupRequestId;setWeatherControlState({loading:true});const loadingPopup=L.popup({closeButton:true,offset:[0,-8]}).setLatLng(e.latlng).setContent('<div class="weather-popup weather-popup--loading">Wetter wird geladen …</div>').openOn(map);const data=await getWeather(e.latlng.lat,e.latlng.lng);if(requestId!==weatherPopupRequestId)return;if(!weatherEnabled){setWeatherControlState();return}if(!data||!data.current){loadingPopup.setContent('<div class="weather-popup weather-popup--error">Open-Meteo konnte für diesen Punkt gerade keine Daten liefern.</div>');setWeatherControlState();return}loadingPopup.setContent(buildWeatherPopupHtml(data));setWeatherControlState()});map._weatherClickBound=true;}};function loadState(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return structuredClone(defaultData);try{const data=JSON.parse(raw);return{meta:data.meta||structuredClone(defaultData.meta),participants:Array.isArray(data.participants)?data.participants:[],catches:Array.isArray(data.catches)?data.catches:[],tournaments:Array.isArray(data.tournaments)?data.tournaments:[]}}catch{return structuredClone(defaultData)}}

let isSyncing = false;

async function persist() {
  if (!hasLoadedFromSupabase) return;
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  if (!db || isSyncing) return;

  isSyncing = true;

  try {
    await Promise.all(state.participants.map(saveParticipantToSupabase));
    await Promise.all(state.tournaments.map(saveTournamentToSupabase));
    await Promise.all(state.catches.map(saveCatchToSupabase));
  } catch (err) {
    console.error('Sync fehlgeschlagen', err);
  } finally {
    isSyncing = false;
  }
}

function fmtKg(v){return`${Number(v||0).toFixed(2)} kg`}function fmtDateTime(v){const d=new Date(v);return d.toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}function startOfDay(date){const d=new Date(date);d.setHours(0,0,0,0);return d}function sameDay(a,b){return startOfDay(a).getTime()===startOfDay(b).getTime()}function participantById(id){return state.participants.find(p=>p.id===id)}function speciesName(c){return c.species==='Andere'?(c.customSpecies||'Andere'):c.species}function computeParticipantStats(){return state.participants.map(p=>{const catches=state.catches.filter(c=>c.participantId===p.id);const totalWeight=catches.reduce((s,c)=>s+Number(c.weightKg||0),0);const heaviest=catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null);const totalLength=catches.reduce((s,c)=>s+Number(c.lengthCm||0),0);const points=catches.reduce((s,c)=>{let pts=1+Math.ceil(Number(c.weightKg||0));if(Number(c.lengthCm||0)>=80)pts+=1;if(Number(c.lengthCm||0)>=100)pts+=2;return s+pts},0);return{...p,catches,count:catches.length,totalWeight,avgWeight:catches.length?totalWeight/catches.length:0,avgLength:catches.length?totalLength/catches.length:0,points,heaviest}}).sort((a,b)=>b.points-a.points||b.totalWeight-a.totalWeight)}function computeSummary(){const totalCatches=state.catches.length,totalWeight=state.catches.reduce((s,c)=>s+Number(c.weightKg||0),0),avgWeight=totalCatches?totalWeight/totalCatches:0,biggest=state.catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null),todayCount=state.catches.filter(c=>sameDay(c.timestamp,new Date())).length,leaderboard=computeParticipantStats(),leader=leaderboard[0],byHour=Array.from({length:24},(_,h)=>({hour:h,count:state.catches.filter(c=>new Date(c.timestamp).getHours()===h).length})),bestHour=byHour.reduce((m,h)=>h.count>m.count?h:m,{hour:0,count:0});return{totalCatches,totalWeight,avgWeight,biggest,todayCount,leader,bestHour,leaderboard}}function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}function computeSeniorityLevel(participant,tournaments=[]){
  const nameKey=String(participant?.name||'').replace(/[^a-zA-Z0-9 äöüÄÖÜß]/g,'').trim().toLowerCase();
  const participantId=participant?.id;
  const finishedTournaments=Array.isArray(tournaments)?tournaments.filter(t=>t&&t.finished&&t.winner):[];
  const isWinner=t=>{
    const ids=Array.isArray(t.winner?.participantIds)?t.winner.participantIds:[];
    const names=Array.isArray(t.winner?.names)?t.winner.names:(t.winner?.name?[t.winner.name]:[]);
    const nameMatch=names.some(n=>String(n||'').replace(/[^a-zA-Z0-9 äöüÄÖÜß]/g,'').trim().toLowerCase()===nameKey);
    return Boolean((participantId&&ids.includes(participantId))||nameMatch);
  };
  const tournamentWins=finishedTournaments.reduce((sum,t)=>sum+(isWinner(t)?1:0),0);
  const tournamentPoints=finishedTournaments.reduce((sum,t)=>sum+(isWinner(t)?Number(t.winnerPoints||0):0),0);
  const overallPoints=Number(participant?.points||0);
  const score=overallPoints+(tournamentPoints*2)+(tournamentWins*15);
  const levels=[
    {min:0,key:'rookie',icon:'🌱',label:'Rookie'},
    {min:20,key:'angler',icon:'🎣',label:'Angler'},
    {min:50,key:'pro',icon:'⚓',label:'Pro'},
    {min:90,key:'champion',icon:'🏆',label:'Champion'},
    {min:140,key:'legend',icon:'👑',label:'Legende'}
  ];
  const level=levels.reduce((best,item)=>score>=item.min?item:best,levels[0]);
  return {...level,score,overallPoints,tournamentPoints,tournamentWins};
}
function renderSeniorityBadge(participant){
  const level=computeSeniorityLevel(participant,state?.tournaments||[]);
  return `<span class="seniority-badge seniority-badge--${level.key}" title="Seniorität: ${level.label} · Score ${level.score} · ${level.tournamentWins} Titel · ${level.tournamentPoints} Turnierpunkte · ${level.overallPoints} Overall-Punkte"><span>${level.icon}</span><strong>${level.label}</strong><small>${level.score}</small></span>`;
}

function computeSeniorityProgress(participant,tournaments=[]){
  const level=computeSeniorityLevel(participant,tournaments);
  const levels=[{min:0,key:'rookie',label:'Rookie'},{min:20,key:'angler',label:'Angler'},{min:50,key:'pro',label:'Pro'},{min:90,key:'champion',label:'Champion'},{min:140,key:'legend',label:'Legende'}];
  const currentIndex=levels.findIndex(item=>item.key===level.key);
  const current=levels[Math.max(0,currentIndex)]||levels[0];
  const next=levels[currentIndex+1]||null;
  if(!next)return {...level,currentLabel:current.label,nextLabel:null,remaining:0,percent:100,isMax:true};
  const span=Math.max(1,next.min-current.min);
  const done=Math.min(span,Math.max(0,level.score-current.min));
  return {...level,currentLabel:current.label,nextLabel:next.label,remaining:Math.max(0,next.min-level.score),percent:Math.round((done/span)*100),isMax:false};
}
function renderSeniorityProgress(participant){
  const progress=computeSeniorityProgress(participant,state?.tournaments||[]);
  const text=progress.isMax?'Maximale Senioritätsstufe erreicht':`Noch ${progress.remaining} Punkte bis ${progress.nextLabel}`;
  return `<div class="seniority-progress" aria-label="${escapeHtml(text)}"><div class="seniority-progress__head"><span>${escapeHtml(progress.currentLabel)}</span><strong>${escapeHtml(text)}</strong></div><div class="seniority-progress__track"><span style="width:${progress.percent}%"></span></div></div>`;
}
function computeParticipantMicroAwards(data,allStats=[],allCatches=[]){
  if(!data||!data.participant)return [];
  const awards=[];
  const add=(key,icon,title,detail)=>{if(awards.length<4&&!awards.some(a=>a.key===key))awards.push({key,icon,title,detail})};
  const catches=Array.isArray(data.catches)?data.catches:[];
  if(!catches.length)return awards;
  const todayCount=catches.filter(c=>sameDay(c.timestamp,new Date())).length;
  const maxToday=Math.max(0,...(allStats||[]).map(entry=>(entry.catches||[]).filter(c=>sameDay(c.timestamp,new Date())).length));
  if(todayCount>0&&todayCount===maxToday)add('today','🔥','Most Catches Today',`${todayCount} heute`);
  if(data.topSpecies&&data.topSpecies[1]>=2)add('species','👑',`${data.topSpecies[0]}-König`,`${data.topSpecies[1]} Fänge`);
  if(data.topSpot&&data.topSpot[1]>=2)add('spot','📍','Spot-Master',`${data.topSpot[1]}x ${data.topSpot[0]}`);
  const nightCount=catches.filter(c=>{const h=new Date(c.timestamp).getHours();return h>=21||h<5}).length;
  if(nightCount>=2)add('night','🌙','Night Hunter',`${nightCount} Nachtfänge`);
  const longestOwner=(Array.isArray(allCatches)?allCatches:[]).reduce((best,c)=>!best||Number(c.lengthCm||0)>Number(best.lengthCm||0)?c:best,null);
  if(longestOwner&&longestOwner.participantId===data.participant.id&&Number(longestOwner.lengthCm||0)>0)add('trophy','⚡','Trophy Touch',`${Number(longestOwner.lengthCm||0).toFixed(0)} cm Rekord`);
  return awards;
}
function renderParticipantMicroAwards(awards){
  if(!awards.length)return '<div class="meta">Awards erscheinen automatisch, sobald genügend Fangdaten vorhanden sind.</div>';
  return awards.map(a=>`<span class="micro-award" title="${escapeHtml(a.detail)}"><span>${a.icon}</span><strong>${escapeHtml(a.title)}</strong><small>${escapeHtml(a.detail)}</small></span>`).join('');
}
function participantDetailData(participantId){const stats=computeParticipantStats().find(p=>p.id===participantId),participant=participantById(participantId);if(!participant)return null;const catches=[...state.catches].filter(c=>c.participantId===participantId).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));const totalWeight=catches.reduce((sum,c)=>sum+Number(c.weightKg||0),0),totalLength=catches.reduce((sum,c)=>sum+Number(c.lengthCm||0),0),longest=catches.reduce((m,c)=>!m||Number(c.lengthCm||0)>Number(m.lengthCm||0)?c:m,null),heaviest=catches.reduce((m,c)=>!m||Number(c.weightKg||0)>Number(m.weightKg||0)?c:m,null);const species=new Map(),spots=new Map(),hours=Array.from({length:24},(_,hour)=>({hour,count:0})),days=new Map();catches.forEach(c=>{species.set(speciesName(c),(species.get(speciesName(c))||0)+1);const spot=c.spotLabel||c.location?.label||'Unbekannter Spot';spots.set(spot,(spots.get(spot)||0)+1);hours[new Date(c.timestamp).getHours()].count+=1;const day=new Date(c.timestamp).toISOString().slice(0,10);days.set(day,(days.get(day)||0)+1)});return{participant,stats,catches,totalWeight,totalLength,avgWeight:catches.length?totalWeight/catches.length:0,avgLength:catches.length?totalLength/catches.length:0,longest,heaviest,topSpecies:[...species.entries()].sort((a,b)=>b[1]-a[1])[0],topSpot:[...spots.entries()].sort((a,b)=>b[1]-a[1])[0],bestHour:hours.reduce((m,h)=>h.count>m.count?h:m,{hour:0,count:0}),days:[...days.entries()].sort((a,b)=>a[0].localeCompare(b[0]))}}
function participantTimelineBars(days){if(!days.length)return '<div class="meta">Noch keine Entwicklung verfügbar.</div>';const max=Math.max(1,...days.map(([,count])=>count));return days.slice(-14).map(([day,count])=>`<div class="participant-detail-bar" title="${escapeHtml(day)}: ${count} Fang${count===1?'':'e'}"><span style="height:${Math.max(10,(count/max)*100)}%"></span><small>${escapeHtml(day.slice(5))}</small></div>`).join('')}
function participantTournamentSummary(participantId){
  const participant=participantById(participantId);
  if(!participant)return {played:0,wins:0,totalPoints:0,bestRank:null,active:null,entries:[]};
  const tournaments=Array.isArray(state.tournaments)?state.tournaments:[];
  const entries=[];
  tournaments.forEach(t=>{
    if(!t||!t.id)return;
    const allowed=Array.isArray(t.participantIds)&&t.participantIds.length?t.participantIds:state.participants.map(p=>p.id);
    const isParticipant=allowed.includes(participantId);
    const participantCatches=(state.catches||[]).filter(c=>c.tournamentId===t.id&&c.participantId===participantId).length;
    if(!isParticipant&&!participantCatches)return;
    const result=computeTournamentScores(t);
    const rowIndex=(result.rows||[]).findIndex(r=>r.participant?.id===participantId);
    const row=rowIndex>=0?result.rows[rowIndex]:null;
    const rank=rowIndex>=0?rowIndex+1:null;
    const winnerIds=Array.isArray(t.winner?.participantIds)?t.winner.participantIds:[];
    const winnerNames=Array.isArray(t.winner?.names)?t.winner.names:(t.winner?.name?[t.winner.name]:[]);
    const won=Boolean(t.finished&&(winnerIds.includes(participantId)||winnerNames.includes(participant.name)));
    const points=Number(row?.points||0);
    const bonus=won?Number(t.winnerPoints||0):0;
    const relevant=participantCatches>0||points>0||won||t.finished||isParticipant;
    if(!relevant)return;
    entries.push({
      id:t.id,
      name:t.name||'Turnier',
      status:t.finished?'Abgeschlossen':'Aktiv',
      finished:Boolean(t.finished),
      rank,
      points,
      bonus,
      catches:Number(row?.catches||participantCatches||0),
      won,
      sortDate:t.finishedAt||t.end||t.start||t.updatedAt||t.createdAt||''
    });
  });
  const played=entries.filter(e=>e.catches>0||e.points>0||e.finished).length;
  const wins=entries.filter(e=>e.won).length;
  const totalPoints=entries.reduce((sum,e)=>sum+e.points+e.bonus,0);
  const ranks=entries.map(e=>e.rank).filter(n=>Number.isFinite(n)&&n>0);
  const bestRank=ranks.length?Math.min(...ranks):null;
  const active=entries.filter(e=>!e.finished).sort((a,b)=>String(b.sortDate).localeCompare(String(a.sortDate)))[0]||null;
  return {played,wins,totalPoints,bestRank,active,entries:entries.sort((a,b)=>String(b.sortDate).localeCompare(String(a.sortDate))).slice(0,4)};
}
function renderParticipantTournamentSection(summary){
  const best=summary.bestRank?`#${summary.bestRank}`:'–';
  const activeText=summary.active?`${escapeHtml(summary.active.name)} · ${summary.active.rank?`#${summary.active.rank}`:'aktiv'}`:'Kein aktives Turnier';
  const rows=summary.entries.length?summary.entries.map(e=>`<article><div><strong>${escapeHtml(e.name)}</strong><small>${escapeHtml(e.status)}${e.catches?` · ${e.catches} Fang${e.catches===1?'':'e'}`:''}</small></div><span>${e.rank?`#${e.rank}`:'–'}</span><b>${e.points+e.bonus} P</b></article>`).join(''):'<div class="meta">Noch keine Turnier-Performance vorhanden.</div>';
  return `<section class="participant-detail-panel participant-tournament-panel"><div class="participant-section-head"><div><p class="eyebrow">Turnier-Performance</p><h3>Turniere</h3></div><span class="participant-tournament-status">${activeText}</span></div><div class="participant-tournament-kpis"><article><span>Gespielt</span><strong>${summary.played}</strong><small>Turniere</small></article><article><span>Gewonnen</span><strong>${summary.wins}</strong><small>Siege</small></article><article><span>Punkte</span><strong>${summary.totalPoints}</strong><small>inkl. Siegerbonus</small></article><article><span>Bestplatzierung</span><strong>${best}</strong><small>beste Rangierung</small></article></div><div class="participant-tournament-list">${rows}</div></section>`;
}


function participantComparisonMetricRows(aData,bData){
  const aLevel=computeSeniorityLevel(aData.stats||aData.participant,state?.tournaments||[]);
  const bLevel=computeSeniorityLevel(bData.stats||bData.participant,state?.tournaments||[]);
  const aTournament=participantTournamentSummary(aData.participant.id);
  const bTournament=participantTournamentSummary(bData.participant.id);
  return [
    {key:'points',label:'Gesamtpunkte',a:Number(aData.stats?.points||0),b:Number(bData.stats?.points||0),format:v=>`${Math.round(v)} P`,diff:v=>`${v>0?'+':''}${Math.round(v)} P`},
    {key:'catches',label:'Fänge',a:Number(aData.catches.length||0),b:Number(bData.catches.length||0),format:v=>`${Math.round(v)}`,diff:v=>`${v>0?'+':''}${Math.round(v)} Fänge`},
    {key:'longest',label:'Grösster Fang',a:Number(aData.longest?.lengthCm||0),b:Number(bData.longest?.lengthCm||0),format:v=>v?`${Math.round(v)} cm`:'–',diff:v=>`${v>0?'+':''}${Math.round(v)} cm`},
    {key:'avgWeight',label:'Ø Gewicht',a:Number(aData.avgWeight||0),b:Number(bData.avgWeight||0),format:v=>fmtKg(v),diff:v=>`${v>0?'+':''}${v.toFixed(2)} kg`},
    {key:'avgLength',label:'Ø Länge',a:Number(aData.avgLength||0),b:Number(bData.avgLength||0),format:v=>v?`${Math.round(v)} cm`:'–',diff:v=>`${v>0?'+':''}${Math.round(v)} cm`},
    {key:'tournament',label:'Turnierpunkte',a:Number(aTournament.totalPoints||0),b:Number(bTournament.totalPoints||0),format:v=>`${Math.round(v)} P`,diff:v=>`${v>0?'+':''}${Math.round(v)} P`},
    {key:'tournamentWins',label:'Turniersiege',a:Number(aTournament.wins||0),b:Number(bTournament.wins||0),format:v=>`${Math.round(v)} Sieg${Math.round(v)===1?'':'e'}`,diff:v=>`${v>0?'+':''}${Math.round(v)} Sieg${Math.round(v)===1?'':'e'}`},
    {key:'level',label:'Level / Stufe',a:Number(aLevel.score||0),b:Number(bLevel.score||0),format:(v,side)=>side==='a'?`${aLevel.icon} ${aLevel.label}`:`${bLevel.icon} ${bLevel.label}`,diff:v=>`${v>0?'+':''}${Math.round(v)} Score`}
  ];
}
function renderParticipantComparePicker(participantId){
  const others=(state.participants||[]).filter(p=>p.id!==participantId);
  if(!others.length)return '<section class="participant-compare-entry participant-detail-panel"><div><p class="eyebrow">Duell</p><h3>Vergleichen mit…</h3><div class="meta">Für einen Vergleich braucht es mindestens zwei Teilnehmer.</div></div></section>';
  const options=others.map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.avatar||'🎣')} ${escapeHtml(p.name)}</option>`).join('');
  return `<section class="participant-compare-entry participant-detail-panel"><div><p class="eyebrow">Duell</p><h3>Vergleichen mit…</h3><div class="meta">Starte einen direkten Teilnehmer-vs.-Teilnehmer Vergleich.</div></div><div class="participant-compare-controls"><select id="participantCompareSelect" aria-label="Zweiten Teilnehmer auswählen">${options}</select><button class="primary-btn btn-compare" type="button" data-start-participant-compare="${escapeHtml(participantId)}">⚔️ VS starten</button></div></section>`;
}
function renderCompareDuelist(data,side){
  const p=data.participant,level=computeSeniorityLevel(data.stats||p,state?.tournaments||[]),points=Number(data.stats?.points||0);
  return `<article class="compare-duelist compare-duelist--${side}" style="--participant-color:${p.color||'#4ad7d1'}"><div class="compare-duelist-avatar">${escapeHtml(p.avatar||'🎣')}</div><div><span>${side==='a'?'Teilnehmer A':'Teilnehmer B'}</span><strong>${escapeHtml(p.name)}</strong><small>${points} Punkte · ${data.catches.length} Fänge · ${level.icon} ${escapeHtml(level.label)}</small></div></article>`;
}
function renderComparisonMetric(row){
  const max=Math.max(row.a,row.b,1),aPct=Math.max(4,Math.round((row.a/max)*100)),bPct=Math.max(4,Math.round((row.b/max)*100)),diff=row.a-row.b;
  const stateClass=diff===0?'is-even':(diff>0?'a-wins':'b-wins');
  const diffText=diff===0?'Gleichstand':(diff>0?`A ${row.diff(diff)}`:`B ${row.diff(Math.abs(diff))}`);
  return `<article class="compare-metric ${stateClass}"><div class="compare-metric-head"><strong>${escapeHtml(row.label)}</strong><span>${escapeHtml(diffText)}</span></div><div class="compare-values"><b>${row.format(row.a,'a')}</b><b>${row.format(row.b,'b')}</b></div><div class="compare-bars"><div class="compare-bar compare-bar--a"><span style="width:${aPct}%"></span></div><div class="compare-bar compare-bar--b"><span style="width:${bPct}%"></span></div></div></article>`;
}
function cumulativeCatchSeriesForParticipant(participantId,minTime,maxTime){
  const source=(state.catches||[]).filter(c=>c.participantId===participantId&&c.timestamp&&!Number.isNaN(new Date(c.timestamp).getTime())).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  const safeMin=Number.isFinite(minTime)?minTime:(source[0]?new Date(source[0].timestamp).getTime():Date.now());
  const safeMax=Number.isFinite(maxTime)&&maxTime>safeMin?maxTime:safeMin+86400000;
  const points=[{time:safeMin,value:0,label:'Start · 0 Fänge'}];
  let total=0;
  source.forEach(c=>{const time=new Date(c.timestamp).getTime();if(time<safeMin||time>safeMax)return;total+=1;points.push({time,value:total,label:`${fmtDateTime(c.timestamp)} · ${total} Fang${total===1?'':'e'}`});});
  points.push({time:safeMax,value:total,label:`Endstand · ${total} Fang${total===1?'':'e'}`});
  return {points,total};
}
function svgPathFromCumulativePoints(points,minTime,maxTime,maxValue,width,height,pad){
  const span=Math.max(1,maxTime-minTime),usableW=width-pad.left-pad.right,usableH=height-pad.top-pad.bottom,denom=Math.max(1,maxValue);
  return points.map((pt,index)=>{const x=pad.left+((pt.time-minTime)/span)*usableW;const y=height-pad.bottom-(pt.value/denom)*usableH;return `${index?'L':'M'} ${x.toFixed(1)} ${y.toFixed(1)}`;}).join(' ');
}
function renderCumulativeCatchComparison(aData,bData){
  const relevant=[...aData.catches,...bData.catches].filter(c=>c.timestamp&&!Number.isNaN(new Date(c.timestamp).getTime())).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  if(!relevant.length)return `<section class="participant-detail-panel compare-cumulative-panel"><div class="participant-section-head"><div><p class="eyebrow">Kumulative Fangentwicklung</p><h3>Fänge über Zeit</h3></div><span class="participant-tournament-status">read-only</span></div><div class="meta">Noch keine Fänge für diese beiden Teilnehmer vorhanden.</div></section>`;
  const first=new Date(relevant[0].timestamp).getTime(),last=new Date(relevant[relevant.length-1].timestamp).getTime(),minTime=first,maxTime=last>first?last:first+86400000;
  const aSeries=cumulativeCatchSeriesForParticipant(aData.participant.id,minTime,maxTime),bSeries=cumulativeCatchSeriesForParticipant(bData.participant.id,minTime,maxTime);
  const maxValue=Math.max(1,aSeries.total,bSeries.total),width=760,height=250,pad={left:44,right:22,top:24,bottom:42};
  const aPath=svgPathFromCumulativePoints(aSeries.points,minTime,maxTime,maxValue,width,height,pad),bPath=svgPathFromCumulativePoints(bSeries.points,minTime,maxTime,maxValue,width,height,pad);
  const aArea=`${aPath} L ${(width-pad.right).toFixed(1)} ${(height-pad.bottom).toFixed(1)} L ${pad.left.toFixed(1)} ${(height-pad.bottom).toFixed(1)} Z`;
  const startLabel=new Date(minTime).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'}),endLabel=new Date(maxTime).toLocaleDateString('de-CH',{day:'2-digit',month:'2-digit'});
  const aColor=aData.participant.color||'#4ad7d1',bColor=bData.participant.color||'#8ff0a7';
  const grid=[0,.25,.5,.75,1].map(r=>{const y=height-pad.bottom-r*(height-pad.top-pad.bottom),label=Math.round(r*maxValue);return `<g><line x1="${pad.left}" x2="${width-pad.right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text x="${pad.left-12}" y="${(y+4).toFixed(1)}" text-anchor="end">${label}</text></g>`}).join('');
  const dots=(series,cls)=>series.points.filter((_,i,arr)=>i&&i<arr.length-1).map(pt=>{const x=pad.left+((pt.time-minTime)/Math.max(1,maxTime-minTime))*(width-pad.left-pad.right),y=height-pad.bottom-(pt.value/Math.max(1,maxValue))*(height-pad.top-pad.bottom);return `<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.7"><title>${escapeHtml(pt.label)}</title></circle>`}).join('');
  return `<section class="participant-detail-panel compare-cumulative-panel"><div class="participant-section-head"><div><p class="eyebrow">Kumulative Fangentwicklung</p><h3>Fänge über Zeit</h3></div><span class="participant-tournament-status">read-only</span></div><div class="compare-cumulative-summary"><span style="--participant-color:${aColor}"><i></i>${escapeHtml(aData.participant.name)} · ${aSeries.total}</span><span style="--participant-color:${bColor}"><i></i>${escapeHtml(bData.participant.name)} · ${bSeries.total}</span></div><div class="compare-cumulative-chart" style="--compare-a:${aColor};--compare-b:${bColor}"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Kumulative Fangentwicklung"><defs><linearGradient id="compareCatchAreaA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--compare-a)" stop-opacity=".24"/><stop offset="1" stop-color="var(--compare-a)" stop-opacity="0"/></linearGradient><filter id="compareCatchGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g class="compare-cumulative-grid">${grid}</g><path class="compare-cumulative-area" d="${aArea}"/><path class="compare-cumulative-line compare-cumulative-line--b" d="${bPath}"/><path class="compare-cumulative-line compare-cumulative-line--a" d="${aPath}"/>${dots(bSeries,'compare-cumulative-dot compare-cumulative-dot--b')}${dots(aSeries,'compare-cumulative-dot compare-cumulative-dot--a')}<g class="compare-cumulative-axis"><line x1="${pad.left}" x2="${width-pad.right}" y1="${height-pad.bottom}" y2="${height-pad.bottom}"/><text x="${pad.left}" y="${height-14}">${startLabel}</text><text x="${width-pad.right}" y="${height-14}" text-anchor="end">${endLabel}</text></g></svg></div></section>`;
}
function renderParticipantComparison(primaryId,secondaryId){
  const modal=document.getElementById('participantDetailModal'),body=document.getElementById('participantDetailBody'),title=document.getElementById('participantDetailTitle');
  if(!modal||!body)return;
  const a=participantDetailData(primaryId),b=participantDetailData(secondaryId);
  if(!a||!b||primaryId===secondaryId)return;
  const metrics=participantComparisonMetricRows(a,b);
  const aWins=metrics.filter(m=>m.a>m.b).length,bWins=metrics.filter(m=>m.b>m.a).length;
  const winner=aWins===bWins?'Ausgeglichen':(aWins>bWins?`${a.participant.name} führt`:`${b.participant.name} führt`);
  if(title)title.textContent='Teilnehmer-Vergleich';
  modal.dataset.view='compare';
  modal.dataset.returnParticipantId=primaryId;
  body.innerHTML=`<div class="participant-compare-view"><button class="pill secondary compare-back" type="button" data-close-participant-detail>← Zurück zu ${escapeHtml(a.participant.name)}</button><div class="compare-hero"><div>${renderCompareDuelist(a,'a')}</div><div class="compare-vs"><span>VS</span><strong>${escapeHtml(winner)}</strong><small>${aWins}:${bWins} Metriken</small></div><div>${renderCompareDuelist(b,'b')}</div></div><section class="participant-detail-panel compare-board"><div class="participant-section-head"><div><p class="eyebrow">Direktes Duell</p><h3>Unterschiede auf einen Blick</h3></div><span class="participant-tournament-status">read-only</span></div><div class="compare-metrics">${metrics.map(renderComparisonMetric).join('')}</div></section>${renderCumulativeCatchComparison(a,b)}</div>`;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('participant-detail-open');
}

function renderParticipantDetail(participantId){const modal=document.getElementById('participantDetailModal'),body=document.getElementById('participantDetailBody');if(!modal||!body)return;const data=participantDetailData(participantId);if(!data)return;const p=data.participant,rank=(data.stats?computeParticipantStats().findIndex(x=>x.id===participantId)+1:0),compareEntry=renderParticipantComparePicker(participantId),recent=[...data.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,4),seniorityBadge=renderSeniorityBadge(data.stats||p),seniorityProgress=renderSeniorityProgress(data.stats||p),awards=computeParticipantMicroAwards(data,computeParticipantStats(),state.catches),tournamentSummary=participantTournamentSummary(participantId),tournamentSection=renderParticipantTournamentSection(tournamentSummary);if(document.getElementById('participantDetailTitle'))document.getElementById('participantDetailTitle').textContent='Teilnehmer-Detail';modal.dataset.view='detail';modal.dataset.returnParticipantId='';body.innerHTML=`<div class="participant-detail-hero" style="--participant-color:${p.color||'#4ad7d1'}"><div class="participant-detail-avatar">${escapeHtml(p.avatar||'🎣')}</div><div><p class="eyebrow">Teilnehmer-Insights</p><h2>${escapeHtml(p.name)}</h2><div class="meta">${rank?`Rang #${rank} · `:''}${data.stats?.points||0} Punkte · ${data.catches.length} Fänge</div></div></div>${compareEntry}<section class="participant-game-panel"><div class="participant-game-main"><div class="participant-game-title"><span>Level & Badges</span>${seniorityBadge}</div>${seniorityProgress}</div><div class="participant-awards"><div class="participant-awards__label">Micro-Awards</div><div class="participant-awards__list">${renderParticipantMicroAwards(awards)}</div></div></section>${tournamentSection}<div class="participant-detail-kpis"><article><span>Fänge</span><strong>${data.catches.length}</strong><small>gesamt erfasst</small></article><article><span>Top Gewicht</span><strong>${data.heaviest?fmtKg(data.heaviest.weightKg):'–'}</strong><small>${data.heaviest?escapeHtml(speciesName(data.heaviest)):'noch offen'}</small></article><article><span>Ø Gewicht</span><strong>${fmtKg(data.avgWeight)}</strong><small>pro Fang</small></article><article><span>Ø Länge</span><strong>${Math.round(data.avgLength||0)} cm</strong><small>pro Fang</small></article></div><div class="participant-detail-grid"><section class="participant-detail-panel"><h3>Stärken</h3><div class="detail-fact"><span>Grösster Fang</span><strong>${data.longest?`${escapeHtml(speciesName(data.longest))} · ${Number(data.longest.lengthCm||0).toFixed(0)} cm`:'–'}</strong></div><div class="detail-fact"><span>Beste Fischart</span><strong>${data.topSpecies?`${escapeHtml(data.topSpecies[0])} · ${data.topSpecies[1]}x`:'–'}</strong></div><div class="detail-fact"><span>Bester Spot</span><strong>${data.topSpot?`${escapeHtml(data.topSpot[0])} · ${data.topSpot[1]}x`:'–'}</strong></div><div class="detail-fact"><span>Beste Zeit</span><strong>${data.bestHour.count?`${String(data.bestHour.hour).padStart(2,'0')}:00 · ${data.bestHour.count}x`:'–'}</strong></div></section><section class="participant-detail-panel"><h3>Entwicklung über Zeit</h3><div class="participant-detail-timeline">${participantTimelineBars(data.days)}</div></section></div><section class="participant-detail-panel"><h3>Letzte Fänge</h3><div class="participant-detail-recent">${recent.length?recent.map(c=>`<article><strong>${escapeHtml(speciesName(c))}</strong><span>${Number(c.lengthCm||0).toFixed(0)} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</span><small>${escapeHtml(c.spotLabel||c.location?.label||'Kein Spot')}${c.bait?` · ${escapeHtml(c.bait)}`:''}</small></article>`).join(''):'<div class="meta">Noch keine Fänge vorhanden.</div>'}</div></section>`;modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');document.body.classList.add('participant-detail-open')}
function closeParticipantDetail(){const modal=document.getElementById('participantDetailModal');if(!modal)return;if(modal.dataset.view==='compare'&&modal.dataset.returnParticipantId){renderParticipantDetail(modal.dataset.returnParticipantId);return}modal.classList.add('hidden');modal.setAttribute('aria-hidden','true');modal.dataset.view='';modal.dataset.returnParticipantId='';document.body.classList.remove('participant-detail-open')}
function initParticipantDetailModal(){const list=document.getElementById('leaderboardList'),modal=document.getElementById('participantDetailModal'),closeBtn=document.getElementById('closeParticipantDetail');if(!list||!modal||modal.dataset.bound==='1')return;list.addEventListener('click',e=>{const card=e.target.closest('.participant-leaderboard-card');if(!card)return;renderParticipantDetail(card.dataset.participantId)});list.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.participant-leaderboard-card')){e.preventDefault();renderParticipantDetail(e.target.closest('.participant-leaderboard-card').dataset.participantId)}});modal.addEventListener('click',e=>{const compareBtn=e.target.closest('[data-start-participant-compare]');if(compareBtn){const select=modal.querySelector('#participantCompareSelect');const targetId=select?.value;if(targetId)renderParticipantComparison(compareBtn.dataset.startParticipantCompare,targetId);return}if(e.target===modal||e.target.closest('[data-close-participant-detail]'))closeParticipantDetail()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.classList.contains('hidden'))closeParticipantDetail()});if(closeBtn)closeBtn.addEventListener('click',closeParticipantDetail);modal.dataset.bound='1'}
function dailyBuckets(){const map=new Map();[...state.catches].forEach(c=>{const key=new Date(c.timestamp).toISOString().slice(0,10);map.set(key,(map.get(key)||0)+1)});return[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]))}function speciesBuckets(){const map=new Map();state.catches.forEach(c=>{const key=speciesName(c);map.set(key,(map.get(key)||0)+1)});return[...map.entries()].sort((a,b)=>b[1]-a[1])}function getInsights(){const insights=[];const summary=computeSummary();if(summary.biggest){const p=participantById(summary.biggest.participantId);insights.push({title:'Größter Fisch',body:`${speciesName(summary.biggest)} mit ${fmtKg(summary.biggest.weightKg)} und ${summary.biggest.lengthCm} cm von ${p?.name||'–'}.`})}const species=speciesBuckets();if(species[0])insights.push({title:'Häufigste Art',body:`${species[0][0]} führt mit ${species[0][1]} Fang${species[0][1]===1?'':'en'}.`});const spotMap=new Map();state.catches.forEach(c=>{const label=c.spotLabel||c.location?.label||'Unbekannter Spot';spotMap.set(label,(spotMap.get(label)||0)+1)});const topSpot=[...spotMap.entries()].sort((a,b)=>b[1]-a[1])[0];if(topSpot)insights.push({title:'Hot Spot',body:`${topSpot[0]} brachte ${topSpot[1]} Fang${topSpot[1]===1?'':'e'}.`});if(summary.bestHour.count>0)insights.push({title:'Beste Zeit',body:`Die beste Fangzeit liegt aktuell um ${String(summary.bestHour.hour).padStart(2,'0')}:00 Uhr.`});
const baitMap=new Map();state.catches.forEach(c=>{const bait=c.bait||'Unbekannter Köder';baitMap.set(bait,(baitMap.get(bait)||0)+1)});
const topBait=[...baitMap.entries()].sort((a,b)=>b[1]-a[1])[0];
if(topBait)insights.push({title:'Topköder',body:`${topBait[0]} brachte ${topBait[1]} Fang${topBait[1]===1?'':'e'}.`});
const leaderboard=summary.leaderboard;
const ratios=leaderboard
  .filter(entry=>entry.count>0)
  .map(entry=>({...entry,ratio:entry.points/entry.count}))
  .sort((a,b)=>b.ratio-a.ratio);

const lucky=ratios[0];
const unlucky=ratios.length>1?ratios[ratios.length-1]:null;

if(lucky)insights.push({title:'Glückliche',body:`${lucky.name} holt durchschnittlich ${lucky.ratio.toFixed(1)} Punkte pro Fang.`});
if(unlucky)insights.push({title:'Pechvogel',body:`${unlucky.name} holt durchschnittlich nur ${unlucky.ratio.toFixed(1)} Punkte pro Fang.`});

if(leaderboard[0])insights.push({title:'Aktueller Leader',body:`${leaderboard[0].name} führt mit ${leaderboard[0].points} Punkten und ${leaderboard[0].count} Fängen.`});return insights}function getForecast(){const catches=state.catches;if(!catches.length)return{text:'Noch zu wenig Daten für eine sinnvolle Prognose.'};const dates=catches.map(c=>startOfDay(c.timestamp).getTime()),min=Math.min(...dates),max=Math.max(...dates),days=Math.max(1,Math.round((max-min)/86400000)+1),avgPerDay=catches.length/days,projected30=Math.round(avgPerDay*30),weightPerCatch=catches.reduce((s,c)=>s+Number(c.weightKg||0),0)/catches.length;return{text:`Wenn ihr dieses Tempo haltet, landet ihr in 30 Tagen bei etwa ${projected30} Fängen. Bei eurem aktuellen Schnitt entspricht das rund ${fmtKg(projected30*weightPerCatch)} Gesamtgewicht.`,avgPerDay,projected30}}function populateSelects(){const participantSelect=document.getElementById('participantSelect'),participantFilter=document.getElementById('participantFilter');participantSelect.innerHTML='';participantFilter.innerHTML='<option value="all">Alle Teilnehmer</option>';state.participants.forEach(p=>{participantSelect.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.avatar||'🎣'} ${p.name}</option>`);participantFilter.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.name}</option>`)});const speciesFilter=document.getElementById('speciesFilter');const speciesValues=[...new Set(state.catches.map(c=>speciesName(c)))];speciesFilter.innerHTML='<option value="all">Alle Fischarten</option>'+speciesValues.map(v=>`<option value="${v}">${v}</option>`).join('');const tournamentSelect=document.getElementById('tournamentSelect');if(tournamentSelect){tournamentSelect.innerHTML = '<option value="">Kein Turnier</option>' + state.tournaments.filter(t => !t.finished).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}renderTournamentParticipantPicks()}function renderDashboard(){const s=computeSummary();document.getElementById('tripTitle').textContent=state.meta.tripName;document.getElementById('tripSubtitle').textContent=state.meta.tripSubtitle;document.getElementById('totalCatches').textContent=s.totalCatches;document.getElementById('totalWeight').textContent=fmtKg(s.totalWeight);document.getElementById('biggestCatch').textContent=s.biggest?`${speciesName(s.biggest)} ${Number(s.biggest.lengthCm||0).toFixed(0)} cm`:'–';document.getElementById('todayCatches').textContent=s.todayCount;document.getElementById('currentLeader').textContent=s.leader?s.leader.name:'–';document.getElementById('avgWeight').textContent=fmtKg(s.avgWeight);document.getElementById('bestTimeSlot').textContent=s.bestHour.count?`${String(s.bestHour.hour).padStart(2,'0')}:00`:'–';const leaderboard=document.getElementById('leaderboardList');leaderboard.innerHTML='';s.leaderboard.forEach((p,i)=>leaderboard.insertAdjacentHTML('beforeend',`<article class="list-card participant-leaderboard-card" data-participant-id="${p.id}" role="button" tabindex="0" aria-label="Details zu ${p.name} öffnen"><div><div class="list-title-row"><strong>#${i+1} ${p.avatar||'🎣'} ${p.name}</strong><span class="badge" style="background:${p.color}">${p.points} Punkte</span></div><div class="meta">${p.count} Fänge · ${fmtKg(p.totalWeight)} Gesamtgewicht · Ø ${Math.round((p.avgLength||0))} cm</div></div><div class="meta">${p.heaviest?`Top: ${speciesName(p.heaviest)} ${fmtKg(p.heaviest.weightKg)}`:'Noch kein Fang'}</div></article>`));const recent=[...state.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,8),recentEl=document.getElementById('recentCatches');recentEl.replaceChildren();recentEl.innerHTML=recent.length?'':'<div class="meta">Noch keine Fänge vorhanden.</div>';recent.forEach(c=>{const p=participantById(c.participantId),bg=p?.color||'#4ad7d1';recentEl.insertAdjacentHTML('beforeend',`<article class="list-card recent-catch-card" data-catch-id="${c.id}" role="button" tabindex="0" aria-label="Fang ${escapeHtml(speciesName(c))} auf der Karte anzeigen"><div><div class="list-title-row"><strong>${speciesName(c)}</strong><span class="badge" style="background:${bg}">${p?.avatar||'🎣'} ${p?.name||'–'}</span></div><div class="meta">${c.lengthCm} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</div><div class="note">${c.spotLabel||c.location?.label||'Kein Spot'}${c.bait?` · Köder: ${c.bait}`:''}</div></div><span class="recent-catch-map-hint" aria-hidden="true">Karte ↗</span></article>`)}) ;const insights=document.getElementById('insightsList');insights.innerHTML='';getInsights().forEach(item=>insights.insertAdjacentHTML('beforeend',`<article class="insight-card"><strong>${item.title}</strong><span>${item.body}</span></article>`));renderCharts()}function cleanup(key){if(charts[key])charts[key].destroy()}function css(name){return getComputedStyle(document.body).getPropertyValue(name).trim()}function dashboardChartOptions(){return{responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{top:6,right:10,bottom:0,left:0}},scales:{x:{offset:true,ticks:{color:css('--muted'),font:{size:11,weight:'600'},padding:8,maxRotation:0,autoSkip:true},grid:{display:false},border:{color:'rgba(255,255,255,.14)'}},y:{beginAtZero:true,afterFit(axis){axis.width=42},ticks:{color:css('--muted'),font:{size:11,weight:'600'},padding:8,precision:0},grid:{color:'rgba(255,255,255,.08)',drawTicks:false},border:{display:false}}},plugins:{legend:{display:false}}}}function renderCharts(){const daily=dailyBuckets();cleanup('daily');charts.daily=new Chart(document.getElementById('dailyChart'),{type:'bar',data:{labels:daily.map(x=>x[0].slice(5)),datasets:[{label:'Fänge',data:daily.map(x=>x[1]),backgroundColor:'#4ad7d1',borderRadius:12}]},options:dashboardChartOptions()});const pStats=computeParticipantStats();cleanup('participants');charts.participants=new Chart(document.getElementById('participantChart'),{type:'bar',data:{labels:pStats.map(p=>p.name),datasets:[{label:'Fänge',data:pStats.map(p=>p.count),backgroundColor:'#4ad7d1',borderRadius:12},{label:'Punkte',data:pStats.map(p=>p.points),backgroundColor:'#ffb84d',borderRadius:12}]},options:{scales:{x:{ticks:{color:css('--muted')},grid:{display:false}},y:{ticks:{color:css('--muted')},grid:{color:'rgba(255,255,255,.08)'}}},plugins:{legend:{labels:{color:css('--text')}}}}})}function getCatchById(catchId){return state.catches.find(c=>c.id===catchId)}function validCatchLocation(c){return c&&c.location&&Number.isFinite(Number(c.location.lat))&&Number.isFinite(Number(c.location.lng))}function openDashboardCatchMap(catchId){const c=getCatchById(catchId);if(!validCatchLocation(c)){alert('Für diesen Fang ist kein gültiger Standort gespeichert.');return}selectedDashboardCatchId=catchId;pendingCatchFocusId=catchId;showScreen('map');renderMap();focusSelectedCatchOnMap(catchId)}function closeDashboardCatchMap(){selectedDashboardCatchId=null;pendingCatchFocusId=null;renderMap();showScreen('dashboard')}function focusSelectedCatchOnMap(catchId,attempt=0){const c=getCatchById(catchId);if(!validCatchLocation(c)||!map)return;if(!document.getElementById('screen-map')?.classList.contains('active'))return;setTimeout(()=>{try{map.invalidateSize();const latlng=[Number(c.location.lat),Number(c.location.lng)];map.setView(latlng,Math.max(map.getZoom(),13),{animate:true});if(window._catchMarkerMap&&window._catchMarkerMap[catchId])window._catchMarkerMap[catchId].openPopup();pendingCatchFocusId=null}catch(err){if(attempt<5)setTimeout(()=>focusSelectedCatchOnMap(catchId,attempt+1),90)}},attempt?90:160)}function renderSelectedCatchMapPanel(){const actions=document.querySelector('#screen-map .map-actions');if(!actions)return;let panel=document.getElementById('selectedCatchMapPanel');if(!selectedDashboardCatchId){if(panel)panel.remove();return}const c=getCatchById(selectedDashboardCatchId);if(!validCatchLocation(c)){selectedDashboardCatchId=null;if(panel)panel.remove();return}const p=participantById(c.participantId);if(!panel){panel=document.createElement('div');panel.id='selectedCatchMapPanel';panel.className='selected-catch-map-panel';actions.appendChild(panel)}panel.innerHTML=`<div><span class="subtle">Aus Dashboard geöffnet</span><strong>${escapeHtml(speciesName(c))}</strong><small>${Number(c.lengthCm||0).toFixed(0)} cm · ${fmtKg(c.weightKg)} · ${escapeHtml(p?.name||'–')} · ${fmtDateTime(c.timestamp)}</small></div><button type="button" class="icon-btn" data-close-selected-catch-map aria-label="Zurück zum Dashboard">✕</button>`}function initRecentCatchMapInteraction(){const recentEl=document.getElementById('recentCatches');if(!recentEl||recentEl.dataset.mapBound==='1')return;recentEl.addEventListener('click',e=>{const card=e.target.closest('.recent-catch-card');if(card)openDashboardCatchMap(card.dataset.catchId)});recentEl.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.recent-catch-card')){e.preventDefault();openDashboardCatchMap(e.target.closest('.recent-catch-card').dataset.catchId)}});document.addEventListener('click',e=>{if(e.target.closest('[data-close-selected-catch-map]'))closeDashboardCatchMap()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectedDashboardCatchId&&document.getElementById('screen-map')?.classList.contains('active'))closeDashboardCatchMap()});recentEl.dataset.mapBound='1'}function renderHistory(){const list=document.getElementById('catchHistoryList');const speciesFilter=document.getElementById('speciesFilter').value,participantFilter=document.getElementById('participantFilter').value,q=document.getElementById('searchCatch').value.trim().toLowerCase();let items=[...state.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));if(speciesFilter!=='all')items=items.filter(c=>speciesName(c)===speciesFilter);if(participantFilter!=='all')items=items.filter(c=>c.participantId===participantFilter);if(q)items=items.filter(c=>[speciesName(c),c.spotLabel,c.bait,c.note].join(' ').toLowerCase().includes(q));list.innerHTML='';if(!items.length){list.innerHTML='<div class="meta">Keine Fänge für den aktuellen Filter.</div>';return}items.forEach(c=>{const p=participantById(c.participantId),wrap=document.createElement('article');wrap.className='list-card catch-item';wrap.innerHTML=`<div class="list-main"><div class="list-title-row"><strong>${speciesName(c)}</strong><span class="badge" style="background:${p?.color||'#4ad7d1'}">${p?.avatar||'🎣'} ${p?.name||'–'}</span></div><div class="meta">${c.lengthCm} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</div><div class="note">${c.spotLabel||c.location?.label||'Kein Spot'}${c.bait?` · Köder: ${c.bait}`:''}${c.note?` · ${c.note}`:''}</div></div><div class="list-actions"><button class="icon-btn edit-btn">✎</button><button class="icon-btn delete-btn">✕</button></div>`;wrap.querySelector('.delete-btn').addEventListener('click',async()=>{if(!confirm('Diesen Fang wirklich löschen?'))return;state.catches=state.catches.filter(x=>x.id!==c.id);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));rerender();if(db){const{error}=await db.from('catches').delete().eq('id',c.id);if(error)console.error('Delete fehlgeschlagen:',error)}});wrap.querySelector('.edit-btn').addEventListener('click',()=>loadCatchIntoForm(c));list.appendChild(wrap)})}function loadCatchIntoForm(c){showScreen('catches');const form=document.getElementById('catchForm');form.dataset.editingId=c.id;form.species.value=c.species;document.getElementById('speciesSelect').dispatchEvent(new Event('change'));form.customSpecies.value=c.customSpecies||'';form.participantId.value=c.participantId;if(form.tournamentId)form.tournamentId.value=c.tournamentId||'';form.lengthCm.value=c.lengthCm;form.weightKg.value=c.weightKg;form.timestamp.value=new Date(c.timestamp).toISOString().slice(0,16);form.bait.value=c.bait||'';form.spotLabel.value=c.spotLabel||'';form.note.value=c.note||'';form.lat.value=c.location?.lat||'';form.lng.value=c.location?.lng||'';if(c.location?.lat&&c.location?.lng&&window.updateCatchLocationPreview)window.updateCatchLocationPreview(c.location.lat,c.location.lng);window.scrollTo({top:0,behavior:'smooth'})}function renderParticipants(){const container=document.getElementById('participantsList');container.innerHTML='';computeParticipantStats().forEach(p=>{const article=document.createElement('article');article.className='list-card';article.innerHTML=`<div><div class="list-title-row"><strong>${p.avatar||'🎣'} ${p.name}</strong><span class="badge" style="background:${p.color}">${p.points} Punkte</span></div><div class="meta">${p.count} Fänge · ${fmtKg(p.totalWeight)} · Ø ${Math.round((p.avgLength||0))} cm</div></div><div class="list-actions"><button class="icon-btn edit-btn">✎</button><button class="icon-btn delete-btn">✕</button></div>`;article.querySelector('.edit-btn').addEventListener('click',()=>loadParticipantIntoForm(p));article.querySelector('.delete-btn').addEventListener('click',()=>{if(state.catches.some(c=>c.participantId===p.id)){alert('Dieser Teilnehmer hat bereits Fänge. Bitte zuerst Fänge löschen oder umhängen.');return}state.participants=state.participants.filter(x=>x.id!==p.id);persist();rerender()});container.appendChild(article)})}function loadParticipantIntoForm(p){showScreen('participants');const form=document.getElementById('participantForm');form.dataset.editingId=p.id;form.name.value=p.name||'';form.color.value=p.color||'#4ad7d1';form.avatar.value=p.avatar||'🎣';const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Teilnehmer speichern';window.scrollTo({top:0,behavior:'smooth'})}function renderRecords(){const list=document.getElementById('recordsList'),catches=[...state.catches],heaviest=catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null),longest=catches.reduce((m,c)=>!m||c.lengthCm>m.lengthCm?c:m,null),earliest=catches.reduce((m,c)=>!m||new Date(c.timestamp)<new Date(m.timestamp)?c:m,null),latest=catches.reduce((m,c)=>!m||new Date(c.timestamp)>new Date(m.timestamp)?c:m,null),entries=[heaviest&&`Schwerster Fisch: ${speciesName(heaviest)} mit ${fmtKg(heaviest.weightKg)} von ${participantById(heaviest.participantId)?.name||'–'}.`,longest&&`Längster Fisch: ${speciesName(longest)} mit ${longest.lengthCm} cm.`,earliest&&`Erster erfasster Fang: ${fmtDateTime(earliest.timestamp)} am Spot ${earliest.spotLabel||earliest.location?.label||'–'}.`,latest&&`Letzter erfasster Fang: ${fmtDateTime(latest.timestamp)}.`].filter(Boolean);list.innerHTML=entries.length?entries.map(t=>`<article class="list-card"><div>${t}</div></article>`).join(''):'<div class="meta">Noch keine Rekorde vorhanden.</div>'}function renderForecast(){document.getElementById('forecastBox').innerHTML=`<article class="insight-card"><strong>30-Tage-Prognose</strong><span>${getForecast().text}</span></article>`}function renderTimeHeatmap(){const grid=document.getElementById('timeHeatmap');grid.innerHTML='';const counts=Array.from({length:24},(_,h)=>state.catches.filter(c=>new Date(c.timestamp).getHours()===h).length),max=Math.max(1,...counts);counts.forEach((count,hour)=>{const opacity=.12+(count/max)*.88,cell=document.createElement('div');cell.className='time-cell';cell.style.background=`rgba(74,215,209,${opacity})`;cell.style.color=opacity>.45?'#00131c':css('--text');cell.innerHTML=`<strong>${String(hour).padStart(2,'0')}:00</strong><span>${count} Fang${count===1?'':'e'}</span>`;grid.appendChild(cell)})}function initMap(){if(map)return;map=L.map('map').setView([59.915,10.78],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(map);markersLayer=L.layerGroup().addTo(map);initWeatherControl()}function renderMap(){initMap();markersLayer.clearLayers();window._catchMarkerMap={};const points=state.catches.filter(c=>c.location?.lat&&c.location?.lng);const bounds=[];points.forEach(c=>{const p=participantById(c.participantId),species=speciesName(c),color=speciesPalette[species]||speciesPalette[c.species]||'#4ad7d1',isSelected=c.id===selectedDashboardCatchId,marker=L.circleMarker([c.location.lat,c.location.lng],{radius:isSelected?Math.max(14,Math.min(26,8+Number(c.weightKg||0)*1.8)):Math.max(7,Math.min(18,4+Number(c.weightKg||0)*1.5)),color:isSelected?'#ffffff':color,fillColor:color,fillOpacity:isSelected?.9:.65,weight:isSelected?5:2,className:isSelected?'catch-marker-selected':''}).bindPopup(`<strong>${species}</strong><br>${c.lengthCm} cm · ${fmtKg(c.weightKg)}<br>${p?.name||'–'} · ${fmtDateTime(c.timestamp)}<br>${c.spotLabel||c.location?.label||'Kein Spot'}`);marker.addTo(markersLayer);window._catchMarkerMap[c.id]=marker;bounds.push([c.location.lat,c.location.lng])});if(bounds.length&&!selectedDashboardCatchId)map.fitBounds(bounds,{padding:[30,30]});const legend=document.getElementById('mapLegend'),uniqueSpecies=[...new Set(state.catches.map(c=>speciesName(c)))];legend.innerHTML=uniqueSpecies.map(s=>`<div class="legend-item"><span class="legend-color" style="background:${speciesPalette[s]||'#4ad7d1'}"></span><span>${s}</span></div>`).join('')||'<div class="meta">Noch keine Fangorte gespeichert.</div>';renderHeatmapGrid(points);renderSelectedCatchMapPanel();if(pendingCatchFocusId)focusSelectedCatchOnMap(pendingCatchFocusId)}function renderHeatmapGrid(points){const container=document.getElementById('heatmapGrid');if(!points.length){container.innerHTML='<div class="meta">Noch keine Standortdaten vorhanden.</div>';return}const rows=5,cols=5;
// feste Europa-/Skandinavien-Grenzen statt dynamischer Verschiebung
const minLat=54,maxLat=72,minLng=4,maxLng=32;
const grid=Array.from({length:rows*cols},()=>0);
points.forEach(c=>{
const r=Math.min(rows-1,Math.max(0,Math.floor(((c.location.lat-minLat)/(maxLat-minLat))*rows)));
const col=Math.min(cols-1,Math.max(0,Math.floor(((c.location.lng-minLng)/(maxLng-minLng))*cols)));
grid[r*cols+col]+=1});const max=Math.max(...grid,1);container.innerHTML='';grid.forEach((count,idx)=>{const opacity=.12+(count/max)*.88,cell=document.createElement('div');cell.className='heat-cell';cell.dataset.zone=`Zone ${idx+1}`;cell.style.background=`rgba(143,240,167,${opacity})`;cell.style.color=opacity>.5?'#06210c':css('--text');cell.innerHTML=`<strong>Zone ${idx+1}</strong><span>${count} Fang${count===1?'':'e'}</span>`;container.appendChild(cell)})}function rerender(){populateSelects();renderDashboard();renderHistory();renderParticipants();renderRecords();renderForecast();renderTimeHeatmap();renderMap();renderTournaments()}function showScreen(name){if(name!=='map'&&selectedDashboardCatchId){selectedDashboardCatchId=null;pendingCatchFocusId=null}document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===`screen-${name}`));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));if(name==='map'&&map)setTimeout(()=>map.invalidateSize(),120);if(name==='analytics'&&typeof refreshAnalyticsTournamentSelect==='function')setTimeout(refreshAnalyticsTournamentSelect,0)}function attachEvents(){document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));document.getElementById('newTournamentBubble')?.addEventListener('click',resetTournamentFormForNew);document.getElementById('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem(THEME_KEY,document.body.classList.contains('light')?'light':'dark');renderCharts();renderTimeHeatmap();renderMap()});document.getElementById('speciesSelect').addEventListener('change',e=>document.getElementById('customSpeciesWrap').classList.toggle('hidden',e.target.value!=='Andere'));document.getElementById('catchForm').addEventListener('submit',e=>{e.preventDefault();const form=e.target;const fd=new FormData(form);const editingId=form.dataset.editingId;const entry={id:editingId||crypto.randomUUID(),species:fd.get('species'),customSpecies:fd.get('customSpecies')||'',participantId:fd.get('participantId'),tournamentId:fd.get('tournamentId')||'',lengthCm:Number(fd.get('lengthCm')),weightKg:fd.get('weightKg')?Number(fd.get('weightKg')):0,timestamp:new Date(fd.get('timestamp')).toISOString(),bait:fd.get('bait')||'',spotLabel:fd.get('spotLabel')||'',note:fd.get('note')||'',location:{lat:fd.get('lat')?Number(fd.get('lat')):null,lng:fd.get('lng')?Number(fd.get('lng')):null,label:fd.get('spotLabel')||''},createdAt:new Date().toISOString()};if(editingId){state.catches=state.catches.map(c=>c.id===editingId?entry:c);delete form.dataset.editingId}else{state.catches.push(entry)}persist();form.reset();document.getElementById('customSpeciesWrap').classList.add('hidden');document.getElementById('timestampInput').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);rerender();setTimeout(()=>{showScreen('catches');const bait=document.querySelector('#catchForm select[name="bait"]');const spot=document.querySelector('#catchForm select[name="spotLabel"]');if(bait)bait.value='';if(spot)spot.value='';},0)});document.getElementById('participantForm').addEventListener('submit',e=>{e.preventDefault();const form=e.target;const fd=new FormData(form),editingId=form.dataset.editingId;if(editingId){state.participants=state.participants.map(p=>p.id===editingId?{...p,name:fd.get('name').trim(),color:fd.get('color'),avatar:fd.get('avatar')||'🎣'}:p);delete form.dataset.editingId}else state.participants.push({id:crypto.randomUUID(),name:fd.get('name').trim(),color:fd.get('color'),avatar:fd.get('avatar')||'🎣'});persist();

form.reset();form.color.value='#4ad7d1';form.avatar.value='🎣';const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Teilnehmer hinzufügen';rerender()});['speciesFilter','participantFilter','searchCatch'].forEach(id=>{document.getElementById(id).addEventListener('input',renderHistory);document.getElementById(id).addEventListener('change',renderHistory)});document.getElementById('useCurrentLocation').addEventListener('click',()=>{if(!navigator.geolocation)return alert('Geolocation wird auf diesem Gerät nicht unterstützt.');navigator.geolocation.getCurrentPosition(pos=>{document.querySelector('[name="lat"]').value=pos.coords.latitude.toFixed(6);document.querySelector('[name="lng"]').value=pos.coords.longitude.toFixed(6);if(window.updateCatchLocationPreview)window.updateCatchLocationPreview(pos.coords.latitude,pos.coords.longitude)},()=>alert('Standort konnte nicht ermittelt werden. Bitte in Safari/Geräteeinstellungen erlauben.'))});document.getElementById('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fishtrack-export-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.participants)||!Array.isArray(parsed.catches))throw new Error();state={meta:parsed.meta||structuredClone(defaultData.meta),participants:Array.isArray(parsed.participants)?parsed.participants:[],catches:Array.isArray(parsed.catches)?parsed.catches:[],tournaments:Array.isArray(parsed.tournaments)?parsed.tournaments:[]};persist();rerender();alert('Import erfolgreich.')}catch{alert('Import fehlgeschlagen. Bitte eine gültige JSON-Datei verwenden.')}});document.getElementById('resetDemoBtn').addEventListener('click',()=>{if(!confirm('Wirklich auf Demo-Daten zurücksetzen?'))return;state=structuredClone(defaultData);persist();rerender()});document.getElementById('tournamentForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const selectedParticipants=[...document.querySelectorAll('#tournamentParticipants input[type="checkbox"]:checked')].map(x=>x.value);const useCustom=document.getElementById('enableCustomRules')?.checked||fd.get('rulesetId')==='custom';const customRules={pointsPerFish:Number(document.getElementById('rule_pointsPerFish').value||0),bonusFirstFish:Number(document.getElementById('rule_bonusFirstFish').value||0),bonusLargestFish:Number(document.getElementById('rule_bonusLargestFish').value||0),bonusLargestPerSpecies:Number(document.getElementById('rule_bonusLargestPerSpecies').value||0),bonusNewArea:Number(document.getElementById('rule_bonusNewArea').value||0),bonusOver80cm:Number(document.getElementById('rule_bonusOver80cm').value||0),bonusOver100cm:Number(document.getElementById('rule_bonusOver100cm').value||0)};const editingId=e.target.dataset.editingId;const existingTournament=editingId?tournamentById(editingId):null;const tournament={...(existingTournament||{}),id:editingId||crypto.randomUUID(),name:(fd.get('name')||'').trim(),rulesetId:useCustom?'custom':(fd.get('rulesetId')||'all_fish'),customRules:useCustom?customRules:null,start:fd.get('start')||'',end:fd.get('end')||'',participantIds:selectedParticipants,finished:Boolean(existingTournament?.finished),finishedAt:existingTournament?.finishedAt||null,winner:existingTournament?.winner||null,winnerPoints:Number(existingTournament?.winnerPoints||0),createdAt:existingTournament?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};if(editingId){state.tournaments=state.tournaments.map(x=>x.id===editingId?{...x,...tournament}:x);
window.state.tournaments = state.tournaments;delete e.target.dataset.editingId}else state.tournaments.push(tournament);activeTournamentId=tournament.id;await persist();

e.target.reset();const submit=e.target.querySelector('button[type="submit"]');if(submit)submit.textContent='Turnier speichern';document.getElementById('enableCustomRules').checked=false;updateRulesPreview();renderTournamentParticipantPicks();rerender();closeTournamentEditor();showScreen('tournaments');showTournamentSaveToast();document.querySelector('.tournament-overview-panel')?.scrollIntoView({behavior:'smooth',block:'start'})});document.getElementById('rulesetSelect')?.addEventListener('change',updateRulesPreview);document.getElementById('enableCustomRules')?.addEventListener('change',updateRulesPreview);updateRulesPreview();window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();beforeInstallPromptEvent=e;document.getElementById('installPromptBtn').classList.remove('hidden')});document.getElementById('installPromptBtn').addEventListener('click',async()=>{if(!beforeInstallPromptEvent)return;beforeInstallPromptEvent.prompt();await beforeInstallPromptEvent.userChoice;beforeInstallPromptEvent=null;document.getElementById('installPromptBtn').classList.add('hidden')})}


function updateRulesPreview(){const select=document.getElementById('rulesetSelect');const customToggle=document.getElementById('enableCustomRules');if(!select)return;const useCustom=customToggle?.checked||select.value==='custom';const rule=useCustom?null:(RULESETS[select.value]||RULESETS.all_fish);['pointsPerFish','bonusFirstFish','bonusLargestFish','bonusLargestPerSpecies','bonusNewArea','bonusOver80cm','bonusOver100cm'].forEach(key=>{const input=document.getElementById('rule_'+key);if(!input)return;if(rule){input.value=rule[key]||0;input.disabled=true}else{input.disabled=false}})}

function gridIdFromCatch(c){if(!c.location||!c.location.lat||!c.location.lng)return'unknown';const cellLat=Math.floor(Number(c.location.lat)/0.018);const cellLng=Math.floor(Number(c.location.lng)/0.036);return`grid_${cellLat}_${cellLng}`}
function tournamentById(id){return state.tournaments.find(t=>t.id===id)}
function renderTournamentParticipantPicks(){const box=document.getElementById('tournamentParticipants');if(!box)return;box.innerHTML='';state.participants.forEach(p=>{box.insertAdjacentHTML('beforeend',`<label class="pick-chip"><input type="checkbox" value="${p.id}" checked><span>${p.avatar||'🎣'} ${p.name}</span></label>`)})}
function getTournamentRules(t){if(t?.rulesetId==='custom'&&t.customRules)return {...t.customRules,name:'Eigenes Regelwerk'};return RULESETS[t?.rulesetId]||RULESETS.all_fish}
function computeTournamentScores(tournament){const catches=state.catches.filter(c=>c.tournamentId===tournament.id).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));const rules=getTournamentRules(tournament);const allowed=tournament.participantIds?.length?tournament.participantIds:state.participants.map(p=>p.id);const scoreMap=new Map(allowed.map(id=>[id,{participant:participantById(id),points:0,catches:0,totalWeight:0,bonuses:[],species:new Set()}]));const add=(id,pts,label)=>{if(!scoreMap.has(id))scoreMap.set(id,{participant:participantById(id),points:0,catches:0,totalWeight:0,bonuses:[],species:new Set()});const row=scoreMap.get(id);row.points+=pts;if(label)row.bonuses.push(label)};catches.forEach((c,i)=>{const row=scoreMap.get(c.participantId);if(!row)return;row.catches+=1;row.totalWeight+=Number(c.weightKg||0);row.points+=rules.pointsPerFish||0;if((rules.bonusNewSpecies||0)>0){const s=speciesName(c);if(!row.species.has(s)){row.species.add(s);row.points+=rules.bonusNewSpecies;row.bonuses.push(`Neue Art: ${s} +${rules.bonusNewSpecies}`)}}if((rules.bonusOver80cm||0)>0&&Number(c.lengthCm||0)>=80){row.points+=rules.bonusOver80cm;row.bonuses.push(`>80 cm +${rules.bonusOver80cm}`)}if((rules.bonusOver100cm||0)>0&&Number(c.lengthCm||0)>=100){row.points+=rules.bonusOver100cm;row.bonuses.push(`>100 cm +${rules.bonusOver100cm}`)}if((rules.bonusNewArea||0)>0){const grid=gridIdFromCatch(c);const seenBefore=catches.slice(0,i).some(x=>gridIdFromCatch(x)===grid);if(!seenBefore&&grid!=='unknown'){row.points+=rules.bonusNewArea;row.bonuses.push(`Entschneidert +${rules.bonusNewArea}`)}}});if(catches[0]&&(rules.bonusFirstFish||0)>0)add(catches[0].participantId,rules.bonusFirstFish,`Erster Fisch +${rules.bonusFirstFish}`);if((rules.bonusLargestFish||0)>0&&catches.length){const biggest=[...catches].reduce((m,c)=>!m||Number(c.weightKg||0)>Number(m.weightKg||0)?c:m,null);if(biggest)add(biggest.participantId,rules.bonusLargestFish,`Größter Fisch +${rules.bonusLargestFish}`)}if((rules.bonusLargestPerSpecies||0)>0&&catches.length){const bySpecies={};catches.forEach(c=>{const s=speciesName(c);if(!bySpecies[s]||Number(c.weightKg||0)>Number(bySpecies[s].weightKg||0))bySpecies[s]=c});Object.values(bySpecies).forEach(c=>add(c.participantId,rules.bonusLargestPerSpecies,`Größter ${speciesName(c)} +${rules.bonusLargestPerSpecies}`))}return{rules,catches,rows:[...scoreMap.values()].sort((a,b)=>b.points-a.points||b.totalWeight-a.totalWeight)}}
function openTournamentEditor(){showScreen('tournaments');const panel=document.getElementById('tournamentEditorPanel');if(panel){panel.classList.remove('is-collapsed');panel.scrollIntoView({behavior:'smooth',block:'start'});}}function closeTournamentEditor(){const panel=document.getElementById('tournamentEditorPanel');if(panel)panel.classList.add('is-collapsed');}function showTournamentSaveToast(){const toast=document.getElementById('tournamentSaveToast');if(!toast)return;toast.textContent='Erfolgreich Turnier gespeichert';toast.classList.remove('hidden');clearTimeout(window.__fishtrackTournamentToastTimer);window.__fishtrackTournamentToastTimer=setTimeout(()=>toast.classList.add('hidden'),2600);}function resetTournamentFormForNew(){const form=document.getElementById('tournamentForm');if(!form)return;form.reset();delete form.dataset.editingId;const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Turnier speichern';const customToggle=document.getElementById('enableCustomRules');if(customToggle)customToggle.checked=false;if(typeof updateRulesPreview==='function')updateRulesPreview();if(typeof renderTournamentParticipantPicks==='function')renderTournamentParticipantPicks();openTournamentEditor();}function loadTournamentIntoForm(t){openTournamentEditor();const form=document.getElementById('tournamentForm');if(!form)return;form.dataset.editingId=t.id;const nameField=form.querySelector('[name="name"]');const startField=form.querySelector('[name="start"]');const endField=form.querySelector('[name="end"]');if(nameField)nameField.value=t.name||'';if(startField)startField.value=t.start||'';if(endField)endField.value=t.end||'';const ruleset=document.getElementById('rulesetSelect');if(ruleset)ruleset.value=t.rulesetId==='custom'?'all_fish':(t.rulesetId||'all_fish');const customToggle=document.getElementById('enableCustomRules');if(customToggle)customToggle.checked=t.rulesetId==='custom';const rules=t.customRules||{};['pointsPerFish','bonusFirstFish','bonusLargestFish','bonusLargestPerSpecies','bonusNewArea','bonusOver80cm','bonusOver100cm'].forEach(key=>{const el=document.getElementById('rule_'+key);if(el)el.value=rules[key] ?? el.value ?? 0});document.querySelectorAll('#tournamentParticipants input[type="checkbox"]').forEach(cb=>{cb.checked=(t.participantIds||[]).includes(cb.value)});const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Turnier speichern';if(typeof updateRulesPreview==='function')updateRulesPreview();window.scrollTo({top:0,behavior:'smooth'})}


function storyPick(list, seed){
  return list[Math.abs(seed)%list.length];
}

function buildTournamentStory(tournament,result,first,biggest,speciesWins,topAreas){
  if(!result||!result.catches?.length){
    return `<p>Noch ist ${tournament?.name||'dieses Turnier'} eher ein sehr ambitioniertes Briefing als ein Angel-Drama. Sobald Fänge zugeordnet sind, erzähle ich hier die ganze Geschichte – inklusive Heldenmoment, Ehrenrunde und sanfter Stichelei.</p>`;
  }

  const leader=result.rows[0]||null;
  const runnerUp=result.rows[1]||null;
  const last=result.rows[result.rows.length-1]||null;
  const total=result.catches.length;
  const totalWeight=result.catches.reduce((sum,c)=>sum+Number(c.weightKg||0),0);
  const speciesCounts={};
  const baitCounts={};
  result.catches.forEach(c=>{
    const s=speciesName(c);
    speciesCounts[s]=(speciesCounts[s]||0)+1;
    const bait=c.bait||'Unbekannt';
    baitCounts[bait]=(baitCounts[bait]||0)+1;
  });
  const topSpecies=Object.entries(speciesCounts).sort((a,b)=>b[1]-a[1])[0]||null;
  const topBait=Object.entries(baitCounts).sort((a,b)=>b[1]-a[1])[0]||null;
  const leadText=leader
    ? `${leader.participant?.avatar||'🎣'} ${leader.participant?.name||'–'} führt aktuell mit ${leader.points} Punkten`
    : `Noch niemand konnte sich entscheidend absetzen`;
  const duelText=(leader&&runnerUp)
    ? `Der Vorsprung auf ${runnerUp.participant?.name||'–'} ist mit ${Math.max(0,leader.points-runnerUp.points)} Punkten ${leader.points===runnerUp.points?'komplett pulverisiert':'noch nicht gemütlich'}.`
    : `Die Bühne gehört aktuell eher dem Solisten als dem Verfolgerfeld.`;
  const openerText=first
    ? `Der erste Treffer kam durch ${participantById(first.participantId)?.name||'–'}: ${speciesName(first)} um ${fmtDateTime(first.timestamp)}.`
    : `Der Startschuss fiel bisher eher theoretisch.`;
  const biggestText=biggest
    ? `Den dicksten Mic-Drop lieferte ${participantById(biggest.participantId)?.name||'–'} mit einem ${speciesName(biggest)} von ${fmtKg(biggest.weightKg)} und ${biggest.lengthCm} cm.`
    : `Der richtig große Show-Fisch lässt noch auf sich warten.`;
  const baitText=topBait
    ? `Taktisch wirkt aktuell ${topBait[0]} wie der heimliche Co-Trainer – damit kamen ${topBait[1]} Fänge rein.`
    : `Köderseitig ist das bisher noch kreative Feldforschung.`;
  const areaText=topAreas.length
    ? `Hotspot des Turniers ist bisher Raster ${String(topAreas[0][0]).replace('grid_','')} mit ${topAreas[0][1]} Aktionen – quasi VIP-Lounge mit Flossenanschluss.`
    : `Einen echten Hotspot traut sich das Wasser noch nicht zu verraten.`;
  const speciesText=topSpecies
    ? `${topSpecies[0]} ist bislang die Headliner-Art mit ${topSpecies[1]} Fängen.`
    : `Artentechnisch läuft noch Understatement.`;
  const finaleText=(last&&total>2)
    ? `${last.participant?.avatar||'🎣'} ${last.participant?.name||'–'} liegt zwar hinten, aber genau das ist klassisches Comeback-Material. In Angelturnieren kippt die Stimmung bekanntlich schneller als ein Bier im Boot.`
    : `Noch ist alles drin – ein guter Fisch und das Narrativ schreibt sich komplett neu.`;

  return [
    `<p><strong>${tournament?.name||'Dieses Turnier'}</strong> <span class="t-subtitle">entwickelt sich zu einer Mischung aus Präzisionsarbeit, Zufallsglück und freundlicher Eskalation. ${leadText}. ${duelText}</span></p>`,
    `<p>${openerText} ${biggestText}</p>`,
    `<p>${speciesText} ${baitText} ${areaText}</p>`,
    `<p>In Summe liegen ${total} zugeordnete Fänge mit rund ${fmtKg(totalWeight)} auf dem Scoreboard. ${finaleText}</p>`
  ].join('');
}


function calculateTournamentWinPoints(result,tournament){
  const totalCatches=result?.catches?.length||0;
  const startRaw=tournament?.start||tournament?.startDate||tournament?.start_date;
  const endRaw=tournament?.end||tournament?.endDate||tournament?.end_date||new Date().toISOString().slice(0,10);
  const start=startRaw?new Date(startRaw):new Date();
  const end=endRaw?new Date(endRaw):new Date();
  const durationDays=Math.max(1,Math.ceil((end-start)/86400000)+1);
  return Math.round((totalCatches*2)+(durationDays*5));
}
async function finishTournament(tournamentId){
  const tournament=tournamentById(tournamentId||activeTournamentId);
  if(!tournament)return;
  if(tournament.finished){
    alert('Dieses Turnier ist bereits abgeschlossen.');
    return;
  }
  const result=computeTournamentScores(tournament);
  if(!result.catches.length){
    alert('Dieses Turnier hat noch keine zugeordneten Fänge.');
    return;
  }
  const topPoints=result.rows[0]?.points||0;
  const winners=result.rows.filter(r=>r.points===topPoints&&r.catches>0);
  if(!winners.length){
    alert('Es konnte kein Gewinner ermittelt werden.');
    return;
  }
  const winPoints=calculateTournamentWinPoints(result,tournament);
  tournament.finished=true;
  tournament.finishedAt=new Date().toISOString();
  tournament.winner={
    names:winners.map(w=>w.participant?.name||'–'),
    participantIds:winners.map(w=>w.participant?.id).filter(Boolean),
    points:topPoints,
    catches:winners.map(w=>w.catches)
  };
  tournament.winnerPoints=winPoints;
  activeTournamentId=tournament.id;
  await persist();
  rerender();
  alert(`🏆 ${tournament.winner.names.join(' & ')} gewinnt\n🎯 +${winPoints} Turnierpunkte`);
}

function updateTournamentKpis(){const totalEl=document.getElementById('kpi_totalTournaments');const openEl=document.getElementById('kpi_openTournaments');const closedEl=document.getElementById('kpi_closedTournaments');const catchesEl=document.getElementById('kpi_tournamentCatches');if(!totalEl||!openEl||!closedEl||!catchesEl)return;const tournaments=state.tournaments||[];const tournamentIds=new Set(tournaments.map(t=>t.id));const open=tournaments.filter(t=>!t.finished).length;const closed=tournaments.filter(t=>!!t.finished).length;const assigned=(state.catches||[]).filter(c=>c.tournamentId&&tournamentIds.has(c.tournamentId)).length;totalEl.textContent=tournaments.length;openEl.textContent=open;closedEl.textContent=closed;catchesEl.textContent=assigned}
function scrollTournamentDetailsIntoView(){const title=document.getElementById('activeTournamentTitle');const panel=title?.closest('.panel');if(!panel)return;requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}))}
function selectTournamentCard(tournamentId,{scroll=false}={}){if(!tournamentById(tournamentId))return false;activeTournamentId=tournamentId;renderTournaments();if(scroll)scrollTournamentDetailsIntoView();return true}
function renderTournaments(){const list=document.getElementById('tournamentList');const title=document.getElementById('activeTournamentTitle');const meta=document.getElementById('activeTournamentMeta');const leaderboard=document.getElementById('tournamentLeaderboard');const highlights=document.getElementById('tournamentHighlights');const story=document.getElementById('tournamentStory');if(!list||!title||!meta||!leaderboard||!highlights||!story)return;updateTournamentKpis();list.innerHTML='';

const openWrap=document.createElement('div');
const closedWrap=document.createElement('div');
openWrap.className='tournament-group tournament-group-open';
closedWrap.className='tournament-group tournament-group-closed';

openWrap.innerHTML='<h3 class="t-group-title">Offene Turniere</h3><div class="t-group-list" id="openT"></div>';
closedWrap.innerHTML='<h3 class="t-group-title">Abgeschlossene Turniere</h3><div class="t-group-list" id="closedT"></div>';

list.appendChild(openWrap);
list.appendChild(closedWrap);

const openContainer=openWrap.querySelector('#openT');
const closedContainer=closedWrap.querySelector('#closedT');

if(!state.tournaments.length){list.innerHTML='<div class="meta">Noch keine Turniere angelegt.</div>';title.textContent='Turnierauswertung';meta.textContent='Noch kein Turnier ausgewählt';leaderboard.innerHTML='';story.innerHTML='<div class="meta">Sobald ein Turnier aktiv ist, erzähle ich hier die Story dazu.</div>';highlights.innerHTML='<div class="meta">Lege zuerst ein Turnier an.</div>';return}if(!activeTournamentId||!tournamentById(activeTournamentId))activeTournamentId=state.tournaments[0].id;state.tournaments.forEach(t=>{const rules=getTournamentRules(t);const article=document.createElement('article');article.className='list-card tournament-card'+(t.id===activeTournamentId?' active':'');article.dataset.tournamentId=t.id;article.setAttribute('role','button');article.setAttribute('tabindex','0');article.setAttribute('aria-label',`Turnier ${t.name} auswählen`);article.innerHTML=`<div><div class="list-title-row"><strong>${t.name}</strong><span class="badge">${rules.name}</span></div><div class="meta">${t.start||'–'} bis ${t.end||'–'} · ${(t.participantIds||[]).length||state.participants.length} Teilnehmer</div><div class="tournament-rule">${t.finished&&t.winner?`🏆 Gewinner: ${Array.isArray(t.winner.names)?t.winner.names.join(' & '):(t.winner.name||'–')} · +${t.winnerPoints||0} Punkte`:'Fänge müssen beim Eintragen dem Turnier zugeordnet werden.'}</div></div><div class="list-actions"><button class="icon-btn finish-btn" title="Turnier abschliessen">${t.finished?'🏆':'🏁'}</button><button class="icon-btn reopen-btn" title="Wieder öffnen">↺</button><button class="icon-btn edit-btn">✎</button><button class="icon-btn delete-btn">✕</button></div>`;article.addEventListener('click',()=>selectTournamentCard(t.id,{scroll:true}));article.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectTournamentCard(t.id,{scroll:true})}});article.querySelector('.finish-btn').addEventListener('click',e=>{e.stopPropagation();finishTournament(t.id)});
article.querySelector('.reopen-btn').addEventListener('click',e=>{e.stopPropagation();reopenTournament(t.id)});
article.querySelector('.edit-btn').addEventListener('click',e=>{e.stopPropagation();loadTournamentIntoForm(t)});article.querySelector('.delete-btn').addEventListener('click',e=>{e.stopPropagation();if(!confirm('Dieses Turnier löschen? Zugeordnete Fänge bleiben bestehen, verlieren aber die Zuordnung.'))return;state.catches=state.catches.map(c=>c.tournamentId===t.id?{...c,tournamentId:''}:c);state.tournaments=state.tournaments.filter(x=>x.id!==t.id);
window.state.tournaments = state.tournaments;if(activeTournamentId===t.id)activeTournamentId=state.tournaments[0]?.id||null;persist();rerender()});
if(t.finished){
  closedContainer.appendChild(article);
}else{
  openContainer.appendChild(article);
}
});if(!openContainer.children.length)openContainer.innerHTML='<div class="meta t-empty">Keine offenen Turniere.</div>';if(!closedContainer.children.length)closedContainer.innerHTML='<div class="meta t-empty">Keine abgeschlossenen Turniere.</div>';const tournament=tournamentById(activeTournamentId);const result=computeTournamentScores(tournament);title.textContent=tournament.name;meta.textContent=tournament.finished&&tournament.winner?`${getTournamentRules(tournament).name} · abgeschlossen · 🏆 ${Array.isArray(tournament.winner.names)?tournament.winner.names.join(' & '):(tournament.winner.name||'–')} · +${tournament.winnerPoints||0} Punkte`:`${getTournamentRules(tournament).name} · ${result.catches.length} zugeordnete Fänge`;leaderboard.innerHTML='';result.rows.forEach((row,i)=>{leaderboard.insertAdjacentHTML('beforeend',`<article class="list-card"><div><div class="list-title-row"><strong>#${i+1} ${row.participant?.avatar||'🎣'} ${row.participant?.name||'–'}</strong><span class="badge" style="background:${row.participant?.color||'#4ad7d1'}">${row.points} Punkte</span></div><div class="meta">${row.catches} Fänge · ${fmtKg(row.totalWeight)}</div></div><div class="meta">${row.bonuses.slice(0,3).join(' · ')||'Nur Basiswertung'}</div></article>`)});const biggest=result.catches.reduce((m,c)=>!m||Number(c.weightKg||0)>Number(m.weightKg||0)?c:m,null);const first=result.catches[0]||null;const speciesWins={};result.catches.forEach(c=>{const s=speciesName(c);if(!speciesWins[s]||Number(c.weightKg||0)>Number(speciesWins[s].weightKg||0))speciesWins[s]=c});const topAreas=[...new Map(result.catches.map(c=>[gridIdFromCatch(c), (result.catches.filter(x=>gridIdFromCatch(x)===gridIdFromCatch(c)).length)])).entries()].filter(x=>x[0]!=='unknown').sort((a,b)=>b[1]-a[1]).slice(0,3);story.innerHTML=buildTournamentStory(tournament,result,first,biggest,speciesWins,topAreas);highlights.innerHTML='';const cards=[];if(first)cards.push(`<article class="tournament-highlight"><strong>Erster Fisch</strong><div class="meta">${speciesName(first)} von ${participantById(first.participantId)?.name||'–'} um ${fmtDateTime(first.timestamp)}</div></article>`);if(biggest)cards.push(`<article class="tournament-highlight"><strong>Größter Fisch</strong><div class="meta">${speciesName(biggest)} · ${fmtKg(biggest.weightKg)} · ${biggest.lengthCm} cm</div></article>`);Object.values(speciesWins).slice(0,4).forEach(c=>cards.push(`<article class="tournament-highlight"><strong>Artensieger ${speciesName(c)}</strong><div class="meta">${participantById(c.participantId)?.name||'–'} · ${fmtKg(c.weightKg)}</div></article>`));if(topAreas.length)cards.push(`<article class="tournament-highlight"><strong>Beste Raster</strong><div class="meta">${topAreas.map(([id,count])=>`${id.replace('grid_','')}: ${count}`).join(' · ')}</div></article>`);if(!cards.length)cards.push('<div class="meta">Noch keine Turnierdaten vorhanden.</div>');highlights.innerHTML=cards.join('')}
function initLocationPicker(){const previewEl=document.getElementById('locationPreviewMap');const modal=document.getElementById('mapPickerModal');const openBtn=document.getElementById('pickOnMap');const closeBtn=document.getElementById('closeMapPicker');const confirmBtn=document.getElementById('confirmMapLocation');const latInput=document.querySelector('[name="lat"]');const lngInput=document.querySelector('[name="lng"]');if(!previewEl||!modal||!openBtn||!closeBtn||!confirmBtn||!latInput||!lngInput||typeof L==='undefined')return;let previewMap = L.map(previewEl,{zoomControl:false,attributionControl:false}).setView([59.442773,11.654906],8);
window._mapRef = previewMap;L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(previewMap);let previewMarker=null;window.updateCatchLocationPreview=(lat,lng)=>{previewMap.invalidateSize();previewMap.setView([lat,lng],11);if(previewMarker)previewMarker.setLatLng([lat,lng]);else previewMarker=L.marker([lat,lng]).addTo(previewMap)};let pickerMap=null;let pickerMarker=null;let selected=null;const syncFromInputs=()=>{const lat=parseFloat(latInput.value),lng=parseFloat(lngInput.value);if(!isNaN(lat)&&!isNaN(lng))window.updateCatchLocationPreview(lat,lng)};latInput.addEventListener('input',syncFromInputs);lngInput.addEventListener('input',syncFromInputs);syncFromInputs();openBtn.addEventListener('click',()=>{modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');setTimeout(()=>{if(!pickerMap){pickerMap=L.map('mapPicker').setView([59.442773,11.654906],9);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(pickerMap);pickerMap.on('click',e=>{selected=e.latlng;if(pickerMarker){pickerMarker.setLatLng(selected)}else{pickerMarker=L.marker(selected,{draggable:true}).addTo(pickerMap);pickerMarker.on('dragend',()=>{selected=pickerMarker.getLatLng()})}})}const lat=parseFloat(latInput.value),lng=parseFloat(lngInput.value);if(!isNaN(lat)&&!isNaN(lng)){selected={lat,lng};pickerMap.setView([lat,lng],11);if(pickerMarker){pickerMarker.setLatLng([lat,lng])}else{pickerMarker=L.marker([lat,lng],{draggable:true}).addTo(pickerMap);pickerMarker.on('dragend',()=>{selected=pickerMarker.getLatLng()})}}pickerMap.invalidateSize()},80)});const closeModal=()=>{modal.classList.add('hidden');modal.setAttribute('aria-hidden','true')};closeBtn.addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});confirmBtn.addEventListener('click',()=>{if(!selected)return;latInput.value=Number(selected.lat).toFixed(6);lngInput.value=Number(selected.lng).toFixed(6);window.updateCatchLocationPreview(selected.lat,selected.lng);closeModal()})}
async function init(){
  if(localStorage.getItem(THEME_KEY)==='light') {
    document.body.classList.add('light');
  }

  document.getElementById('timestampInput').value =
    new Date(Date.now()-new Date().getTimezoneOffset()*60000)
      .toISOString()
      .slice(0,16);

  attachEvents();
  initParticipantDetailModal();
  initRecentCatchMapInteraction();
  initLocationPicker();
  rerender();

  await loadFromSupabase();
  rerender();

  if('serviceWorker' in navigator) {
    window.addEventListener('load', () =>
      navigator.serviceWorker.register('./service-worker.js').catch(console.error)
    );
  }
}

init();

/* Custom grid overlay and KPI integration (2026-04-18)
 * This script adds a 2×2 km raster overlay and "Alle Fänge zeigen" functionality.
 * It also updates the species KPI counters on the dashboard after rendering.
 */
(function() {
  // Local variables for grid state
  let gridVisibleNew = true;
  let gridLayersNew = [];

  // Draw a simple 2×2 km grid overlay on the map
  function drawGridNew(points) {
    if (!Array.isArray(points) || typeof L === 'undefined' || !map) return;
    // remove existing rectangles
    gridLayersNew.forEach(layer => {
      try { map.removeLayer(layer); } catch (e) {}
    });
    gridLayersNew = [];
    if (!gridVisibleNew) return;
    const used = new Set();
    points.forEach(c => {
      if (!c || !c.location || typeof c.location.lat !== 'number' || typeof c.location.lng !== 'number') return;
      const latStep = 0.018;
      const lngStep = 0.036;
      const south = Math.floor(c.location.lat / latStep) * latStep;
      const west = Math.floor(c.location.lng / lngStep) * lngStep;
      const key = south + '_' + west;
      if (used.has(key)) return;
      used.add(key);
      const rect = L.rectangle(
        [[south, west], [south + latStep, west + lngStep]],
        {
          color: '#ffd166',
          weight: 1,
          fillColor: '#ffd166',
          fillOpacity: 0.18,
          interactive: false
        }
      );
      rect.addTo(map);
      gridLayersNew.push(rect);
    });
  }

  // Fit the map view to include all provided catches
  function fitAllNew(points) {
    if (!points.length || !map) return;
    const bounds = L.latLngBounds(points.map(c => [c.location.lat, c.location.lng]));
    map.fitBounds(bounds.pad(0.25));
  }

  // Wrap renderMap to insert grid overlay drawing
  if (typeof renderMap === 'function') {
    const originalRenderMap = renderMap;
    renderMap = function(...args) {
      const result = originalRenderMap.apply(this, args);
      try {
        // draw grid only when on the map screen
        const bonusMap = getTournamentBonusMap();
  const points = state.catches.filter(c => c.location && c.location.lat != null && c.location.lng != null);
        drawGridNew(points);
      } catch (e) {}
      return result;
    };
  }

  // Wrap renderDashboard to update species KPIs
  if (typeof renderDashboard === 'function') {
    const originalRenderDashboard = renderDashboard;
    renderDashboard = function(...args) {
      const res = originalRenderDashboard.apply(this, args);
      try {
        const counts = {};
        state.catches.forEach(c => {
          const sp = c.species === 'Andere' ? (c.customSpecies || 'Andere') : c.species;
          counts[sp] = (counts[sp] || 0) + 1;
        });
        const list = ['Barsch','Hecht','Zander','Forelle','Dorsch','Andere'];
        list.forEach(sp => {
          const el = document.getElementById('kpi_' + sp);
          if (el) el.textContent = counts[sp] || 0;
        });
      } catch (e) {}
      return res;
    };
  }

  // Attach event listeners on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggle-grid-btn');
    const showAllBtn = document.getElementById('show-all-catches-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        gridVisibleNew = !gridVisibleNew;
        const bonusMap = getTournamentBonusMap();
  const points = state.catches.filter(c => c.location && c.location.lat != null && c.location.lng != null);
        drawGridNew(points);
      });
    }
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        const bonusMap = getTournamentBonusMap();
  const points = state.catches.filter(c => c.location && c.location.lat != null && c.location.lng != null);
        fitAllNew(points);
      });
    }
  });
})();

// Ensure KPI cards are refreshed immediately after saved data is loaded on page refresh
window.addEventListener('load', () => {
  setTimeout(() => {
    try {
      if (typeof renderDashboard === 'function') {
        renderDashboard();
      }
    } catch (e) {
      console.warn('KPI refresh failed after reload', e);
    }
  }, 150);
});



// Safe dashboard overrides
window.dashboardTournamentFilter = 'overview';

document.addEventListener('DOMContentLoaded', () => {
  const select = document.getElementById('dashboardTournamentSelect');
  if (select) {
    select.innerHTML = '<option value="overview">Overview</option>' + (state.tournaments || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    select.addEventListener('change', () => {
      window.dashboardTournamentFilter = select.value;
      if (typeof rerender === 'function') rerender();
    });
  }
});


  const originalCharts = renderCharts;
  renderCharts = function() {
    if (originalCharts) originalCharts();

    if (charts && charts.daily) {
      const labels = [...charts.daily.data.labels];
      charts.daily.options.onClick = function(_, elements) {
        if (!elements.length) return;
        const index = elements[0].index;
        const selectedLabel = labels[index];

        const matching = state.catches.filter(c => {
          const d = new Date(c.timestamp);
          const label = String(d.getMonth() + 1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
          return label === selectedLabel;
        });

        window.__timelineSourceCatches = matching;
        if (typeof renderSpeciesTimeline === 'function') {
          try {
  if (typeof renderSpeciesTimeline === "function") {
  try {
    renderSpeciesTimeline();
  } catch (e) {
    console.warn("Timeline error:", e);
  }
}
} catch (e) {
  console.warn("Timeline error:", e);
}
        }
      };
      charts.daily.update();
    }
  };


// Dashboard tournament select below Trip Overview + filter by catch.tournamentId
window.dashboardTournamentFilter = window.dashboardTournamentFilter || 'overview';

function getDashboardCatches(){
  if(!window.dashboardTournamentFilter || window.dashboardTournamentFilter === 'overview'){
    return state.catches;
  }

  return state.catches.filter(c => (c.tournamentId || '') === window.dashboardTournamentFilter);
}

function refreshDashboardTournamentSelect(){
  const select = document.getElementById('dashboardTournamentSelect');
  if(!select) return;

  select.innerHTML =
    '<option value="overview">Overview</option>' +
    (state.tournaments || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  select.value = window.dashboardTournamentFilter || 'overview';

  if(select.value !== (window.dashboardTournamentFilter || 'overview')){
    window.dashboardTournamentFilter = 'overview';
    select.value = 'overview';
  }

  if(select.dataset.bound === '1') return;
  select.dataset.bound = '1';

  select.addEventListener('change', () => {
    window.dashboardTournamentFilter = select.value;

    refreshDashboardTournamentSelect();

    if(typeof renderDashboard === 'function') renderDashboard();
    if(typeof renderForecast === 'function') renderForecast();
    if(typeof renderTimeHeatmap === 'function') renderTimeHeatmap();
    if(typeof renderCharts === 'function') renderCharts();
    if(typeof renderMap === 'function') renderMap();
    if(typeof renderSpeciesTimeline === 'function') try{if (typeof renderSpeciesTimeline === "function") {
  try {
    renderSpeciesTimeline();
  } catch (e) {
    console.warn("Timeline error:", e);
  }
}}catch(e){console.error("Timeline crash:",e);}
  });
}

(function(){
  function withDashboardFilter(fn){
    if(typeof fn !== 'function') return fn;

    return function(){
      const originalCatches = state.catches;
      state.catches = getDashboardCatches();
      try{
        return fn.apply(this, arguments);
      } finally {
        state.catches = originalCatches;
      }
    };
  }

  const __populateSelects = window.populateSelects;
  if(typeof __populateSelects === 'function'){
    window.populateSelects = function(){
      const result = __populateSelects.apply(this, arguments);
      refreshDashboardTournamentSelect();
      return result;
    };
  }

  if(typeof window.renderDashboard === 'function'){
    window.renderDashboard = withDashboardFilter(window.renderDashboard);
  }
  if(typeof window.renderForecast === 'function'){
    window.renderForecast = withDashboardFilter(window.renderForecast);
  }
  if(typeof window.renderTimeHeatmap === 'function'){
    window.renderTimeHeatmap = withDashboardFilter(window.renderTimeHeatmap);
  }
  if(typeof window.renderCharts === 'function'){
    window.renderCharts = withDashboardFilter(window.renderCharts);
  }
  if(typeof window.renderMap === 'function'){
    window.renderMap = withDashboardFilter(window.renderMap);
  }
  if(typeof window.renderSpeciesTimeline === 'function'){
    window.renderSpeciesTimeline = withDashboardFilter(window.renderSpeciesTimeline);
  }

  document.addEventListener('DOMContentLoaded', refreshDashboardTournamentSelect);
  window.addEventListener('load', () => setTimeout(refreshDashboardTournamentSelect, 50));
})();

// Absolute override for Artenverteilung chart
// Minimal-invasive Anpassung: gleicher Bar-Chart-Stil wie "Fänge pro Tag",
// aber aggregiert nach Fang-Uhrzeit statt nach Datum.
setInterval(() => {
  const canvas = document.getElementById('speciesTimelineChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const catches = typeof getDashboardCatches === 'function'
    ? getDashboardCatches()
    : (window.state?.catches || state?.catches || []);

  const signature = JSON.stringify(catches.map(c => [c.id, c.timestamp || c.createdAt]));
  if (window.__speciesSignature === signature) return;
  window.__speciesSignature = signature;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const labels = Array.from({length:24}, (_,i)=>String(i).padStart(2,'0') + ':00');
  const values = new Array(24).fill(0);

  catches.forEach(c => {
    const rawDate = c.timestamp || c.createdAt;
    if (!rawDate) return;
    const d = new Date(rawDate);
    if (Number.isNaN(d.getTime())) return;
    values[d.getHours()] += 1;
  });

  new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Fänge',
        data: values,
        backgroundColor: '#4ad7d1',
        borderRadius: 12
      }]
    },
    options: (typeof dashboardChartOptions === 'function' ? dashboardChartOptions() : { responsive:true, maintainAspectRatio:false, animation:false, plugins:{ legend:{ display:false } } })
  });
}, 250);


/* Chart heights are now synchronized via CSS wrappers and shared Chart.js options. */


// Interactive heatmap zones
window.selectedHeatmapZone = null;

function getZoneFilteredCatches() {
  const base = (typeof getDashboardCatches === 'function')
    ? getDashboardCatches()
    : state.catches;

  if (!window.selectedHeatmapZone) return base;

  return base.filter(c => {
    const zone = c.heatmapZone || c.zone || c.spotLabel || '';
    return String(zone) === String(window.selectedHeatmapZone);
  });
}

setTimeout(() => {
  const heatmap = document.querySelector('.heatmap-grid') || document.querySelector('[data-heatmap-grid]');
  if (!heatmap) return;

  heatmap.addEventListener('click', (e) => {
    const card = e.target.closest('.heatmap-zone,.zone-card,[data-zone]');
    if (!card) return;

    const zone = card.dataset.zone || card.getAttribute('data-zone') || card.querySelector('strong')?.textContent?.trim();
    if (!zone) return;

    document.querySelectorAll('.heatmap-zone,.zone-card,[data-zone]').forEach(el => {
      el.classList.remove('active-zone');
    });

    if (window.selectedHeatmapZone === zone) {
      window.selectedHeatmapZone = null;
    } else {
      window.selectedHeatmapZone = zone;
      card.classList.add('active-zone');
    }

    const original = state.catches;
    state.catches = getZoneFilteredCatches();

    try {
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderCharts === 'function') renderCharts();
      if (typeof renderSpeciesTimeline === 'function') try{if (typeof renderSpeciesTimeline === "function") {
  try {
    renderSpeciesTimeline();
  } catch (e) {
    console.warn("Timeline error:", e);
  }
}}catch(e){console.error("Timeline crash:",e);}
      if (typeof renderMap === 'function') renderMap();
    } finally {
      state.catches = original;
    }
  });
}, 500);


// Reviewed heatmap zone click handling for actual .heat-cell elements
document.addEventListener('click', (e) => {
  const cell = e.target.closest('.heat-cell');
  if (!cell) return;

  const zoneName = cell.dataset.zone;
  if (!zoneName) return;

  document.querySelectorAll('.heat-cell').forEach(el => el.classList.remove('active-zone'));

  if (window.selectedHeatmapZone === zoneName) {
    window.selectedHeatmapZone = null;
  } else {
    window.selectedHeatmapZone = zoneName;
    cell.classList.add('active-zone');
  }

  const all = typeof getDashboardCatches === 'function'
    ? getDashboardCatches()
    : state.catches;

  // recompute which catches belong to clicked zone using same 5x5 logic
  const withZone = all.filter(c => c.location?.lat && c.location?.lng);
  if (!withZone.length) return;

  const rows = 5, cols = 5;
  const minLat = 54, maxLat = 72;
  const minLng = 4, maxLng = 32;

  const filtered = !window.selectedHeatmapZone ? all : all.filter(c => {
    if (!c.location?.lat || !c.location?.lng) return false;
    const rows = 5, cols = 5;
    const r = Math.min(rows-1, Math.max(0, Math.floor(((c.location.lat-minLat)/(maxLat-minLat))*rows)));
    const col = Math.min(cols-1, Math.max(0, Math.floor(((c.location.lng-minLng)/(maxLng-minLng))*cols)));
    const zone = `Zone ${r*cols+col+1}`;
    return zone === window.selectedHeatmapZone;
  });

  const original = state.catches;
  state.catches = filtered;

  try {
    renderDashboard();
    renderCharts();
    renderTimeHeatmap();
    renderMap();
    if (typeof renderSpeciesTimeline === 'function') try{if (typeof renderSpeciesTimeline === "function") {
  try {
    renderSpeciesTimeline();
  } catch (e) {
    console.warn("Timeline error:", e);
  }
}}catch(e){console.error("Timeline crash:",e);}
  } finally {
    state.catches = original;
  }
});


// Fixed 5x5 Europe zone system
function getEuropeZone(lat, lng){
  const rows = 5;
  const cols = 5;

  // Fixed Europe bounds
  const minLat = 35;
  const maxLat = 72;
  const minLng = -10;
  const maxLng = 40;

  const clampedLat = Math.min(maxLat - 0.0001, Math.max(minLat, lat));
  const clampedLng = Math.min(maxLng - 0.0001, Math.max(minLng, lng));

  // north -> south
  const row = Math.min(rows - 1, Math.floor(((maxLat - clampedLat) / (maxLat - minLat)) * rows));
  const col = Math.min(cols - 1, Math.floor(((clampedLng - minLng) / (maxLng - minLng)) * cols));

  return row * cols + col + 1;
}

// Static read-only labels for the existing fixed 5x5 Europe zones.
// Important: display-only decorator; does not affect zone calculation, filtering, storage or map rendering.
const HEATMAP_ZONE_NAMES = {
  1: 'Nordatlantik West',
  2: 'Nordsee Nord',
  3: 'Skandinavien Nord',
  4: 'Finnland / Baltikum Nord',
  5: 'Osteuropa Nord',
  6: 'Britische Inseln Nord',
  7: 'Nordsee Küste',
  8: 'Südskandinavien',
  9: 'Baltikum / Ostsee',
  10: 'Osteuropa Mitte',
  11: 'Atlantikküste West',
  12: 'Benelux / Nordfrankreich',
  13: 'Deutschland Mitte',
  14: 'Polen / Tschechien',
  15: 'Karpatenraum',
  16: 'Frankreich West',
  17: 'Alpenraum / Schweiz',
  18: 'Österreich / Norditalien',
  19: 'Balkan Nord',
  20: 'Schwarzes Meer West',
  21: 'Iberische Atlantikküste',
  22: 'Mittelmeer West',
  23: 'Italien / Adria',
  24: 'Griechenland / Ägäis',
  25: 'Türkei West'
};

function heatmapZoneName(zone){
  return HEATMAP_ZONE_NAMES[Number(zone)] || `Gebiet ${zone}`;
}

// Override heatmap rendering with fixed Europe zones
window.renderHeatmapGrid = function(points){
  const container = document.getElementById('heatmapGrid');
  if(!container) return;

  const grid = Array.from({length:25},()=>0);

  points.forEach(c => {
    if(!c.location?.lat || !c.location?.lng) return;
    const zone = getEuropeZone(c.location.lat, c.location.lng);
    grid[zone - 1] += 1;
  });

  const max = Math.max(1, ...grid);

  container.innerHTML = '';

  grid.forEach((count, idx) => {
    const zone = idx + 1;
    const cell = document.createElement('div');
    const opacity = 0.10 + (count / max) * 0.90;

    cell.className = 'heat-cell';
    cell.dataset.zone = String(zone);
    cell.style.background = `rgba(143,240,167,${opacity})`;
    cell.style.color = opacity > 0.45 ? '#06210c' : '#dbe7ef';
    const zoneName = heatmapZoneName(zone);
    cell.setAttribute('title', `Zone ${zone} – ${zoneName}: ${count} Fang${count === 1 ? '' : 'e'}`);
    cell.setAttribute('aria-label', `Zone ${zone} – ${zoneName}, ${count} Fang${count === 1 ? '' : 'e'}`);
    cell.innerHTML = `<strong><span class="zone-number">Zone ${zone}</span><span class="zone-name">${zoneName}</span></strong><span>${count} Fang${count === 1 ? '' : 'e'}</span>`;

    if(String(window.selectedHeatmapZone || '') === String(zone)){
      cell.classList.add('active-zone');
    }

    container.appendChild(cell);
  });
};

// Replace click logic with exact zone filtering
document.addEventListener('click', (e) => {
  const cell = e.target.closest('.heat-cell');
  if(!cell) return;

  const zone = cell.dataset.zone;
  if(!zone) return;

  window.selectedHeatmapZone = window.selectedHeatmapZone === zone ? null : zone;

  document.querySelectorAll('.heat-cell').forEach(el => {
    el.classList.toggle('active-zone', el.dataset.zone === window.selectedHeatmapZone);
  });

  const original = state.catches;

  try{
    const tournamentFiltered = typeof getDashboardCatches === 'function'
      ? getDashboardCatches()
      : state.catches;

    state.catches = !window.selectedHeatmapZone
      ? tournamentFiltered
      : tournamentFiltered.filter(c => {
          if(!c.location?.lat || !c.location?.lng) return false;
          return String(getEuropeZone(c.location.lat, c.location.lng)) === String(window.selectedHeatmapZone);
        });

    renderDashboard();
    renderCharts();
    renderTimeHeatmap();
    renderMap();
    if(typeof renderSpeciesTimeline === 'function') try{if (typeof renderSpeciesTimeline === "function") {
  try {
    renderSpeciesTimeline();
  } catch (e) {
    console.warn("Timeline error:", e);
  }
}}catch(e){console.error("Timeline crash:",e);}
  } finally {
    state.catches = original;
  }
});


window.analyticsTournamentFilter = window.analyticsTournamentFilter || 'overview';

function getAnalyticsCatches(){
  if(!window.analyticsTournamentFilter || window.analyticsTournamentFilter === 'overview'){
    return state.catches;
  }

  return state.catches.filter(c => (c.tournamentId || '') === window.analyticsTournamentFilter);
}

function rerenderAnalyticsView(){
  if(typeof refreshAnalyticsTournamentSelect === 'function'){
    refreshAnalyticsTournamentSelect();
  }

  const originalCatches = state.catches;
  state.catches = getAnalyticsCatches();

  try{
    if(typeof renderCharts === 'function'){
      renderCharts();
    }
    if(typeof renderTimeHeatmap === 'function'){
      renderTimeHeatmap();
    }
    if(typeof renderRecords === 'function'){
      renderRecords();
    }
    if(typeof renderForecast === 'function'){
      renderForecast();
    }
    if(typeof renderSpotBaitMatrix === 'function'){
      renderSpotBaitMatrix();
    }
  } finally {
    state.catches = originalCatches;
  }
}

function refreshAnalyticsTournamentSelect(){
  const select = document.getElementById('analyticsTournamentSelect2');
  if(!select) return;

  select.innerHTML =
    '<option value="overview">Overview</option>' +
    (state.tournaments || []).map(t => `<option value="${t.id}">${t.name}</option>`).join('');

  if(!(state.tournaments || []).some(t => t.id === window.analyticsTournamentFilter)){
    window.analyticsTournamentFilter = 'overview';
  }

  select.value = window.analyticsTournamentFilter;

  if(select.dataset.bound === '1') return;
  select.dataset.bound = '1';

  select.addEventListener('change', () => {
    window.analyticsTournamentFilter = select.value;
    rerenderAnalyticsView();
  });
}

function withAnalyticsFilter(fn){
  if(typeof fn !== 'function') return fn;

  return function(){
    const analyticsScreen = document.getElementById('screen-analytics');
    const shouldFilter = analyticsScreen?.classList.contains('active');

    if(!shouldFilter){
      return fn.apply(this, arguments);
    }

    const originalCatches = state.catches;
    state.catches = getAnalyticsCatches();

    try{
      return fn.apply(this, arguments);
    } finally {
      state.catches = originalCatches;
    }
  };
}

document.addEventListener('DOMContentLoaded', refreshAnalyticsTournamentSelect);
window.addEventListener('load', () => setTimeout(refreshAnalyticsTournamentSelect, 50));

renderCharts = withAnalyticsFilter(renderCharts);
renderTimeHeatmap = withAnalyticsFilter(renderTimeHeatmap);
renderRecords = withAnalyticsFilter(renderRecords);
renderForecast = withAnalyticsFilter(renderForecast);

const originalShowScreenForAnalyticsFilter = showScreen;
showScreen = function(name){
  const result = originalShowScreenForAnalyticsFilter.apply(this, arguments);

  if(name === 'analytics'){
    setTimeout(() => {
      refreshAnalyticsTournamentSelect();
      rerenderAnalyticsView();
    }, 0);
  }

  return result;
}


// Override forecast to include 7-day and 30-day cards
window.getForecast = function(){
  const catches = state.catches || [];
  if(!catches.length){
    return {
      text7: 'Noch zu wenig Daten für eine sinnvolle Prognose.',
      text30: 'Noch zu wenig Daten für eine sinnvolle Prognose.'
    };
  }

  const dates = catches.map(c => {
    const d = new Date(c.timestamp);
    d.setHours(0,0,0,0);
    return d.getTime();
  });

  const min = Math.min(...dates);
  const max = Math.max(...dates);
  const days = Math.max(1, Math.round((max - min) / 86400000) + 1);

  const avgPerDay = catches.length / days;
  const projected7 = Math.round(avgPerDay * 7);
  const projected30 = Math.round(avgPerDay * 30);

  const totalWeight = catches.reduce((s,c) => s + Number(c.weightKg || 0), 0);
  const avgWeight = catches.length ? totalWeight / catches.length : 0;

  return {
    text7: `Wenn ihr dieses Tempo haltet, landet ihr in 7 Tagen bei etwa ${projected7} Fängen. Das entspricht rund ${fmtKg(projected7 * avgWeight)} Gesamtgewicht.`,
    text30: `Wenn ihr dieses Tempo haltet, landet ihr in 30 Tagen bei etwa ${projected30} Fängen. Das entspricht rund ${fmtKg(projected30 * avgWeight)} Gesamtgewicht.`
  };
};

window.renderForecast = function(){
  const forecast = window.getForecast();

  const el = document.getElementById('forecastBox');
  if(!el) return;

  el.innerHTML = `
    <article class="insight-card">
      <strong>7-Tage-Prognose</strong> <span class="t-subtitle"> </span><span>${forecast.text7}</span>
    </article>
    <article class="insight-card">
      <strong>30-Tage-Prognose</strong>
      <span>${forecast.text30}</span>
    </article>
  `;
};

setTimeout(() => {
  if(typeof window.renderForecast === 'function'){
    window.renderForecast();
  }
}, 100);


// Passive Fischerregel observer - no overrides, no 7-day forecast
window.addEventListener('load', () => {
  const quotes = [
    'Wenn die Möwen landeinwärts fliegen, ziehen die Räuberfische flach.',
    'Wenn der Wind dreht, dreht oft auch das Glück am Wasser.',
    'Trübes Wasser bringt oft den schwersten Fisch.',
    'Morgennebel auf dem Fjord – ein guter Tag für kapitale Fänge.',
    'Steigt der Druck am Morgen, beissen die Grossen bis zum Abend.'
  ];

  const addQuote = () => {
    const box = document.getElementById('forecastBox');
    if (!box) return;

    const cards = box.querySelectorAll('.insight-card');
    if (!cards.length) return;

    let quoteCard = box.querySelector('[data-fisher-quote="1"]');
    if (!quoteCard) {
      quoteCard = document.createElement('article');
      quoteCard.className = 'insight-card';
      quoteCard.setAttribute('data-fisher-quote', '1');
      box.appendChild(quoteCard);
    }

    quoteCard.innerHTML = `
      <strong>Fischerregel des Tages</strong>
      <span>${quotes[Math.floor(Math.random() * quotes.length)]}</span>
    `;
  };

  const observer = new MutationObserver(addQuote);

  const start = () => {
    const box = document.getElementById('forecastBox');
    if (!box) return;
    observer.observe(box, { childList: true, subtree: false });
    addQuote();
  };

  start();
  setTimeout(start, 500);
});


function ensureCatchDropdownFields(){
  const baitField=document.querySelector('[name="bait"]');
  if(baitField&&baitField.tagName==='INPUT'){
    const wrapper=baitField.closest('label');
    if(wrapper){
      wrapper.innerHTML=`<span>Köder <small class="subtle-inline">(optional)</small></span>
  <select name="bait">
    <option value="">Bitte wählen</option>
    <option>Gummifisch</option>
    <option>Wobbler</option>
    <option>Spinner</option>
    <option>Blinker</option>
    <option>Jerkbait</option>
    <option>Crankbait</option>
    <option>Topwater-Köder</option>
    <option>Naturköder</option>
    <option>Köderfisch</option>
    <option>Andere</option>
  </select>`;
    }
  }
  const spotField=document.querySelector('[name="spotLabel"]');
  if(spotField&&spotField.tagName==='INPUT'){
    const wrapper=spotField.closest('label');
    if(wrapper){
      wrapper.innerHTML=`<span>Spot / Bereich <small class="subtle-inline">(optional)</small></span>
  <select name="spotLabel">
    <option value="">Bitte wählen</option>
    <option>Schilfkante</option>
    <option>Krautkante</option>
    <option>Totholz</option>
    <option>Steilkante</option>
    <option>Flachwasserbucht</option>
    <option>Einlauf</option>
    <option>Auslauf</option>
    <option>Strömungskante</option>
    <option>Brückenpfeiler</option>
    <option>Seerosenfeld</option>
    <option>Andere</option>
  </select>`;
    }
  }
}


document.addEventListener('DOMContentLoaded',()=>{ensureCatchDropdownFields()});



/* Premium Analytics Dashboard – read-only UI layer */
function analyticsCountBy(catches, getter){
  const map=new Map();
  catches.forEach(c=>{const key=getter(c)||'Unbekannt';map.set(key,(map.get(key)||0)+1)});
  return [...map.entries()].sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0])));
}
function analyticsAvg(values){
  const nums=values.map(Number).filter(Number.isFinite);
  return nums.length?nums.reduce((s,v)=>s+v,0)/nums.length:0;
}
function buildPremiumAnalyticsModel(){
  const catches=[...(state.catches||[])];
  const summary=typeof computeSummary==='function'?computeSummary():null;
  const species=analyticsCountBy(catches,c=>speciesName(c));
  const spots=analyticsCountBy(catches,c=>c.spotLabel||c.location?.label||'Unbekannter Spot');
  const baits=analyticsCountBy(catches,c=>c.bait||'Unbekannter Köder');
  const hours=Array.from({length:24},(_,hour)=>({hour,count:0,weight:0}));
  const weekdays=['So','Mo','Di','Mi','Do','Fr','Sa'].map(day=>({day,count:0}));
  catches.forEach(c=>{const d=new Date(c.timestamp||c.createdAt);if(Number.isNaN(d.getTime()))return;const h=d.getHours();hours[h].count+=1;hours[h].weight+=Number(c.weightKg||0);weekdays[d.getDay()].count+=1;});
  const bestHour=hours.reduce((m,h)=>h.count>m.count?h:m,{hour:0,count:0,weight:0});
  const bestDay=weekdays.reduce((m,d)=>d.count>m.count?d:m,{day:'–',count:0});
  const comboMap=new Map();
  catches.forEach(c=>{const spot=c.spotLabel||c.location?.label||'Unbekannter Spot';const bait=c.bait||'Unbekannter Köder';const key=`${spot} × ${bait}`;comboMap.set(key,(comboMap.get(key)||0)+1);});
  const topCombo=[...comboMap.entries()].sort((a,b)=>b[1]-a[1])[0];
  const pStats=typeof computeParticipantStats==='function'?computeParticipantStats():[];
  const efficient=[...pStats].filter(p=>p.count>0).map(p=>({...p,pointsPerCatch:p.points/p.count})).sort((a,b)=>b.pointsPerCatch-a.pointsPerCatch)[0];
  return {catches,summary,species,spots,baits,hours,weekdays,bestHour,bestDay,topCombo,pStats,efficient,totalWeight:catches.reduce((s,c)=>s+Number(c.weightKg||0),0),avgLength:analyticsAvg(catches.map(c=>c.lengthCm)),avgWeight:analyticsAvg(catches.map(c=>c.weightKg))};
}
function premiumInsightCard(icon,label,value,detail){
  return `<article class="analytics-insight-card"><span class="analytics-insight-icon">${icon}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(value||'–'))}</strong><p>${escapeHtml(detail||'')}</p></div></article>`;
}
function renderPremiumAnalyticsDashboard(){
  const hero=document.getElementById('analyticsOverviewKpis');
  const summaryEl=document.getElementById('analyticsExecutiveSummary');
  const topEl=document.getElementById('analyticsTopInsights');
  const intelEl=document.getElementById('analyticsIntelligenceGrid');
  if(!hero&&!summaryEl&&!topEl&&!intelEl)return;
  const m=buildPremiumAnalyticsModel();
  const leader=m.pStats[0];
  const topSpecies=m.species[0];
  const topSpot=m.spots[0];
  const topBait=m.baits[0];
  if(summaryEl){
    summaryEl.textContent=m.catches.length
      ? `${m.catches.length} Fänge, ${fmtKg(m.totalWeight)} Gesamtgewicht und ${leader?leader.name+' als aktueller Performance-Anker':'noch kein Leader'} – die stärksten Muster sind Zeitfenster, Spot und Köder.`
      : 'Noch keine Fänge vorhanden. Sobald Daten erfasst sind, entsteht hier automatisch das Analytics Cockpit.';
  }
  if(hero){
    hero.innerHTML=[
      ['Fänge',m.catches.length,'gesamt analysiert'],
      ['Gewicht',fmtKg(m.totalWeight),'kumuliert'],
      ['Ø Länge',`${Math.round(m.avgLength||0)} cm`,'pro Fang'],
      ['Beste Zeit',m.bestHour.count?`${String(m.bestHour.hour).padStart(2,'0')}:00`:'–',m.bestHour.count?`${m.bestHour.count} Fänge`:'noch offen']
    ].map(([label,value,detail])=>`<article><span>${label}</span><strong>${value}</strong><small>${detail}</small></article>`).join('');
  }
  if(topEl){
    topEl.innerHTML=m.catches.length?[
      premiumInsightCard('🏆','Leader',leader?.name||'–',leader?`${leader.points} Punkte · ${leader.count} Fänge`:'Noch keine Wertung'),
      premiumInsightCard('🐟','Top-Art',topSpecies?.[0]||'–',topSpecies?`${topSpecies[1]} Fänge dominieren die Verteilung`:'Noch keine Art erfasst'),
      premiumInsightCard('📍','Hotspot',topSpot?.[0]||'–',topSpot?`${topSpot[1]} Fänge an diesem Spot`:'Noch kein Spot erfasst'),
      premiumInsightCard('🎯','Top-Köder',topBait?.[0]||'–',topBait?`${topBait[1]} erfolgreiche Einsätze`:'Noch kein Köder erfasst')
    ].join(''):'<article class="analytics-empty glass">Noch keine Daten für Top Insights.</article>';
  }
  if(intelEl){
    const cards=[];
    cards.push(premiumInsightCard('⏰','Aktivitätsmuster',m.bestHour.count?`${String(m.bestHour.hour).padStart(2,'0')}:00 Uhr`:'–',m.bestHour.count?`Stärkstes Zeitfenster mit ${m.bestHour.count} Fang${m.bestHour.count===1?'':'en'}.`:'Noch kein belastbares Zeitmuster.'));
    cards.push(premiumInsightCard('📅','Bester Wochentag',m.bestDay.count?m.bestDay.day:'–',m.bestDay.count?`${m.bestDay.count} Fang${m.bestDay.count===1?'':'e'} an diesem Wochentag.`:'Noch kein Wochentagsmuster.'));
    cards.push(premiumInsightCard('🧪','Beste Kombination',m.topCombo?.[0]||'–',m.topCombo?`${m.topCombo[1]} Treffer mit dieser Spot-Köder-Kombi.`:'Noch keine Kombination erkennbar.'));
    cards.push(premiumInsightCard('⚡','Punkte-Effizienz',m.efficient?.name||'–',m.efficient?`${m.efficient.pointsPerCatch.toFixed(1)} Punkte pro Fang.`:'Noch keine Fangwertung vorhanden.'));
    intelEl.innerHTML=cards.join('');
  }
}

(function(){
  const originalRerenderAnalyticsView=window.rerenderAnalyticsView||rerenderAnalyticsView;
  if(typeof originalRerenderAnalyticsView==='function'){
    window.rerenderAnalyticsView=function(){
      const result=originalRerenderAnalyticsView.apply(this,arguments);
      renderPremiumAnalyticsDashboard();
      return result;
    };
    try{rerenderAnalyticsView=window.rerenderAnalyticsView;}catch(e){}
  }
  document.addEventListener('DOMContentLoaded',()=>setTimeout(renderPremiumAnalyticsDashboard,0));
  window.addEventListener('load',()=>setTimeout(renderPremiumAnalyticsDashboard,120));
})();


function renderSpotBaitMatrix(){
  const container=document.getElementById('spotBaitMatrix');
  if(!container) return;

  const catches=[...state.catches];
  const spots=[...new Set(catches.map(c=>c.spotLabel||'Unbekannt'))];
  const baits=[...new Set(catches.map(c=>c.bait||'Unbekannt'))];

  if(!spots.length||!baits.length){
    container.style.removeProperty('--matrix-cols');
    container.style.removeProperty('--matrix-min-width');
    container.innerHTML='<div class="meta">Noch zu wenig Daten für die Matrix.</div>';
    return;
  }

  container.style.setProperty('--matrix-cols', baits.length);
  container.style.setProperty('--matrix-min-width', `${220+(baits.length*130)+(baits.length*14)}px`);

  const max=Math.max(1,...spots.flatMap(spot=>baits.map(bait=>catches.filter(c=>(c.spotLabel||'Unbekannt')===spot&&(c.bait||'Unbekannt')===bait).length)));

  container.innerHTML=
    '<div class="matrix-header"><div class="matrix-label">Spot \/ Köder</div>'+baits.map(b=>`<div class="matrix-label">${escapeHtml(b)}</div>`).join('')+'</div>'+
    spots.map(spot=>'<div class="matrix-row"><div class="matrix-label">'+escapeHtml(spot)+'</div>'+baits.map(bait=>{
      const count=catches.filter(c=>(c.spotLabel||'Unbekannt')===spot&&(c.bait||'Unbekannt')===bait).length;
      const opacity=.12+(count/max)*.88;
      return `<div class="matrix-cell" style="background:rgba(74,215,209,${opacity})"><strong>${count}</strong><span>Fänge</span></div>`;
    }).join('')+'</div>').join('');
}

function renderParticipantTimeline(){
  const canvas=document.getElementById('timelineBubbleChart');
  canvas.height=260;
  if(!canvas||typeof Chart==='undefined') return;

  if(window.timelineBubbleChartInstance){
    window.timelineBubbleChartInstance.destroy();
  }

  const participants=[...new Set(state.catches.map(c=>participantById(c.participantId)?.name).filter(Boolean))];

  const datasets=participants.map((name,index)=>({
    label:name,
    data:state.catches.filter(c=>participantById(c.participantId)?.name===name).map(c=>({
      x:new Date(c.timestamp).getHours()+new Date(c.timestamp).getMinutes()/60,
      y:index+1,
      r:Math.max(6,Math.min(18,Number(c.weightKg||1)*2))
    }))
  }));

  window.timelineBubbleChartInstance=new Chart(canvas,{
    type:'bubble',
    data:{datasets},
    options:{
      plugins:{
        legend:{
          labels:{
            color:css('--text'),
            usePointStyle:true,
            pointStyle:'circle',
            boxWidth:8,
            boxHeight:8,
            padding:14
          }
        }
      },
      scales:{
        x:{min:0,max:24,ticks:{color:css('--muted'),callback:v=>String(v).padStart(2,'0')+':00'},grid:{color:'rgba(255,255,255,.08)'}},
        y:{ticks:{color:css('--muted'),callback:v=>participants[v-1]||''},grid:{display:false}}
      }
    }
  });
}

function renderSpeciesTimeline(){
  const canvas = document.getElementById('speciesTimelineBubbleChart') || document.getElementById('speciesTimelineBubble');
  if(!canvas || typeof Chart === 'undefined') {
    console.warn('SpeciesTimeline canvas fehlt → skip');
    return;
  }

  canvas.height = 260;

  if(window.speciesTimelineBubbleChartInstance){
    window.speciesTimelineBubbleChartInstance.destroy();
  }

  const species=[...new Set(state.catches.map(c=>c.species||c.customSpecies||'Andere').filter(Boolean))];

  const datasets=species.map((name,index)=>({
    label:name,
    data:state.catches
      .filter(c=>(c.species||c.customSpecies||'Andere')===name)
      .map(c=>({
        x:new Date(c.timestamp).getHours()+new Date(c.timestamp).getMinutes()/60,
        y:index+1,
        r:Math.max(6,Math.min(18,Number(c.weightKg||c.weight||1)*2))
      })),
    borderColor: speciesPalette[name] || `hsl(${(index*67)%360} 75% 60%)`,
    backgroundColor: speciesPalette[name] || `hsl(${(index*67)%360} 75% 60%)`,
    borderWidth: 1.5
  }));

  window.speciesTimelineBubbleChartInstance=new Chart(canvas,{
    type:'bubble',
    data:{datasets},
    options:{
      plugins:{
        legend:{
          labels:{
            color:css('--text'),
            usePointStyle:true,
            pointStyle:'circle',
            boxWidth:8,
            boxHeight:8,
            padding:14
          }
        }
      },
      scales:{
        x:{min:0,max:24,ticks:{color:css('--muted'),callback:v=>String(v).padStart(2,'0')+':00'},grid:{color:'rgba(255,255,255,.08)'}},
        y:{ticks:{color:css('--muted'),callback:v=>species[v-1]||''},grid:{display:false}}
      }
    }
  });
}


// ===== TOPO CONTROL (VISIBLE FIX) =====
setTimeout(() => {

    const topoLayer = L.tileLayer(
        "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 17,
            attribution: "© OpenTopoMap"
        }
    );

    let isTopo = false;
    let baseLayer = null;

    map.eachLayer(l=>{
        if(l instanceof L.TileLayer && !baseLayer){
            baseLayer = l;
        }
    });

    const topoControl = L.control({ position: "topright" });

    topoControl.onAdd = function () {
        const btn = L.DomUtil.create("button", "leaflet-bar");
        btn.innerHTML = "⛰";
        btn.style.width = "40px";
        btn.style.height = "40px";
        btn.style.cursor = "pointer";

        L.DomEvent.on(btn, "click", function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);

            console.log("TOPO CLICK", isTopo);

            if (!isTopo) {
                if (baseLayer) map.removeLayer(baseLayer);
                topoLayer.addTo(map);
                isTopo = true;
            } else {
                map.removeLayer(topoLayer);
                if (baseLayer) baseLayer.addTo(map);
                isTopo = false;
            }
        });

        return btn;
    };

    topoControl.addTo(map);

}, 1000);


(function(){
 const KEY="mobileModeEnabled";

 function apply(){
  const en=localStorage.getItem(KEY)==="true";
  document.body.classList.toggle("mobile-mode",en);
 }

 function toggle(){
  const cur=localStorage.getItem(KEY)==="true";
  localStorage.setItem(KEY,(!cur).toString());
  apply();
 }

 document.addEventListener("DOMContentLoaded",()=>{
  apply();

  const header=document.querySelector(".topbar, header");
  const existingBtns=header ? header.querySelectorAll("button") : [];

  const btn=document.createElement("button");
  btn.id="mobileToggle";
  btn.className="mobile-toggle-btn";
  btn.innerHTML="📱";

  if(existingBtns.length>0){
    existingBtns[existingBtns.length-1].after(btn);
  } else if(header){
    header.appendChild(btn);
  }

  btn.addEventListener("click",toggle);
 });
})();


function reopenTournament(tournamentId){
  const t = tournamentById(tournamentId);
  if(!t || !t.finished) return;

  if(!confirm("Turnier wirklich wieder öffnen? Der gespeicherte Gewinner-Snapshot bleibt erhalten.")) return;

  t.finished = false;
  t.reopenedAt = new Date().toISOString();

  persist();
  rerender();
}




function enhanceLeaderboardTournamentBonus(){
  const bonusMap = getTournamentBonusMap();

  // 🆕 EINMAL berechnen (nicht pro row!)
  const trophyMapCount = {};
  const tournaments = window.state.tournaments || [];

  tournaments.forEach(t => {
    if (!t.finished || !t.winner) return;

    const names = Array.isArray(t.winner.names)
      ? t.winner.names
      : (t.winner.name ? [t.winner.name] : []);

    names.forEach(name => {
      const clean = String(name || "").replace(/[^a-zA-Z0-9 äöüÄÖÜß]/g, "").trim();
      if (!clean) return;
      trophyMapCount[clean] = (trophyMapCount[clean] || 0) + 1;
    });
  });

  document.querySelectorAll('.leaderboard-card,.leaderboard-item,.list-card,.rank-card,article').forEach(row => {
    if(row.dataset.tournamentBonusEnhanced === '1'||row.classList.contains('participant-leaderboard-card')) return;

    const text = row.innerText || '';
    if(!text.includes('Punkte')) return;

    const nameMatch = text.match(/#\d+\s+(.+?)\s+\d+\s+Punkte/);
    if(!nameMatch) return;

    const cleanName = String(nameMatch[1] || '').replace(/[^a-zA-Z0-9 äöüÄÖÜß]/g, '').trim();

    const bonus = bonusMap[cleanName] || 0;
    if(!bonus || bonus <= 0) return;

    const trophyCount = trophyMapCount[cleanName] || 0;
    if(trophyCount <= 0) return; // optional sauberer Schutz

    const pointsBadge = Array.from(row.querySelectorAll('span,div'))
      .find(el => /Punkte$/.test((el.innerText || '').trim()));
    if(!pointsBadge) return;

    const badge = document.createElement('span');
    badge.className = `tournament-bonus bonus-${tournamentBonusTier(bonus)}`;
    badge.textContent = `🏆 x${trophyCount} +${bonus}`;

    pointsBadge.insertAdjacentElement('afterend', badge);
    row.dataset.tournamentBonusEnhanced = '1';
  });
}

const _bonusEnhancerTimer = setInterval(enhanceLeaderboardTournamentBonus, 1000);
setTimeout(() => clearInterval(_bonusEnhancerTimer), 15000);




// 🔹 Dynamic C-MAP link update (minimal invasive)
(function(){
  function updateDepthLink(mapInstance){
    try{
      if(!mapInstance || !mapInstance.getCenter) return;
      const center = mapInstance.getCenter();
      const btn = document.querySelector('.map-btn-depth');
      if(btn && center){
        btn.href = `https://www.c-map.com/chartexplorer/?lat=${center.lat}&long=${center.lng}&map=Discover&defaultZoom=15`;
      }
    }catch(e){}
  }

  // Hook into existing map if available
  const tryAttach = () => {
    if(window.map && window.map.on){
      window.map.on('moveend', () => updateDepthLink(window.map));
      updateDepthLink(window.map);
      return true;
    }
    return false;
  };

  // Retry attach (for async init)
  let tries = 0;
  const interval = setInterval(()=>{
    if(tryAttach() || tries++ > 10){
      clearInterval(interval);
    }
  }, 500);
})();


// ✅ FINAL CLEAN FIX – Dynamic C-MAP button (no globals, no timing issues)
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('depthMapLink');
  if (!btn) return;

  // wait until map exists
  const waitForMap = () => {
    try {
      if (typeof map !== 'undefined' && map && map.getCenter) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const c = map.getCenter();
          const url = `https://www.c-map.com/chartexplorer/?lat=${c.lat}&long=${c.lng}&map=Discover&defaultZoom=15`;
          window.open(url, '_blank');
        });
        return true;
      }
    } catch(e){}
    return false;
  };

  let tries = 0;
  const interval = setInterval(() => {
    if (waitForMap() || tries++ > 20) {
      clearInterval(interval);
    }
  }, 300);
});

/* High-End Analytics Behaviour + Performance Layer – read-only visual upgrade */
function analyticsFixedChartOptions(extra={}){
  const axisWidth=58;
  const base={
    responsive:true,
    maintainAspectRatio:false,
    animation:false,
    normalized:true,
    layout:{padding:{top:18,right:18,bottom:8,left:8}},
    plugins:{
      legend:{display:false,labels:{color:css('--text'),font:{size:11,weight:'700'},boxWidth:9,boxHeight:9,usePointStyle:true,padding:14}},
      tooltip:{backgroundColor:'rgba(7,17,26,.94)',titleColor:css('--text'),bodyColor:css('--muted'),borderColor:'rgba(255,255,255,.12)',borderWidth:1,padding:12,displayColors:true}
    },
    scales:{
      x:{offset:false,ticks:{color:css('--muted'),font:{size:11,weight:'700'},padding:10,maxRotation:0,autoSkip:true},grid:{color:'rgba(255,255,255,.075)',drawTicks:false},border:{color:'rgba(255,255,255,.14)'}},
      y:{beginAtZero:true,afterFit(axis){axis.width=axisWidth},ticks:{color:css('--muted'),font:{size:11,weight:'700'},padding:10,precision:0},grid:{color:'rgba(255,255,255,.075)',drawTicks:false},border:{display:false}}
    }
  };
  return {...base,...extra,plugins:{...base.plugins,...(extra.plugins||{})},scales:{...base.scales,...(extra.scales||{})}};
}

function analyticsCatchHour(c){
  const d=new Date(c.timestamp||c.createdAt);
  return Number.isNaN(d.getTime())?null:d.getHours()+d.getMinutes()/60;
}

function renderCharts(){
  const daily=dailyBuckets();
  cleanup('daily');
  charts.daily=new Chart(document.getElementById('dailyChart'),{type:'bar',data:{labels:daily.map(x=>x[0].slice(5)),datasets:[{label:'Fänge',data:daily.map(x=>x[1]),backgroundColor:'#4ad7d1',borderRadius:12}]},options:dashboardChartOptions()});

  const pStats=computeParticipantStats();
  const maxCount=Math.max(1,...pStats.map(p=>p.count||0));
  const maxPoints=Math.max(10,...pStats.map(p=>p.points||0));
  const participantCanvas=document.getElementById('participantChart');
  if(participantCanvas){
  cleanup('participants');
  charts.participants=new Chart(participantCanvas,{
    type:'bubble',
    data:{datasets:[{
      label:'Performance-Profil',
      data:pStats.map((p,i)=>({x:p.count||0,y:p.points||0,r:Math.max(8,Math.min(24,8+Number(p.totalWeight||0)*1.8)),name:p.name,avg:p.count?((p.points||0)/p.count).toFixed(1):'0.0',rank:i+1})),
      backgroundColor:pStats.map(p=>(p.color||'#4ad7d1')+'cc'),
      borderColor:pStats.map(p=>p.color||'#4ad7d1'),
      borderWidth:2,
      hoverBorderWidth:3
    }]},
    options:analyticsFixedChartOptions({
      scales:{
        x:{min:0,suggestedMax:maxCount+1,title:{display:true,text:'Fangvolumen',color:css('--muted'),font:{size:11,weight:'800'}},ticks:{color:css('--muted'),font:{size:11,weight:'700'},padding:10,precision:0},grid:{color:'rgba(255,255,255,.075)',drawTicks:false},border:{color:'rgba(255,255,255,.14)'}},
        y:{min:0,suggestedMax:maxPoints+10,afterFit(axis){axis.width=58},title:{display:true,text:'Punkte',color:css('--muted'),font:{size:11,weight:'800'}},ticks:{color:css('--muted'),font:{size:11,weight:'700'},padding:10,precision:0},grid:{color:'rgba(255,255,255,.075)',drawTicks:false},border:{display:false}}
      },
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label(ctx){const r=ctx.raw;return `${r.name}: ${r.y} Punkte · ${r.x} Fänge · ${r.avg} P/Fang`;}}}
      }
    })
  });
  }
}

function renderTimeHeatmap(){
  const grid=document.getElementById('timeHeatmap');
  if(!grid)return;
  const catches=[...state.catches];
  const hours=Array.from({length:24},(_,hour)=>({hour,count:0,weight:0}));
  catches.forEach(c=>{const h=analyticsCatchHour(c);if(h===null)return;const hour=Math.floor(h);hours[hour].count+=1;hours[hour].weight+=Number(c.weightKg||0);});
  const max=Math.max(1,...hours.map(h=>h.count));
  const best=hours.reduce((m,h)=>h.count>m.count?h:m,hours[0]);
  grid.className='time-grid analytics-time-rhythm';
  grid.innerHTML=hours.map(h=>{
    const intensity=h.count/max;
    const opacity=.10+intensity*.86;
    const avg=h.count?h.weight/h.count:0;
    return `<div class="time-cell analytics-rhythm-cell ${h.hour===best.hour&&h.count?'is-peak':''}" style="--intensity:${intensity};background:linear-gradient(180deg,rgba(74,215,209,${opacity}),rgba(143,240,167,${Math.max(.05,opacity*.55)}))"><strong>${String(h.hour).padStart(2,'0')}</strong><span>${h.count} Fang${h.count===1?'':'e'}</span><em>${avg?fmtKg(avg):'–'}</em></div>`;
  }).join('');
}

function renderSpotBaitMatrix(){
  const container=document.getElementById('spotBaitMatrix');
  if(!container)return;
  const catches=[...state.catches];
  const spots=analyticsCountBy(catches,c=>c.spotLabel||c.location?.label||'Unbekannter Spot').slice(0,6).map(x=>x[0]);
  const baits=analyticsCountBy(catches,c=>c.bait||'Unbekannter Köder').slice(0,6).map(x=>x[0]);
  if(!spots.length||!baits.length){
    container.style.removeProperty('--matrix-cols');
    container.style.removeProperty('--matrix-rows');
    container.innerHTML='<div class="meta">Noch zu wenig Daten für die Matrix.</div>';
    return;
  }
  const total=Math.max(1,catches.length);
  const spotTotals=Object.fromEntries(spots.map(s=>[s,catches.filter(c=>(c.spotLabel||c.location?.label||'Unbekannter Spot')===s).length]));
  const baitTotals=Object.fromEntries(baits.map(b=>[b,catches.filter(c=>(c.bait||'Unbekannter Köder')===b).length]));
  const values=spots.flatMap(spot=>baits.map(bait=>{
    const count=catches.filter(c=>(c.spotLabel||c.location?.label||'Unbekannter Spot')===spot&&(c.bait||'Unbekannter Köder')===bait).length;
    const expected=(spotTotals[spot]*baitTotals[bait])/total;
    const lift=expected?count/expected:0;
    return {spot,bait,count,lift};
  }));
  const maxLift=Math.max(1,...values.map(v=>v.lift));
  const baitIcon=(bait)=>{
    const key=String(bait||'').toLowerCase();
    if(key.includes('wobbler'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 38C21 22 39 17 55 15c-2 15-12 30-28 37-7 3-15 0-17-7-1-2-1-5 0-7Z"/><path d="M19 38c8-3 18-8 27-17"/><circle cx="42" cy="24" r="2.6"/></svg>';
    if(key.includes('spinner'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M23 39c-6-10-2-24 10-31 7 11 4 24-6 31"/><path d="M30 37l16 16"/><circle cx="48" cy="55" r="4"/><path d="M17 45l10-8"/></svg>';
    if(key.includes('gummi')||key.includes('fisch'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 35c13-16 28-21 40-14 5 3 7 7 8 10-5 1-10 4-14 8-10 10-24 8-34-4Z"/><path d="M45 29l12-10 1 20-13-10Z"/><circle cx="25" cy="29" r="2.3"/></svg>';
    if(key.includes('jig'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M35 13c5 4 7 10 4 15-3 6-11 8-17 5-5-3-7-9-4-14 3-7 11-10 17-6Z"/><path d="M37 26c9 5 14 13 15 25"/><path d="M22 34c-7 6-10 12-11 18"/><path d="M26 36c-2 8-1 14 4 19"/></svg>';
    if(key.includes('blink'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M19 55C30 51 48 30 51 9 37 14 18 35 13 50c-1 4 2 7 6 5Z"/><path d="M22 48c8-8 16-19 22-31"/><circle cx="44" cy="16" r="2.5"/></svg>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 36c11-13 28-18 42-11-6 14-22 22-36 18-3-1-5-3-6-7Z"/><circle cx="40" cy="28" r="2.3"/></svg>';
  };
  container.className='matrix-grid spot-bait-fit-grid';
  container.style.setProperty('--matrix-cols',baits.length);
  container.style.setProperty('--matrix-rows',spots.length+1);
  const header='<div class="matrix-label matrix-corner"><span>Spot / Köder</span></div>'+baits.map(b=>`<div class="matrix-label matrix-bait-label"><span class="matrix-icon">${baitIcon(b)}</span><span>${escapeHtml(b)}</span></div>`).join('');
  const spotIcon=(spot)=>{
    const key=String(spot||'').toLowerCase();
    if(key.includes('schilf'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 54C18 38 19 24 15 10"/><path d="M30 54C30 34 31 20 28 7"/><path d="M43 54C42 38 43 26 48 13"/><path d="M13 29c8-4 13-3 18 2"/><path d="M29 22c9-5 15-4 21 2"/></svg>';
    if(key.includes('kraut'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 52c8-16 8-29 1-40"/><path d="M32 54c-2-18 2-32 12-42"/><path d="M50 52c-9-13-8-27 0-39"/><path d="M18 34c6-5 12-6 18-1"/><path d="M31 43c7-4 13-4 19 1"/></svg>';
    if(key.includes('totholz')||key.includes('holz'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M10 45c15-8 29-17 44-28"/><path d="M18 40l-5-12"/><path d="M34 31l-2-15"/><path d="M43 25l12 4"/><circle cx="20" cy="39" r="3"/></svg>';
    if(key.includes('steil'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M13 51h36"/><path d="M16 49l10-10 5-12 9-7 10-9"/><path d="M12 29c6 3 11 3 17 0s11-3 17 0"/></svg>';
    if(key.includes('flach'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M9 35c7-3 13-3 20 0s13 3 20 0"/><path d="M12 45c8-3 15-3 23 0s12 3 17 0"/><path d="M15 26h34"/><path d="M22 19h20"/></svg>';
    if(key.includes('einlauf')||key.includes('zulauf'))return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 23c9-5 18-5 27 0s14 5 19 0"/><path d="M11 38c9-5 18-5 27 0s14 5 19 0"/><path d="M32 8v38"/><path d="M22 36l10 10 10-10"/></svg>';
    return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 42c9-7 18-9 30-5"/><path d="M17 51h31"/><path d="M25 32c1-9 6-16 15-21"/></svg>';
  };
  const rows=spots.map(spot=>`<div class="matrix-label matrix-spot-label"><span class="matrix-icon matrix-spot-icon">${spotIcon(spot)}</span><span>${escapeHtml(spot)}</span></div>`+baits.map(bait=>{
    const v=values.find(x=>x.spot===spot&&x.bait===bait)||{count:0,lift:0};
    const strength=Math.min(1,v.lift/maxLift);
    const opacity=.10+strength*.86;
    return `<div class="matrix-cell analytics-affinity-cell" style="--affinity:${strength};background:radial-gradient(circle at 50% 30%,rgba(143,240,167,${opacity}),rgba(74,215,209,${Math.max(.06,opacity*.46)}))"><strong>${v.count}</strong><span>${v.lift?`${v.lift.toFixed(1)}× Lift`:'–'}</span></div>`;
  }).join('')).join('');
  container.innerHTML=header+rows;
}
function renderParticipantTimeline(){
  const canvas=document.getElementById('timelineBubbleChart');
  if(!canvas||typeof Chart==='undefined')return;
  canvas.height=280;
  if(window.timelineBubbleChartInstance)window.timelineBubbleChartInstance.destroy();
  const catches=[...state.catches].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));
  const participants=[...new Set(catches.map(c=>participantById(c.participantId)?.name).filter(Boolean))];
  const datasets=participants.map((name,index)=>({
    label:name,
    data:catches.filter(c=>participantById(c.participantId)?.name===name).map(c=>({x:analyticsCatchHour(c)??0,y:index+1,r:Math.max(7,Math.min(22,7+Number(c.weightKg||0)*1.8)),species:speciesName(c),weight:Number(c.weightKg||0)})),
    backgroundColor:(state.participants.find(p=>p.name===name)?.color||'#4ad7d1')+'bb',
    borderColor:state.participants.find(p=>p.name===name)?.color||'#4ad7d1',
    borderWidth:2
  }));
  window.timelineBubbleChartInstance=new Chart(canvas,{type:'bubble',data:{datasets},options:analyticsFixedChartOptions({
    plugins:{legend:{display:true,position:'bottom',labels:{color:css('--text'),usePointStyle:true,pointStyle:'circle',boxWidth:8,boxHeight:8,padding:14,font:{size:11,weight:'700'}}},tooltip:{callbacks:{label(ctx){const r=ctx.raw;return `${ctx.dataset.label}: ${r.species} · ${fmtKg(r.weight)} · ${String(Math.floor(r.x)).padStart(2,'0')}:00`;}}}},
    scales:{
      x:{min:0,max:24,title:{display:true,text:'Tageszeit',color:css('--muted'),font:{size:11,weight:'800'}},ticks:{stepSize:4,color:css('--muted'),font:{size:11,weight:'700'},padding:10,callback:v=>String(v).padStart(2,'0')+':00'},grid:{color:'rgba(255,255,255,.075)',drawTicks:false},border:{color:'rgba(255,255,255,.14)'}},
      y:{min:.5,max:Math.max(1.5,participants.length+.5),afterFit(axis){axis.width=58},ticks:{stepSize:1,color:css('--muted'),font:{size:11,weight:'700'},padding:10,callback:v=>participants[v-1]||''},grid:{color:'rgba(255,255,255,.055)',drawTicks:false},border:{display:false}}
    }
  })});
}

/* Analytics anti-clipping premium visual layer – read-only, additive override */
function analyticsPremiumPalette(index){
  const palette=['#4ad7d1','#8ff0a7','#ffb84d','#66e7ff','#b7a0ff','#ff8ab4'];
  return palette[index % palette.length];
}
function analyticsGetCanvas(id){
  const el=document.getElementById(id);
  return el && el.getContext ? el : null;
}
function analyticsDestroy(key){
  if(charts && charts[key]){charts[key].destroy();delete charts[key];}
}
function analyticsPremiumOptions(extra={}){
  const base=analyticsFixedChartOptions ? analyticsFixedChartOptions() : dashboardChartOptions();
  base.maintainAspectRatio=false;
  base.layout={padding:{top:16,right:18,bottom:8,left:8}};
  base.plugins={...(base.plugins||{}),legend:{display:false},tooltip:{backgroundColor:'rgba(7,17,26,.95)',titleColor:css('--text'),bodyColor:css('--muted'),borderColor:'rgba(255,255,255,.12)',borderWidth:1,padding:12,displayColors:true}};
  return {...base,...extra,plugins:{...base.plugins,...(extra.plugins||{})},scales:{...(base.scales||{}),...(extra.scales||{})}};
}
function analyticsHourModel(){
  const hours=Array.from({length:24},(_,hour)=>({hour,count:0,weight:0,length:0}));
  (state.catches||[]).forEach(c=>{const d=new Date(c.timestamp||c.createdAt);if(Number.isNaN(d.getTime()))return;const h=d.getHours();hours[h].count+=1;hours[h].weight+=Number(c.weightKg||0);hours[h].length+=Number(c.lengthCm||0);});
  return hours.map(h=>({...h,avgWeight:h.count?h.weight/h.count:0,avgLength:h.count?h.length/h.count:0}));
}
function analyticsCombinationModel(){
  const combos=new Map();
  (state.catches||[]).forEach(c=>{
    const spot=c.spotLabel||c.location?.label||'Unbekannter Spot';
    const bait=c.bait||'Unbekannter Köder';
    const key=spot+' × '+bait;
    const item=combos.get(key)||{key,spot,bait,count:0,weight:0,length:0};
    item.count+=1;item.weight+=Number(c.weightKg||0);item.length+=Number(c.lengthCm||0);combos.set(key,item);
  });
  return [...combos.values()].sort((a,b)=>b.count-a.count||b.weight-a.weight).slice(0,12).map((x,i)=>({...x,index:i+1,avgWeight:x.count?x.weight/x.count:0,avgLength:x.count?x.length/x.count:0}));
}
function renderAnalyticsBehaviourCharts(){
  const rhythm=analyticsGetCanvas('behaviourRhythmChart');
  if(rhythm){
    const h=analyticsHourModel();
    analyticsDestroy('behaviourRhythm');
    charts.behaviourRhythm=new Chart(rhythm,{type:'line',data:{labels:h.map(x=>String(x.hour).padStart(2,'0')+':00'),datasets:[{label:'Fänge',data:h.map(x=>x.count),borderColor:'#4ad7d1',backgroundColor:'rgba(74,215,209,.18)',fill:true,tension:.42,pointRadius:h.map(x=>x.count?4:2),pointHoverRadius:6,borderWidth:2.5},{label:'Ø Gewicht',data:h.map(x=>Number(x.avgWeight.toFixed(2))),borderColor:'#8ff0a7',backgroundColor:'rgba(143,240,167,.12)',fill:false,tension:.42,pointRadius:3,borderWidth:2,yAxisID:'y1'}]},options:analyticsPremiumOptions({plugins:{legend:{display:true,labels:{color:css('--muted'),usePointStyle:true,boxWidth:8,boxHeight:8,font:{size:11,weight:'800'}}}},scales:{x:{ticks:{color:css('--muted'),maxRotation:0,autoSkip:true},grid:{display:false}},y:{beginAtZero:true,afterFit(axis){axis.width=54},title:{display:true,text:'Fänge',color:css('--muted')},ticks:{precision:0,color:css('--muted')},grid:{color:'rgba(255,255,255,.075)'}},y1:{beginAtZero:true,position:'right',title:{display:true,text:'Ø kg',color:css('--muted')},ticks:{color:css('--muted')},grid:{display:false}}}})});
  }
  const density=analyticsGetCanvas('behaviourDensityChart');
  if(density){
    const combos=analyticsCombinationModel();
    analyticsDestroy('behaviourDensity');
    charts.behaviourDensity=new Chart(density,{type:'bubble',data:{datasets:[{label:'Spot-Köder-Dichte',data:combos.map((c,i)=>({x:c.count,y:Number(c.avgWeight.toFixed(2)),r:Math.max(8,Math.min(28,8+c.count*4)),label:c.key,avgLength:c.avgLength})),backgroundColor:combos.map((_,i)=>analyticsPremiumPalette(i)+'cc'),borderColor:combos.map((_,i)=>analyticsPremiumPalette(i)),borderWidth:2}]},options:analyticsPremiumOptions({scales:{x:{beginAtZero:true,title:{display:true,text:'Treffer je Kombination',color:css('--muted')},ticks:{precision:0,color:css('--muted')},grid:{color:'rgba(255,255,255,.075)'}},y:{beginAtZero:true,afterFit(axis){axis.width=58},title:{display:true,text:'Ø Gewicht',color:css('--muted')},ticks:{color:css('--muted')},grid:{color:'rgba(255,255,255,.075)'}}},plugins:{tooltip:{callbacks:{label(ctx){const r=ctx.raw;return `${r.label}: ${r.x} Fänge · ${r.y} kg Ø · ${Math.round(r.avgLength||0)} cm Ø`;}}}}})});
  }
}
function renderAnalyticsPerformanceCharts(){
  const pStats=computeParticipantStats();
  const efficiency=analyticsGetCanvas('performanceEfficiencyChart');
  if(efficiency){
    const data=[...pStats].filter(p=>p.count>0).sort((a,b)=>(b.points/b.count)-(a.points/a.count));
    analyticsDestroy('performanceEfficiency');
    charts.performanceEfficiency=new Chart(efficiency,{type:'line',data:{labels:data.map(p=>p.name),datasets:[{label:'Punkte pro Fang',data:data.map(p=>Number((p.points/p.count).toFixed(2))),borderColor:'#4ad7d1',backgroundColor:'rgba(74,215,209,.18)',fill:true,tension:.35,pointRadius:data.map(p=>Math.max(5,Math.min(13,4+p.count*1.4))),pointHoverRadius:15,borderWidth:2.5}]},options:analyticsPremiumOptions({plugins:{tooltip:{callbacks:{label(ctx){const p=data[ctx.dataIndex];return `${p.name}: ${(p.points/p.count).toFixed(1)} P/Fang · ${p.count} Fänge · ${p.points} Punkte`;}}}},scales:{x:{ticks:{color:css('--muted'),maxRotation:0},grid:{display:false}},y:{beginAtZero:true,afterFit(axis){axis.width=58},title:{display:true,text:'Punkte/Fang',color:css('--muted')},ticks:{color:css('--muted')},grid:{color:'rgba(255,255,255,.075)'}}}})});
  }
  const distribution=analyticsGetCanvas('performanceDistributionChart');
  if(distribution){
    const labels=pStats.map(p=>p.name);
    analyticsDestroy('performanceDistribution');
    charts.performanceDistribution=new Chart(distribution,{type:'radar',data:{labels,datasets:[{label:'Punkte',data:pStats.map(p=>p.points||0),borderColor:'#4ad7d1',backgroundColor:'rgba(74,215,209,.16)',pointBackgroundColor:'#4ad7d1',borderWidth:2},{label:'Fänge',data:pStats.map(p=>p.count||0),borderColor:'#8ff0a7',backgroundColor:'rgba(143,240,167,.10)',pointBackgroundColor:'#8ff0a7',borderWidth:2},{label:'Ø Länge',data:pStats.map(p=>Math.round(p.avgLength||0)),borderColor:'#ffb84d',backgroundColor:'rgba(255,184,77,.08)',pointBackgroundColor:'#ffb84d',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:true,labels:{color:css('--muted'),usePointStyle:true,boxWidth:8,boxHeight:8,font:{size:11,weight:'800'}}},tooltip:{backgroundColor:'rgba(7,17,26,.95)',titleColor:css('--text'),bodyColor:css('--muted'),borderColor:'rgba(255,255,255,.12)',borderWidth:1,padding:12}},scales:{r:{beginAtZero:true,angleLines:{color:'rgba(255,255,255,.08)'},grid:{color:'rgba(255,255,255,.08)'},pointLabels:{color:css('--muted'),font:{size:11,weight:'800'}},ticks:{display:false}}}}});
  }
}
const analyticsPreviousRenderCharts=renderCharts;
renderCharts=function(){
  analyticsPreviousRenderCharts.apply(this,arguments);
  renderAnalyticsBehaviourCharts();
  renderAnalyticsPerformanceCharts();
};
const analyticsPreviousRenderTimeHeatmap=renderTimeHeatmap;
renderTimeHeatmap=function(){
  analyticsPreviousRenderTimeHeatmap.apply(this,arguments);
  const grid=document.getElementById('timeHeatmap');
  if(grid) grid.setAttribute('aria-label','Uhrzeit-Heatmap mit 24 vollständig sichtbaren Stundenkacheln');
};
const analyticsPreviousRenderSpotBaitMatrix=renderSpotBaitMatrix;
renderSpotBaitMatrix=function(){
  analyticsPreviousRenderSpotBaitMatrix.apply(this,arguments);
  const container=document.getElementById('spotBaitMatrix');
  if(!container)return;
  container.setAttribute('role','region');
  container.setAttribute('aria-label','Vollständig horizontal scrollbar Spot Köder Matrix');
  container.querySelectorAll('.matrix-cell').forEach(cell=>cell.classList.add('analytics-affinity-cell'));
};

// MATRIX SCALING PATCH
function scaleWholeMatrix(){const w=document.querySelector('.matrix-wrapper');const c=document.querySelector('.matrix-content');if(!w||!c)return;c.style.transform='translate(-50%,-50%) scale(1)';const s=Math.min(w.clientWidth/c.scrollWidth,w.clientHeight/c.scrollHeight,1);c.style.transform=`translate(-50%,-50%) scale(${s})`;}window.addEventListener('resize',scaleWholeMatrix);requestAnimationFrame(scaleWholeMatrix);

/* Isolated Analytics catch-density map heatmap
 * Additive only: creates a separate Leaflet map inside the Analytics Behaviour Layer.
 * It reads the current state.catches collection and never touches the original catch map,
 * marker layer, filters, or map controls.
 */
(function(){
  let analyticsHeatmapMap=null;
  let analyticsHeatmapLayer=null;
  let analyticsHeatmapTileLayer=null;

  function validHeatmapPoints(){
    return (state?.catches || [])
      .map(c => {
        const latRaw = c.latitude ?? c.location?.lat;
        const lngRaw = c.longitude ?? c.location?.lng;
  
        if (latRaw == null || lngRaw == null) return null;
  
        const lat = Number(latRaw);
        const lng = Number(lngRaw);
  
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  
        // 🚨 GLOBAL FILTER
        // Nur Europa / deine Zielregion zulassen
        if (lat < 40 || lat > 70) return null;
        if (lng < 0 || lng > 20) return null;
  
        return {
          lat,
          lng,
          weight: 1
        };
      })
      .filter(Boolean);
  }

  function setHeatmapEmpty(container,visible){
    if(!container)return;
    let empty=container.querySelector('.analytics-heatmap-empty');
    if(visible&&!empty){
      empty=document.createElement('div');
      empty.className='analytics-heatmap-empty';
      empty.textContent='Noch keine Fangorte für die Heatmap vorhanden.';
      container.appendChild(empty);
    }else if(!visible&&empty){
      empty.remove();
    }
  }

  function createCanvasHeatLayer(points){
    return L.Layer.extend({
      initialize(data){this._data=data||[];this._frame=null;},
      setData(data){this._data=data||[];this._scheduleDraw();return this;},
      onAdd(mapInstance){
        this._map=mapInstance;
        this._canvas=L.DomUtil.create('canvas','analytics-catch-heatmap-canvas leaflet-zoom-animated');
        this._canvas.style.position='absolute';
        this._canvas.style.pointerEvents='none';
        this._canvas.style.mixBlendMode='normal';
        this._canvas.style.zIndex='420';
        mapInstance.getPanes().overlayPane.appendChild(this._canvas);
        mapInstance.on('moveend zoomend resize viewreset',this._scheduleDraw,this);
        this._scheduleDraw();
      },
      onRemove(mapInstance){
        mapInstance.off('moveend zoomend resize viewreset',this._scheduleDraw,this);
        if(this._frame)cancelAnimationFrame(this._frame);
        if(this._canvas&&this._canvas.parentNode)this._canvas.parentNode.removeChild(this._canvas);
        this._canvas=null;
      },
      _scheduleDraw(){
        if(this._frame)cancelAnimationFrame(this._frame);
        this._frame=requestAnimationFrame(()=>this._draw());
      },
      _draw(){
        if(!this._map||!this._canvas)return;
        const size=this._map.getSize();
        const topLeft=this._map.containerPointToLayerPoint([0,0]);
        L.DomUtil.setPosition(this._canvas,topLeft);
        const ratio=window.devicePixelRatio||1;
        this._canvas.width=Math.max(1,Math.round(size.x*ratio));
        this._canvas.height=Math.max(1,Math.round(size.y*ratio));
        this._canvas.style.width=size.x+'px';
        this._canvas.style.height=size.y+'px';
        const ctx=this._canvas.getContext('2d');
        ctx.setTransform(ratio,0,0,ratio,0,0);
        ctx.clearRect(0,0,size.x,size.y);
        ctx.globalCompositeOperation='source-over';
        const zoom=this._map.getZoom();
        const radius = 120;
        const maxWeight=Math.max(1,...this._data.map(p=>p.weight||1));
        this._data.forEach(p=>{
          const pt=this._map.latLngToContainerPoint([p.lat,p.lng]);
          if(pt.x<-radius||pt.y<-radius||pt.x>size.x+radius||pt.y>size.y+radius)return;
          const power = 1;
          const gradient=ctx.createRadialGradient(pt.x,pt.y,0,pt.x,pt.y,radius);
          gradient.addColorStop(0,`rgba(174,255,230,${power})`);
          gradient.addColorStop(.26,`rgba(87,236,220,${power*.72})`);
          gradient.addColorStop(.58,`rgba(39,177,170,${power*.34})`);
          gradient.addColorStop(1,'rgba(5,34,42,0)');
          ctx.fillStyle=gradient;
          ctx.beginPath();
          ctx.arc(pt.x,pt.y,radius,0,Math.PI*2);
          ctx.fill();
        });
        ctx.globalCompositeOperation='source-over';
      }
    });
  }

  function renderAnalyticsCatchHeatmap(){
    const container=document.getElementById('analyticsCatchHeatmap');
    if(!container||typeof L==='undefined')return;
    const points=validHeatmapPoints();
    setHeatmapEmpty(container,!points.length);
    if(!analyticsHeatmapMap){
      analyticsHeatmapMap = L.map(container,{
        zoomControl:false,
        attributionControl:false,
        scrollWheelZoom:false,
        preferCanvas:true
      });
      analyticsHeatmapTileLayer=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,crossOrigin:true});
      analyticsHeatmapTileLayer.addTo(analyticsHeatmapMap);
      const HeatLayer=createCanvasHeatLayer(points);
      analyticsHeatmapLayer=new HeatLayer(points);
      analyticsHeatmapLayer.addTo(analyticsHeatmapMap);
    }else if(analyticsHeatmapLayer){
      analyticsHeatmapLayer.setData(points);
    }
    requestAnimationFrame(() => {
      if(!analyticsHeatmapMap) return;
    
      analyticsHeatmapMap.invalidateSize(true);
    
      if(points.length){
        const bounds = L.latLngBounds(points.map(p => [p.lat, p.lng]));
        console.log('HEATMAP BOUNDS:', bounds.toBBoxString(), points.length);
    
        analyticsHeatmapMap.fitBounds(bounds, {
          padding: [80, 80],
          maxZoom: 12,
          animate: false
        });
    
        analyticsHeatmapLayer?.setData(points);
      }
    });
  }

  window.renderAnalyticsCatchHeatmap=renderAnalyticsCatchHeatmap;

  if(typeof renderCharts==='function'){
    const previousRenderChartsForCatchHeatmap=renderCharts;
    renderCharts=function(){
      const result=previousRenderChartsForCatchHeatmap.apply(this,arguments);
      try{renderAnalyticsCatchHeatmap();}catch(e){console.warn('Analytics catch heatmap render failed',e);}
      return result;
    };
  }

  if(typeof rerenderAnalyticsView==='function'){
    const previousRerenderAnalyticsViewForCatchHeatmap=rerenderAnalyticsView;
    rerenderAnalyticsView=function(){
      const result=previousRerenderAnalyticsViewForCatchHeatmap.apply(this,arguments);
      try{renderAnalyticsCatchHeatmap();}catch(e){console.warn('Analytics catch heatmap refresh failed',e);}
      return result;
    };
  }

  document.addEventListener('click',e=>{
    if(e.target.closest('[data-screen="analytics"]')){
      setTimeout(()=>{try{renderAnalyticsCatchHeatmap();}catch(err){}},120);
    }
  });
  window.addEventListener('resize',()=>{try{renderAnalyticsCatchHeatmap();}catch(e){}});
})();
