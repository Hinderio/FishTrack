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
  },

  // 🔥 NEU – Weather Fields (wichtig für dein Fix)
  weather_fetched_at: c.weather_fetched_at ?? null,
  weather_temp_c: c.weather_temp_c ?? null,
  weather_feels_like_c: c.weather_feels_like_c ?? null,
  weather_wind_ms: c.weather_wind_ms ?? null,
  weather_humidity: c.weather_humidity ?? null,
  weather_clouds: c.weather_clouds ?? null,
  weather_precip_mm: c.weather_precip_mm ?? null,
  weather_condition: c.weather_condition ?? null,
  weather_icon: c.weather_icon ?? null,
  weather_pressure_hpa: c.weather_pressure_hpa ?? null,
  weather_pressure_delta_1h: c.weather_pressure_delta_1h ?? null,
  weather_pressure_delta_3h: c.weather_pressure_delta_3h ?? null,
  weather_pressure_delta_6h: c.weather_pressure_delta_6h ?? null,
  weather_pressure_trend: c.weather_pressure_trend ?? null,
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

  // ✅ Wetter optional holen
  if (
    entry.location?.lat != null &&
    entry.location?.lng != null &&
    (!entry.weather_fetched_at || entry.weather_pressure_hpa == null)
  ) {
    try {
      const data = await getWeather(entry.location.lat, entry.location.lng, entry.timestamp);

      if (data?.current) {
        const w = data.current;

        // 🆕 PRESSURE CALCULATION (minimal-invasiv)
        const pressureCurrent = w.pressure_msl ?? null;
        
        let delta1h = null;
        let delta3h = null;
        let delta6h = null;
        
        if (data.hourly?.time && data.hourly?.pressure_msl && w.time) {
          const times = data.hourly.time;
          const values = data.hourly.pressure_msl;
        
          const nowTs = new Date(w.time).getTime();
        
          function findClosestOffset(hoursBack) {
            const target = nowTs - (hoursBack * 3600 * 1000);
        
            let closestIndex = -1;
            let smallestDiff = Infinity;
        
            for (let i = 0; i < times.length; i++) {
              const t = new Date(times[i]).getTime();
              const diff = Math.abs(t - target);
        
              if (diff < smallestDiff) {
                smallestDiff = diff;
                closestIndex = i;
              }
            }
        
            return closestIndex >= 0 ? values[closestIndex] : null;
          }
        
          const p1h = findClosestOffset(1);
          const p3h = findClosestOffset(3);
          const p6h = findClosestOffset(6);
        
          if (pressureCurrent != null && p1h != null) {
            delta1h = pressureCurrent - p1h;
          }
        
          if (pressureCurrent != null && p3h != null) {
            delta3h = pressureCurrent - p3h;
          }
        
          if (pressureCurrent != null && p6h != null) {
            delta6h = pressureCurrent - p6h;
          }
        }
        
        // 🆕 Trend Klassifikation
        function classifyPressure(delta3h) {
          if (delta3h == null) return null;
        
          if (delta3h <= -2) return 'strong_falling';
          if (delta3h <= -0.5) return 'falling';
          if (delta3h >= 1) return 'rising';
          if (delta3h >= 0.5) return 'slightly_rising';
          return 'stable';
        }
        
        const pressureTrend = classifyPressure(delta3h);

        payload.weather_temp_c = w.temperature_2m ?? null;
        payload.weather_pressure_hpa = pressureCurrent;
        payload.weather_pressure_delta_1h = delta1h;
        payload.weather_pressure_delta_3h = delta3h;
        payload.weather_pressure_delta_6h = delta6h;
        payload.weather_pressure_trend = pressureTrend;
        payload.weather_feels_like_c = w.apparent_temperature ?? null;
        payload.weather_wind_ms = w.wind_speed_10m ?? null;
        payload.weather_humidity = w.relative_humidity_2m ?? null;
        payload.weather_clouds = w.cloud_cover ?? null;
        payload.weather_precip_mm = w.precipitation ?? null;
        payload.weather_condition = weatherDescription(w.weather_code);
        payload.weather_icon = w.weather_code ?? null;
        payload.weather_fetched_at = w.time ?? null;
      }

    } catch (e) {
      console.warn('Weather fetch fehlgeschlagen', e);
    }
  }

  // 🔥 IMMER speichern – egal ob Weather da ist oder nicht
  const { error } = await db
    .from('catches')
    .upsert(payload, { onConflict: 'id' });

  if (error) {
    console.error('Catch speichern fehlgeschlagen:', error);
  } else {
    Object.assign(entry, payload);
  
    const localIndex = state.catches.findIndex(c => c.id === entry.id);
    if (localIndex >= 0) {
      state.catches[localIndex] = {
        ...state.catches[localIndex],
        ...payload,
        tournamentId: payload.tournament_id || '',
        participantId: payload.angler || '',
        lengthCm: payload.length_cm ?? state.catches[localIndex].lengthCm,
        weightKg: payload.weight_kg ?? state.catches[localIndex].weightKg,
        timestamp: payload.caught_at || state.catches[localIndex].timestamp,
        spotLabel: payload.spot_label || state.catches[localIndex].spotLabel,
        location: {
          ...(state.catches[localIndex].location || {}),
          lat: payload.latitude,
          lng: payload.longitude,
          label: payload.spot_label || state.catches[localIndex].location?.label || ''
        }
      };
    }
  
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  
    if (typeof renderHistory === 'function') renderHistory();
  
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
let map;let markersLayer;let selectedDashboardCatchId=null;let pendingCatchFocusId=null;let beforeInstallPromptEvent=null;let activeTournamentId=null;let weatherEnabled=false;let weatherControlAdded=false;let weatherControlEl=null;let weatherPopupRequestId=0;const WEATHER_CACHE_TTL=10*60*1000;const weatherCache=new Map();function formatWeatherValue(value,suffix=''){const n=Number(value);return Number.isFinite(n)?`${Math.round(n)}${suffix}`:'–'}function getWeatherCacheKey(lat,lon){return `${Number(lat).toFixed(3)},${Number(lon).toFixed(3)}`}async function getWeather(lat,lon){const key=getWeatherCacheKey(lat,lon),cached=weatherCache.get(key),now=Date.now();if(cached&&now-cached.timestamp<WEATHER_CACHE_TTL)return cached.data;const params = new URLSearchParams({ latitude: lat, longitude: lon, current: 'temperature_2m,wind_speed_10m,wind_gusts_10m,relative_humidity_2m,precipitation,weather_code,pressure_msl', hourly: 'pressure_msl', past_days: '1', timezone: 'auto' });try{const res=await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);if(!res.ok) throw new Error(`Weather ${res.status}`);const data=await res.json();if(data?.current)weatherCache.set(key,{timestamp:now,data});return data}catch(err){console.error('Weather fetch failed',err);return null}}function weatherDescription(code){const map={0:'Klar',1:'Meist klar',2:'Teilweise bewölkt',3:'Bedeckt',45:'Neblig',48:'Raureifnebel',51:'Leichter Niesel',53:'Niesel',55:'Starker Niesel',56:'Leichter gefrierender Niesel',57:'Gefrierender Niesel',61:'Leichter Regen',63:'Regen',65:'Starker Regen',66:'Leichter gefrierender Regen',67:'Gefrierender Regen',71:'Leichter Schnee',73:'Schnee',75:'Starker Schneefall',77:'Schneekörner',80:'Leichte Regenschauer',81:'Regenschauer',82:'Starke Regenschauer',85:'Leichte Schneeschauer',86:'Schneeschauer',95:'Gewitter',96:'Gewitter mit Hagel',99:'Starkes Gewitter mit Hagel'};return map[code]||'Wetterdaten'}function buildWeatherPopupHtml(data){const current=data?.current;if(!current)return '<div class="weather-popup weather-popup--error">Keine Wetterdaten verfügbar.</div>';const updated=current.time?new Date(current.time).toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit'}):'–';return `<div class="weather-popup"><div class="weather-popup__header">🌤️ <strong>${formatWeatherValue(current.temperature_2m,'°C')}</strong><span>${weatherDescription(current.weather_code)}</span></div><div class="weather-popup__grid"><div><span>Gefühlt</span><strong>${formatWeatherValue(current.apparent_temperature,'°C')}</strong></div><div><span>Wind</span><strong>${formatWeatherValue(current.wind_speed_10m,' m/s')}</strong></div><div><span>Wolken</span><strong>${formatWeatherValue(current.cloud_cover,'%')}</strong></div><div><span>Feuchte</span><strong>${formatWeatherValue(current.relative_humidity_2m,'%')}</strong></div><div><span>Niederschlag</span><strong>${Number.isFinite(Number(current.precipitation))?`${Number(current.precipitation).toFixed(1)} mm`:'–'}</strong></div><div><span>Aktualisiert</span><strong>${updated}</strong></div></div></div>`}function setWeatherControlState({loading=false}={}){if(!weatherControlEl)return;weatherControlEl.classList.toggle('active',weatherEnabled);weatherControlEl.classList.toggle('loading',loading);weatherControlEl.setAttribute('aria-pressed',weatherEnabled?'true':'false');weatherControlEl.setAttribute('title',weatherEnabled?'Wettermodus aktiv – Klick auf Karte für Wetterdaten':'Wettermodus aktivieren');weatherControlEl.innerHTML=loading?'<span class="weather-spinner" aria-hidden="true"></span>':'🌡️'}function initWeatherControl(){if(!map||weatherControlAdded||typeof L==="undefined")return;const control=L.control({position:"topright"});control.onAdd=function(){const div=L.DomUtil.create("button","leaflet-bar weather-control");div.type='button';div.setAttribute('aria-label','Wettermodus auf der Karte umschalten');div.innerHTML='🌡️';weatherControlEl=div;setWeatherControlState();L.DomEvent.disableClickPropagation(div);L.DomEvent.on(div,"click",(e)=>{L.DomEvent.stop(e);weatherEnabled=!weatherEnabled;setWeatherControlState();if(!weatherEnabled&&map)map.closePopup()});return div};control.addTo(map);weatherControlAdded=true;if(!map._weatherClickBound){map.on("click",async function(e){if(!weatherEnabled)return;const requestId=++weatherPopupRequestId;setWeatherControlState({loading:true});const loadingPopup=L.popup({closeButton:true,offset:[0,-8]}).setLatLng(e.latlng).setContent('<div class="weather-popup weather-popup--loading">Wetter wird geladen …</div>').openOn(map);const data=await getWeather(e.latlng.lat,e.latlng.lng);
if(data?.current){window.__lastWeatherData=data.current;}if(requestId!==weatherPopupRequestId)return;if(!weatherEnabled){setWeatherControlState();return}if(!data||!data.current){loadingPopup.setContent('<div class="weather-popup weather-popup--error">Open-Meteo konnte für diesen Punkt gerade keine Daten liefern.</div>');setWeatherControlState();return}loadingPopup.setContent(buildWeatherPopupHtml(data));setWeatherControlState()});map._weatherClickBound=true;}};function loadState(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return structuredClone(defaultData);try{const data=JSON.parse(raw);return{meta:data.meta||structuredClone(defaultData.meta),participants:Array.isArray(data.participants)?data.participants:[],catches:Array.isArray(data.catches)?data.catches:[],tournaments:Array.isArray(data.tournaments)?data.tournaments:[]}}catch{return structuredClone(defaultData)}}

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

function renderParticipantDetail(participantId){const modal=document.getElementById('participantDetailModal'),body=document.getElementById('participantDetailBody');if(!modal||!body)return;const data=participantDetailData(participantId);if(!data)return;const p=data.participant,rank=(data.stats?computeParticipantStats().findIndex(x=>x.id===participantId)+1:0),compareEntry=renderParticipantComparePicker(participantId),recent=[...data.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,4),seniorityBadge=renderSeniorityBadge(data.stats||p),seniorityProgress=renderSeniorityProgress(data.stats||p),awards=computeParticipantMicroAwards(data,computeParticipantStats(),state.catches),tournamentSummary=participantTournamentSummary(participantId),tournamentSection=renderParticipantTournamentSection(tournamentSummary);if(document.getElementById('participantDetailTitle'))document.getElementById('participantDetailTitle').textContent='Teilnehmer-Detail';modal.dataset.view='detail';modal.dataset.returnParticipantId='';body.innerHTML=`<div class="participant-detail-hero" style="--participant-color:${p.color||'#4ad7d1'}"><div class="participant-detail-avatar">${escapeHtml(p.avatar||'🎣')}</div><div><p class="eyebrow">Teilnehmer-Insights</p><h2>${escapeHtml(p.name)}</h2><div class="meta">${rank?`Rang #${rank} · `:''}${data.stats?.points||0} Punkte · ${data.catches.length} Fänge</div></div></div>${renderParticipantCoachLauncher(participantId)}${compareEntry}<section class="participant-game-panel"><div class="participant-game-main"><div class="participant-game-title"><span>Level & Badges</span>${seniorityBadge}</div>${seniorityProgress}</div><div class="participant-awards"><div class="participant-awards__label">Micro-Awards</div><div class="participant-awards__list">${renderParticipantMicroAwards(awards)}</div></div></section>${tournamentSection}<div class="participant-detail-kpis"><article><span>Fänge</span><strong>${data.catches.length}</strong><small>gesamt erfasst</small></article><article><span>Top Gewicht</span><strong>${data.heaviest?fmtKg(data.heaviest.weightKg):'–'}</strong><small>${data.heaviest?escapeHtml(speciesName(data.heaviest)):'noch offen'}</small></article><article><span>Ø Gewicht</span><strong>${fmtKg(data.avgWeight)}</strong><small>pro Fang</small></article><article><span>Ø Länge</span><strong>${Math.round(data.avgLength||0)} cm</strong><small>pro Fang</small></article></div><div class="participant-detail-grid"><section class="participant-detail-panel"><h3>Stärken</h3><div class="detail-fact"><span>Grösster Fang</span><strong>${data.longest?`${escapeHtml(speciesName(data.longest))} · ${Number(data.longest.lengthCm||0).toFixed(0)} cm`:'–'}</strong></div><div class="detail-fact"><span>Beste Fischart</span><strong>${data.topSpecies?`${escapeHtml(data.topSpecies[0])} · ${data.topSpecies[1]}x`:'–'}</strong></div><div class="detail-fact"><span>Bester Spot</span><strong>${data.topSpot?`${escapeHtml(data.topSpot[0])} · ${data.topSpot[1]}x`:'–'}</strong></div><div class="detail-fact"><span>Beste Zeit</span><strong>${data.bestHour.count?`${String(data.bestHour.hour).padStart(2,'0')}:00 · ${data.bestHour.count}x`:'–'}</strong></div></section><section class="participant-detail-panel"><h3>Entwicklung über Zeit</h3><div class="participant-detail-timeline">${participantTimelineBars(data.days)}</div></section></div><section class="participant-detail-panel"><h3>Letzte Fänge</h3><div class="participant-detail-recent">${recent.length?recent.map(c=>`<article><strong>${escapeHtml(speciesName(c))}</strong><span>${Number(c.lengthCm||0).toFixed(0)} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</span><small>${escapeHtml(c.spotLabel||c.location?.label||'Kein Spot')}${c.bait?` · ${escapeHtml(c.bait)}`:''}</small></article>`).join(''):'<div class="meta">Noch keine Fänge vorhanden.</div>'}</div></section>`;modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');document.body.classList.add('participant-detail-open')}
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

if(leaderboard[0])insights.push({title:'Aktueller Leader',body:`${leaderboard[0].name} führt mit ${leaderboard[0].points} Punkten und ${leaderboard[0].count} Fängen.`});return insights}function getForecast(){const catches=state.catches;if(!catches.length)return{text:'Noch zu wenig Daten für eine sinnvolle Prognose.'};const dates=catches.map(c=>startOfDay(c.timestamp).getTime()),min=Math.min(...dates),max=Math.max(...dates),days=Math.max(1,Math.round((max-min)/86400000)+1),avgPerDay=catches.length/days,projected30=Math.round(avgPerDay*30),weightPerCatch=catches.reduce((s,c)=>s+Number(c.weightKg||0),0)/catches.length;return{text:`Wenn ihr dieses Tempo haltet, landet ihr in 30 Tagen bei etwa ${projected30} Fängen. Bei eurem aktuellen Schnitt entspricht das rund ${fmtKg(projected30*weightPerCatch)} Gesamtgewicht.`,avgPerDay,projected30}}function populateSelects(){const participantSelect=document.getElementById('participantSelect'),participantFilter=document.getElementById('participantFilter');participantSelect.innerHTML='';participantFilter.innerHTML='<option value="all">Alle Teilnehmer</option>';state.participants.forEach(p=>{participantSelect.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.avatar||'🎣'} ${p.name}</option>`);participantFilter.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.name}</option>`)});const speciesFilter=document.getElementById('speciesFilter');const speciesValues=[...new Set(state.catches.map(c=>speciesName(c)))];speciesFilter.innerHTML='<option value="all">Alle Fischarten</option>'+speciesValues.map(v=>`<option value="${v}">${v}</option>`).join('');const tournamentSelect=document.getElementById('tournamentSelect');if(tournamentSelect){tournamentSelect.innerHTML = '<option value="">Kein Turnier</option>' + state.tournaments.filter(t => !t.finished).map(t => `<option value="${t.id}">${t.name}</option>`).join('')}renderTournamentParticipantPicks()}function renderDashboard(){const s=computeSummary();document.getElementById('tripTitle').textContent=state.meta.tripName;document.getElementById('tripSubtitle').textContent=state.meta.tripSubtitle;document.getElementById('totalCatches').textContent=s.totalCatches;document.getElementById('totalWeight').textContent=fmtKg(s.totalWeight);document.getElementById('biggestCatch').textContent=s.biggest?`${speciesName(s.biggest)} ${Number(s.biggest.lengthCm||0).toFixed(0)} cm`:'–';document.getElementById('todayCatches').textContent=s.todayCount;document.getElementById('currentLeader').textContent=s.leader?s.leader.name:'–';document.getElementById('avgWeight').textContent=fmtKg(s.avgWeight);document.getElementById('bestTimeSlot').textContent=s.bestHour.count?`${String(s.bestHour.hour).padStart(2,'0')}:00`:'–';const leaderboard=document.getElementById('leaderboardList');leaderboard.innerHTML='';s.leaderboard.forEach((p,i)=>leaderboard.insertAdjacentHTML('beforeend',`<article class="list-card participant-leaderboard-card" data-participant-id="${p.id}" role="button" tabindex="0" aria-label="Details zu ${p.name} öffnen"><div><div class="list-title-row"><strong>#${i+1} ${p.avatar||'🎣'} ${p.name}</strong><span class="badge" style="background:${p.color}">${p.points} Punkte</span></div><div class="meta">${p.count} Fänge · ${fmtKg(p.totalWeight)} Gesamtgewicht · Ø ${Math.round((p.avgLength||0))} cm</div></div><div class="meta">${p.heaviest?`Top: ${speciesName(p.heaviest)} ${fmtKg(p.heaviest.weightKg)}`:'Noch kein Fang'}</div></article>`));const recent=[...state.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,8),recentEl=document.getElementById('recentCatches');recentEl.replaceChildren();recentEl.innerHTML=recent.length?'':'<div class="meta">Noch keine Fänge vorhanden.</div>';recent.forEach(c=>{const p=participantById(c.participantId),bg=p?.color||'#4ad7d1';recentEl.insertAdjacentHTML('beforeend',`<article class="list-card recent-catch-card" data-catch-id="${c.id}" role="button" tabindex="0" aria-label="Fang ${escapeHtml(speciesName(c))} auf der Karte anzeigen"><div><div class="list-title-row"><strong>${speciesName(c)}</strong><span class="badge" style="background:${bg}">${p?.avatar||'🎣'} ${p?.name||'–'}</span></div><div class="meta">${c.lengthCm} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</div><div class="note">${c.spotLabel||c.location?.label||'Kein Spot'}${c.bait?` · Köder: ${c.bait}`:''}</div></div><span class="recent-catch-map-hint" aria-hidden="true">Karte ↗</span></article>`)}) ;const insights=document.getElementById('insightsList');insights.innerHTML='';getInsights().forEach(item=>insights.insertAdjacentHTML('beforeend',`<article class="insight-card"><strong>${item.title}</strong><span>${item.body}</span></article>`));renderCharts()}function cleanup(key){if(charts[key])charts[key].destroy()}function css(name){return getComputedStyle(document.body).getPropertyValue(name).trim()}function dashboardChartOptions(){return{responsive:true,maintainAspectRatio:false,animation:false,layout:{padding:{top:6,right:10,bottom:0,left:0}},scales:{x:{offset:true,ticks:{color:css('--muted'),font:{size:11,weight:'600'},padding:8,maxRotation:0,autoSkip:true},grid:{display:false},border:{color:'rgba(255,255,255,.14)'}},y:{beginAtZero:true,afterFit(axis){axis.width=42},ticks:{color:css('--muted'),font:{size:11,weight:'600'},padding:8,precision:0},grid:{color:'rgba(255,255,255,.08)',drawTicks:false},border:{display:false}}},plugins:{legend:{display:false}}}}function renderCharts(){const daily=dailyBuckets();cleanup('daily');charts.daily=new Chart(document.getElementById('dailyChart'),{type:'bar',data:{labels:daily.map(x=>x[0].slice(5)),datasets:[{label:'Fänge',data:daily.map(x=>x[1]),backgroundColor:'#4ad7d1',borderRadius:12}]},options:dashboardChartOptions()});const pStats=computeParticipantStats();cleanup('participants');charts.participants=new Chart(document.getElementById('participantChart'),{type:'bar',data:{labels:pStats.map(p=>p.name),datasets:[{label:'Fänge',data:pStats.map(p=>p.count),backgroundColor:'#4ad7d1',borderRadius:12},{label:'Punkte',data:pStats.map(p=>p.points),backgroundColor:'#ffb84d',borderRadius:12}]},options:{scales:{x:{ticks:{color:css('--muted')},grid:{display:false}},y:{ticks:{color:css('--muted')},grid:{color:'rgba(255,255,255,.08)'}}},plugins:{legend:{labels:{color:css('--text')}}}}})}function getCatchById(catchId){return state.catches.find(c=>c.id===catchId)}function validCatchLocation(c){return c&&c.location&&Number.isFinite(Number(c.location.lat))&&Number.isFinite(Number(c.location.lng))}function openDashboardCatchMap(catchId){const c=getCatchById(catchId);if(!validCatchLocation(c)){alert('Für diesen Fang ist kein gültiger Standort gespeichert.');return}selectedDashboardCatchId=catchId;pendingCatchFocusId=catchId;showScreen('map');renderMap();focusSelectedCatchOnMap(catchId)}function closeDashboardCatchMap(){selectedDashboardCatchId=null;pendingCatchFocusId=null;renderMap();showScreen('dashboard')}function focusSelectedCatchOnMap(catchId,attempt=0){const c=getCatchById(catchId);if(!validCatchLocation(c)||!map)return;if(!document.getElementById('screen-map')?.classList.contains('active'))return;setTimeout(()=>{try{map.invalidateSize();const latlng=[Number(c.location.lat),Number(c.location.lng)];map.setView(latlng,Math.max(map.getZoom(),13),{animate:true});if(window._catchMarkerMap&&window._catchMarkerMap[catchId])window._catchMarkerMap[catchId].openPopup();pendingCatchFocusId=null}catch(err){if(attempt<5)setTimeout(()=>focusSelectedCatchOnMap(catchId,attempt+1),90)}},attempt?90:160)}function renderSelectedCatchMapPanel(){const actions=document.querySelector('#screen-map .map-actions');if(!actions)return;let panel=document.getElementById('selectedCatchMapPanel');if(!selectedDashboardCatchId){if(panel)panel.remove();return}const c=getCatchById(selectedDashboardCatchId);if(!validCatchLocation(c)){selectedDashboardCatchId=null;if(panel)panel.remove();return}const p=participantById(c.participantId);if(!panel){panel=document.createElement('div');panel.id='selectedCatchMapPanel';panel.className='selected-catch-map-panel';actions.appendChild(panel)}panel.innerHTML=`<div><span class="subtle">Aus Dashboard geöffnet</span><strong>${escapeHtml(speciesName(c))}</strong><small>${Number(c.lengthCm||0).toFixed(0)} cm · ${fmtKg(c.weightKg)} · ${escapeHtml(p?.name||'–')} · ${fmtDateTime(c.timestamp)}</small></div><button type="button" class="icon-btn" data-close-selected-catch-map aria-label="Zurück zum Dashboard">✕</button>`}function initRecentCatchMapInteraction(){const recentEl=document.getElementById('recentCatches');if(!recentEl||recentEl.dataset.mapBound==='1')return;recentEl.addEventListener('click',e=>{const card=e.target.closest('.recent-catch-card');if(card)openDashboardCatchMap(card.dataset.catchId)});recentEl.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.closest('.recent-catch-card')){e.preventDefault();openDashboardCatchMap(e.target.closest('.recent-catch-card').dataset.catchId)}});document.addEventListener('click',e=>{if(e.target.closest('[data-close-selected-catch-map]'))closeDashboardCatchMap()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&selectedDashboardCatchId&&document.getElementById('screen-map')?.classList.contains('active'))closeDashboardCatchMap()});recentEl.dataset.mapBound='1'}function renderHistory(){const list=document.getElementById('catchHistoryList');const speciesFilter=document.getElementById('speciesFilter').value,participantFilter=document.getElementById('participantFilter').value,q=document.getElementById('searchCatch').value.trim().toLowerCase();let items=[...state.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));if(speciesFilter!=='all')items=items.filter(c=>speciesName(c)===speciesFilter);if(participantFilter!=='all')items=items.filter(c=>c.participantId===participantFilter);if(q)items=items.filter(c=>[speciesName(c),c.spotLabel,c.bait,c.note].join(' ').toLowerCase().includes(q));list.innerHTML='';if(!items.length){list.innerHTML='<div class="meta">Keine Fänge für den aktuellen Filter.</div>';return}items.forEach(c=>{const p=participantById(c.participantId),wrap=document.createElement('article');wrap.className='list-card catch-item';wrap.dataset.id = c.id;wrap.innerHTML=`<div class="list-main"><div class="list-title-row"><strong>${speciesName(c)}</strong><span class="badge" style="background:${p?.color||'#4ad7d1'}">${p?.avatar||'🎣'} ${p?.name||'–'}</span></div><div class="meta">${c.lengthCm} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</div><div class="note">${c.spotLabel||c.location?.label||'Kein Spot'}${c.bait?` · Köder: ${c.bait}`:''}${c.note?` · ${c.note}`:''}</div></div><div class="list-actions"><button class="icon-btn edit-btn">✎</button><button class="icon-btn delete-btn">✕</button></div>`;wrap.querySelector('.delete-btn').addEventListener('click',async()=>{if(!confirm('Diesen Fang wirklich löschen?'))return;state.catches=state.catches.filter(x=>x.id!==c.id);localStorage.setItem(STORAGE_KEY,JSON.stringify(state));rerender();if(db){const{error}=await db.from('catches').delete().eq('id',c.id);if(error)console.error('Delete fehlgeschlagen:',error)}});wrap.querySelector('.edit-btn').addEventListener('click',()=>loadCatchIntoForm(c));list.appendChild(wrap)})}function loadCatchIntoForm(c){showScreen('catches');const form=document.getElementById('catchForm');form.dataset.editingId=c.id;form.species.value=c.species;document.getElementById('speciesSelect').dispatchEvent(new Event('change'));form.customSpecies.value=c.customSpecies||'';form.participantId.value=c.participantId;if(form.tournamentId)form.tournamentId.value=c.tournamentId||'';form.lengthCm.value=c.lengthCm;form.weightKg.value=c.weightKg;form.timestamp.value=new Date(c.timestamp).toISOString().slice(0,16);form.bait.value=c.bait||'';form.spotLabel.value=c.spotLabel||'';form.note.value=c.note||'';form.lat.value=c.location?.lat||'';form.lng.value=c.location?.lng||'';if(c.location?.lat&&c.location?.lng&&window.updateCatchLocationPreview)window.updateCatchLocationPreview(c.location.lat,c.location.lng);window.scrollTo({top:0,behavior:'smooth'})}function renderParticipants(){const container=document.getElementById('participantsList');container.innerHTML='';computeParticipantStats().forEach(p=>{const article=document.createElement('article');article.className='list-card';article.innerHTML=`<div><div class="list-title-row"><strong>${p.avatar||'🎣'} ${p.name}</strong><span class="badge" style="background:${p.color}">${p.points} Punkte</span></div><div class="meta">${p.count} Fänge · ${fmtKg(p.totalWeight)} · Ø ${Math.round((p.avgLength||0))} cm</div></div><div class="list-actions"><button class="icon-btn edit-btn">✎</button><button class="icon-btn delete-btn">✕</button></div>`;article.querySelector('.edit-btn').addEventListener('click',()=>loadParticipantIntoForm(p));article.querySelector('.delete-btn').addEventListener('click',()=>{if(state.catches.some(c=>c.participantId===p.id)){alert('Dieser Teilnehmer hat bereits Fänge. Bitte zuerst Fänge löschen oder umhängen.');return}state.participants=state.participants.filter(x=>x.id!==p.id);persist();rerender()});container.appendChild(article)})}function loadParticipantIntoForm(p){showScreen('participants');const form=document.getElementById('participantForm');form.dataset.editingId=p.id;form.name.value=p.name||'';form.color.value=p.color||'#4ad7d1';form.avatar.value=p.avatar||'🎣';const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Teilnehmer speichern';window.scrollTo({top:0,behavior:'smooth'})}function renderRecords(){const list=document.getElementById('recordsList'),catches=[...state.catches],heaviest=catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null),longest=catches.reduce((m,c)=>!m||c.lengthCm>m.lengthCm?c:m,null),earliest=catches.reduce((m,c)=>!m||new Date(c.timestamp)<new Date(m.timestamp)?c:m,null),latest=catches.reduce((m,c)=>!m||new Date(c.timestamp)>new Date(m.timestamp)?c:m,null),entries=[heaviest&&`Schwerster Fisch: ${speciesName(heaviest)} mit ${fmtKg(heaviest.weightKg)} von ${participantById(heaviest.participantId)?.name||'–'}.`,longest&&`Längster Fisch: ${speciesName(longest)} mit ${longest.lengthCm} cm.`,earliest&&`Erster erfasster Fang: ${fmtDateTime(earliest.timestamp)} am Spot ${earliest.spotLabel||earliest.location?.label||'–'}.`,latest&&`Letzter erfasster Fang: ${fmtDateTime(latest.timestamp)}.`].filter(Boolean);list.innerHTML=entries.length?entries.map(t=>`<article class="list-card"><div>${t}</div></article>`).join(''):'<div class="meta">Noch keine Rekorde vorhanden.</div>'}function renderForecast(){document.getElementById('forecastBox').innerHTML=`<article class="insight-card"><strong>30-Tage-Prognose</strong><span>${getForecast().text}</span></article>`}function renderTimeHeatmap(){const grid=document.getElementById('timeHeatmap');grid.innerHTML='';const counts=Array.from({length:24},(_,h)=>state.catches.filter(c=>new Date(c.timestamp).getHours()===h).length),max=Math.max(1,...counts);counts.forEach((count,hour)=>{const opacity=.12+(count/max)*.88,cell=document.createElement('div');cell.className='time-cell';cell.style.background=`rgba(74,215,209,${opacity})`;cell.style.color=opacity>.45?'#00131c':css('--text');cell.innerHTML=`<strong>${String(hour).padStart(2,'0')}:00</strong><span>${count} Fang${count===1?'':'e'}</span>`;grid.appendChild(cell)})}function initMap(){if(map)return;map=L.map('map').setView([59.915,10.78],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(map);markersLayer=L.layerGroup().addTo(map);initWeatherControl()}function renderMap(){initMap();markersLayer.clearLayers();window._catchMarkerMap={};const points=state.catches.filter(c=>c.location?.lat&&c.location?.lng);const bounds=[];points.forEach(c=>{const p=participantById(c.participantId),species=speciesName(c),color=speciesPalette[species]||speciesPalette[c.species]||'#4ad7d1',isSelected=c.id===selectedDashboardCatchId,marker=L.circleMarker([c.location.lat,c.location.lng],{radius:isSelected?Math.max(14,Math.min(26,8+Number(c.weightKg||0)*1.8)):Math.max(7,Math.min(18,4+Number(c.weightKg||0)*1.5)),color:isSelected?'#ffffff':color,fillColor:color,fillOpacity:isSelected?.9:.65,weight:isSelected?5:2,className:isSelected?'catch-marker-selected':''}).bindPopup(`<strong>${species}</strong><br>${c.lengthCm} cm · ${fmtKg(c.weightKg)}<br>${p?.name||'–'} · ${fmtDateTime(c.timestamp)}<br>${c.spotLabel||c.location?.label||'Kein Spot'}`);marker.addTo(markersLayer);window._catchMarkerMap[c.id]=marker;bounds.push([c.location.lat,c.location.lng])});if(bounds.length&&!selectedDashboardCatchId)map.fitBounds(bounds,{padding:[30,30]});const legend=document.getElementById('mapLegend'),uniqueSpecies=[...new Set(state.catches.map(c=>speciesName(c)))];legend.innerHTML=uniqueSpecies.map(s=>`<div class="legend-item"><span class="legend-color" style="background:${speciesPalette[s]||'#4ad7d1'}"></span><span>${s}</span></div>`).join('')||'<div class="meta">Noch keine Fangorte gespeichert.</div>';renderHeatmapGrid(points);renderSelectedCatchMapPanel();if(pendingCatchFocusId)focusSelectedCatchOnMap(pendingCatchFocusId)}function renderHeatmapGrid(points){const container=document.getElementById('heatmapGrid');if(!points.length){container.innerHTML='<div class="meta">Noch keine Standortdaten vorhanden.</div>';return}const rows=5,cols=5;
// feste Europa-/Skandinavien-Grenzen statt dynamischer Verschiebung
const minLat=54,maxLat=72,minLng=4,maxLng=32;
const grid=Array.from({length:rows*cols},()=>0);
points.forEach(c=>{
const r=Math.min(rows-1,Math.max(0,Math.floor(((c.location.lat-minLat)/(maxLat-minLat))*rows)));
const col=Math.min(cols-1,Math.max(0,Math.floor(((c.location.lng-minLng)/(maxLng-minLng))*cols)));
grid[r*cols+col]+=1});const max=Math.max(...grid,1);container.innerHTML='';grid.forEach((count,idx)=>{const opacity=.12+(count/max)*.88,cell=document.createElement('div');cell.className='heat-cell';cell.dataset.zone=`Zone ${idx+1}`;cell.style.background=`rgba(143,240,167,${opacity})`;cell.style.color=opacity>.5?'#06210c':css('--text');cell.innerHTML=`<strong>Zone ${idx+1}</strong><span>${count} Fang${count===1?'':'e'}</span>`;container.appendChild(cell)})}function rerender(){populateSelects();renderDashboard();renderHistory();renderParticipants();renderRecords();renderForecast();renderTimeHeatmap();renderMap();renderTournaments()}function resetViewportScrollAfterScreenChange(){requestAnimationFrame(()=>{try{window.scrollTo({top:0,left:0,behavior:'instant'})}catch(e){window.scrollTo(0,0)}document.documentElement.scrollTop=0;document.body.scrollTop=0})}function showScreen(name){const previousScreen=document.querySelector('.screen.active')?.id||'';const nextScreen=`screen-${name}`;const isScreenChange=previousScreen!==nextScreen;if(name!=='map'&&selectedDashboardCatchId){selectedDashboardCatchId=null;pendingCatchFocusId=null}document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===nextScreen));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));if(isScreenChange)resetViewportScrollAfterScreenChange();if(name==='map'&&map)setTimeout(()=>map.invalidateSize(),120);if(name==='analytics'&&typeof refreshAnalyticsTournamentSelect==='function')setTimeout(refreshAnalyticsTournamentSelect,0)}function attachEvents(){document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));document.getElementById('newTournamentBubble')?.addEventListener('click',resetTournamentFormForNew);document.getElementById('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem(THEME_KEY,document.body.classList.contains('light')?'light':'dark');renderCharts();renderTimeHeatmap();renderMap()});document.getElementById('speciesSelect').addEventListener('change',e=>document.getElementById('customSpeciesWrap').classList.toggle('hidden',e.target.value!=='Andere'));document.getElementById('catchForm').addEventListener('submit',async e=>{e.preventDefault();const form=e.target;const fd=new FormData(form);const editingId=form.dataset.editingId;const entry={id:editingId||crypto.randomUUID(),species:fd.get('species'),customSpecies:fd.get('customSpecies')||'',participantId:fd.get('participantId'),tournamentId:fd.get('tournamentId')||'',lengthCm:Number(fd.get('lengthCm')),weightKg:fd.get('weightKg')?Number(fd.get('weightKg')):0,timestamp:new Date(fd.get('timestamp')).toISOString(),bait:fd.get('bait')||'',spotLabel:fd.get('spotLabel')||'',note:fd.get('note')||'',location:{lat:fd.get('lat')?Number(fd.get('lat')):null,lng:fd.get('lng')?Number(fd.get('lng')):null,label:fd.get('spotLabel')||''},createdAt:new Date().toISOString()};if(editingId){state.catches=state.catches.map(c=>c.id===editingId?entry:c);delete form.dataset.editingId}else{state.catches.push(entry)}await persist();form.reset();document.getElementById('customSpeciesWrap').classList.add('hidden');document.getElementById('timestampInput').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);rerender();showTournamentSaveToast();setTimeout(()=>{const toast=document.getElementById('tournamentSaveToast');if(toast)toast.textContent='Fang erfolgreich gespeichert';},0);setTimeout(()=>{showScreen('catches');const bait=document.querySelector('#catchForm select[name="bait"]');const spot=document.querySelector('#catchForm select[name="spotLabel"]');if(bait)bait.value='';if(spot)spot.value='';},0);});document.getElementById('participantForm').addEventListener('submit',e=>{e.preventDefault();const form=e.target;const fd=new FormData(form),editingId=form.dataset.editingId;if(editingId){state.participants=state.participants.map(p=>p.id===editingId?{...p,name:fd.get('name').trim(),color:fd.get('color'),avatar:fd.get('avatar')||'🎣'}:p);delete form.dataset.editingId}else state.participants.push({id:crypto.randomUUID(),name:fd.get('name').trim(),color:fd.get('color'),avatar:fd.get('avatar')||'🎣'});persist();

form.reset();form.color.value='#4ad7d1';form.avatar.value='🎣';const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Teilnehmer hinzufügen';rerender()});['speciesFilter','participantFilter','searchCatch'].forEach(id=>{document.getElementById(id).addEventListener('input',renderHistory);document.getElementById(id).addEventListener('change',renderHistory)});document.getElementById('useCurrentLocation').addEventListener('click',()=>{if(!navigator.geolocation)return alert('Geolocation wird auf diesem Gerät nicht unterstützt.');navigator.geolocation.getCurrentPosition(pos=>{document.querySelector('[name="lat"]').value=pos.coords.latitude.toFixed(6);document.querySelector('[name="lng"]').value=pos.coords.longitude.toFixed(6);if(window.updateCatchLocationPreview)window.updateCatchLocationPreview(pos.coords.latitude,pos.coords.longitude)},()=>alert('Standort konnte nicht ermittelt werden. Bitte in Safari/Geräteeinstellungen erlauben.'))});document.getElementById('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fishtrack-export-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.participants)||!Array.isArray(parsed.catches))throw new Error();state={meta:parsed.meta||structuredClone(defaultData.meta),participants:Array.isArray(parsed.participants)?parsed.participants:[],catches:Array.isArray(parsed.catches)?parsed.catches:[],tournaments:Array.isArray(parsed.tournaments)?parsed.tournaments:[]};persist();rerender();alert('Import erfolgreich.')}catch{alert('Import fehlgeschlagen. Bitte eine gültige JSON-Datei verwenden.')}});document.getElementById('resetDemoBtn').addEventListener('click',()=>{if(!confirm('Wirklich auf Demo-Daten zurücksetzen?'))return;state=structuredClone(defaultData);persist();rerender()});document.getElementById('tournamentForm')?.addEventListener('submit',async e=>{e.preventDefault();const fd=new FormData(e.target);const selectedParticipants=[...document.querySelectorAll('#tournamentParticipants input[type="checkbox"]:checked')].map(x=>x.value);const useCustom=document.getElementById('enableCustomRules')?.checked||fd.get('rulesetId')==='custom';const customRules={pointsPerFish:Number(document.getElementById('rule_pointsPerFish').value||0),bonusFirstFish:Number(document.getElementById('rule_bonusFirstFish').value||0),bonusLargestFish:Number(document.getElementById('rule_bonusLargestFish').value||0),bonusLargestPerSpecies:Number(document.getElementById('rule_bonusLargestPerSpecies').value||0),bonusNewArea:Number(document.getElementById('rule_bonusNewArea').value||0),bonusOver80cm:Number(document.getElementById('rule_bonusOver80cm').value||0),bonusOver100cm:Number(document.getElementById('rule_bonusOver100cm').value||0)};const editingId=e.target.dataset.editingId;const existingTournament=editingId?tournamentById(editingId):null;const tournament={...(existingTournament||{}),id:editingId||crypto.randomUUID(),name:(fd.get('name')||'').trim(),rulesetId:useCustom?'custom':(fd.get('rulesetId')||'all_fish'),customRules:useCustom?customRules:null,start:fd.get('start')||'',end:fd.get('end')||'',participantIds:selectedParticipants,finished:Boolean(existingTournament?.finished),finishedAt:existingTournament?.finishedAt||null,winner:existingTournament?.winner||null,winnerPoints:Number(existingTournament?.winnerPoints||0),createdAt:existingTournament?.createdAt||new Date().toISOString(),updatedAt:new Date().toISOString()};if(editingId){state.tournaments=state.tournaments.map(x=>x.id===editingId?{...x,...tournament}:x);
window.state.tournaments = state.tournaments;delete e.target.dataset.editingId}else state.tournaments.push(tournament);activeTournamentId=tournament.id;await persist();

e.target.reset();const submit=e.target.querySelector('button[type="submit"]');if(submit)submit.textContent='Turnier speichern';document.getElementById('enableCustomRules').checked=false;updateRulesPreview();renderTournamentParticipantPicks();rerender();closeTournamentEditor();showScreen('tournaments');showTournamentSaveToast();document.querySelector('.tournament-overview-panel')?.scrollIntoView({behavior:'smooth',block:'start'})});document.getElementById('rulesetSelect')?.addEventListener('change',updateRulesPreview);document.getElementById('enableCustomRules')?.addEventListener('change',updateRulesPreview);updateRulesPreview();window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();beforeInstallPromptEvent=e;document.getElementById('installPromptBtn').classList.remove('hidden')});document.getElementById('installPromptBtn').addEventListener('click',async()=>{if(!beforeInstallPromptEvent)return;beforeInstallPromptEvent.prompt();await beforeInstallPromptEvent.userChoice;beforeInstallPromptEvent=null;document.getElementById('installPromptBtn').classList.add('hidden')})}


function updateRulesPreview(){const select=document.getElementById('rulesetSelect');const customToggle=document.getElementById('enableCustomRules');if(!select)return;const useCustom=customToggle?.checked||select.value==='custom';const rule=useCustom?null:(RULESETS[select.value]||RULESETS.all_fish);['pointsPerFish','bonusFirstFish','bonusLargestFish','bonusLargestPerSpecies','bonusNewArea','bonusOver80cm','bonusOver100cm'].forEach(key=>{const input=document.getElementById('rule_'+key);if(!input)return;if(rule){input.value=rule[key]||0;input.disabled=true}else{input.disabled=false}})}

function gridIdFromCatch(c){if(!c.location||!c.location.lat||!c.location.lng)return'unknown';const cellLat=Math.floor(Number(c.location.lat)/0.018);const cellLng=Math.floor(Number(c.location.lng)/0.036);return`grid_${cellLat}_${cellLng}`}
function tournamentById(id){return state.tournaments.find(t=>t.id===id)}
function renderTournamentParticipantPicks(){const box=document.getElementById('tournamentParticipants');if(!box)return;box.innerHTML='';state.participants.forEach(p=>{box.insertAdjacentHTML('beforeend',`<label class="pick-chip"><input type="checkbox" value="${p.id}" checked><span>${p.avatar||'🎣'} ${p.name}</span></label>`)})}
function getTournamentRules(t){if(t?.rulesetId==='custom'&&t.customRules)return {...t.customRules,name:'Eigenes Regelwerk'};return RULESETS[t?.rulesetId]||RULESETS.all_fish}
function computeTournamentScores(tournament){const catches=state.catches.filter(c=>c.tournamentId===tournament.id).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));const rules=getTournamentRules(tournament);const allowed=tournament.participantIds?.length?tournament.participantIds:state.participants.map(p=>p.id);const scoreMap=new Map(allowed.map(id=>[id,{participant:participantById(id),points:0,catches:0,totalWeight:0,bonuses:[],species:new Set()}]));const add=(id,pts,label)=>{if(!scoreMap.has(id))scoreMap.set(id,{participant:participantById(id),points:0,catches:0,totalWeight:0,bonuses:[],species:new Set()});const row=scoreMap.get(id);row.points+=pts;if(label)row.bonuses.push(label)};catches.forEach((c,i)=>{const row=scoreMap.get(c.participantId);if(!row)return;row.catches+=1;row.totalWeight+=Number(c.weightKg||0);row.points+=rules.pointsPerFish||0;if((rules.bonusNewSpecies||0)>0){const s=speciesName(c);if(!row.species.has(s)){row.species.add(s);row.points+=rules.bonusNewSpecies;row.bonuses.push(`Neue Art: ${s} +${rules.bonusNewSpecies}`)}}if((rules.bonusOver80cm||0)>0&&Number(c.lengthCm||0)>=80){row.points+=rules.bonusOver80cm;row.bonuses.push(`>80 cm +${rules.bonusOver80cm}`)}if((rules.bonusOver100cm||0)>0&&Number(c.lengthCm||0)>=100){row.points+=rules.bonusOver100cm;row.bonuses.push(`>100 cm +${rules.bonusOver100cm}`)}if((rules.bonusNewArea||0)>0){const grid=gridIdFromCatch(c);const seenBefore=catches.slice(0,i).some(x=>gridIdFromCatch(x)===grid);if(!seenBefore&&grid!=='unknown'){row.points+=rules.bonusNewArea;row.bonuses.push(`Entschneidert +${rules.bonusNewArea}`)}}});if(catches[0]&&(rules.bonusFirstFish||0)>0)add(catches[0].participantId,rules.bonusFirstFish,`Erster Fisch +${rules.bonusFirstFish}`);if((rules.bonusLargestFish||0)>0&&catches.length){const biggest=[...catches].reduce((m,c)=>!m||Number(c.weightKg||0)>Number(m.weightKg||0)?c:m,null);if(biggest)add(biggest.participantId,rules.bonusLargestFish,`Größter Fisch +${rules.bonusLargestFish}`)}if((rules.bonusLargestPerSpecies||0)>0&&catches.length){const bySpecies={};catches.forEach(c=>{const s=speciesName(c);if(!bySpecies[s]||Number(c.weightKg||0)>Number(bySpecies[s].weightKg||0))bySpecies[s]=c});Object.values(bySpecies).forEach(c=>add(c.participantId,rules.bonusLargestPerSpecies,`Größter ${speciesName(c)} +${rules.bonusLargestPerSpecies}`))}return{rules,catches,rows:[...scoreMap.values()].sort((a,b)=>b.points-a.points||b.totalWeight-a.totalWeight)}}
let tournamentEditorOriginalParent=null,tournamentEditorOriginalNext=null,tournamentEditorReturnFocus=null;
function ensureTournamentEditorModal(){
  let modal=document.getElementById('tournamentEditorModal');
  if(modal)return modal;
  modal=document.createElement('div');
  modal.id='tournamentEditorModal';
  modal.className='participant-detail-modal tournament-editor-modal hidden';
  modal.setAttribute('aria-hidden','true');
  modal.setAttribute('role','dialog');
  modal.setAttribute('aria-modal','true');
  modal.setAttribute('aria-labelledby','tournamentEditorTitle');
  modal.innerHTML=`<div class="participant-detail-card glass tournament-editor-modal-card">
    <button class="icon-btn tournament-modal-close" type="button" aria-label="Turnier-Modal schliessen" data-close-tournament-editor>✕</button>
    <div id="tournamentEditorModalBody"></div>
  </div>`;
  modal.addEventListener('click',e=>{
    if(e.target===modal||e.target.closest('[data-close-tournament-editor]'))closeTournamentEditor();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeTournamentEditor();
  });
  
  document.body.appendChild(modal);
  
  /* 🔥 FIX: Leaflet neu berechnen nach DOM Move */
  setTimeout(() => {
    if (window.map && typeof window.map.invalidateSize === 'function') {
      window.map.invalidateSize();
    }
  }, 50);
  
  return modal;
}
function openTournamentEditor(){
  showScreen('tournaments');
  const panel=document.getElementById('tournamentEditorPanel');
  if(!panel)return;
  const modal=ensureTournamentEditorModal();
  const body=document.getElementById('tournamentEditorModalBody');
  if(!body)return;
  tournamentEditorReturnFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  if(!tournamentEditorOriginalParent){
    tournamentEditorOriginalParent=panel.parentNode;
    tournamentEditorOriginalNext=panel.nextSibling;
  }
  panel.classList.remove('is-collapsed');
  body.appendChild(panel);
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('participant-detail-open');
  requestAnimationFrame(()=>{
    const firstInput=panel.querySelector('input,select,textarea,button');
    if(firstInput)firstInput.focus({preventScroll:true});
  });
}
function closeTournamentEditor(){
  const panel=document.getElementById('tournamentEditorPanel');
  const modal=document.getElementById('tournamentEditorModal');
  if(modal){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
  }
  if(panel){
    panel.classList.add('is-collapsed');
    if(tournamentEditorOriginalParent&&panel.parentNode!==tournamentEditorOriginalParent){
      tournamentEditorOriginalParent.insertBefore(panel,tournamentEditorOriginalNext);
    }
  }
  document.body.classList.remove('participant-detail-open');
  if(tournamentEditorReturnFocus&&typeof tournamentEditorReturnFocus.focus==='function'){
    setTimeout(()=>tournamentEditorReturnFocus?.focus({preventScroll:true}),0);
  }
  tournamentEditorReturnFocus=null;
}function showTournamentSaveToast(){const toast=document.getElementById('tournamentSaveToast');if(!toast)return;toast.textContent='Erfolgreich Turnier gespeichert';toast.classList.remove('hidden');clearTimeout(window.__fishtrackTournamentToastTimer);window.__fishtrackTournamentToastTimer=setTimeout(()=>toast.classList.add('hidden'),2600);}function resetTournamentFormForNew(){const form=document.getElementById('tournamentForm');if(!form)return;form.reset();delete form.dataset.editingId;const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Turnier speichern';const customToggle=document.getElementById('enableCustomRules');if(customToggle)customToggle.checked=false;if(typeof updateRulesPreview==='function')updateRulesPreview();if(typeof renderTournamentParticipantPicks==='function')renderTournamentParticipantPicks();openTournamentEditor();}function loadTournamentIntoForm(t){openTournamentEditor();const form=document.getElementById('tournamentForm');if(!form)return;form.dataset.editingId=t.id;const nameField=form.querySelector('[name="name"]');const startField=form.querySelector('[name="start"]');const endField=form.querySelector('[name="end"]');if(nameField)nameField.value=t.name||'';if(startField)startField.value=t.start||'';if(endField)endField.value=t.end||'';const ruleset=document.getElementById('rulesetSelect');if(ruleset)ruleset.value=t.rulesetId==='custom'?'all_fish':(t.rulesetId||'all_fish');const customToggle=document.getElementById('enableCustomRules');if(customToggle)customToggle.checked=t.rulesetId==='custom';const rules=t.customRules||{};['pointsPerFish','bonusFirstFish','bonusLargestFish','bonusLargestPerSpecies','bonusNewArea','bonusOver80cm','bonusOver100cm'].forEach(key=>{const el=document.getElementById('rule_'+key);if(el)el.value=rules[key] ?? el.value ?? 0});document.querySelectorAll('#tournamentParticipants input[type="checkbox"]').forEach(cb=>{cb.checked=(t.participantIds||[]).includes(cb.value)});const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Turnier speichern';if(typeof updateRulesPreview==='function')updateRulesPreview();window.scrollTo({top:0,behavior:'smooth'})}


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
function buildPremiumAnalyticsModel(catchesOverride){
  const catches=[...(Array.isArray(catchesOverride)?catchesOverride:(state.catches||[]))];
  const originalCatches=state.catches;
  if(Array.isArray(catchesOverride)) state.catches=catches;
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
  if(Array.isArray(catchesOverride)) state.catches=originalCatches;
  const efficient=[...pStats].filter(p=>p.count>0).map(p=>({...p,pointsPerCatch:p.points/p.count})).sort((a,b)=>b.pointsPerCatch-a.pointsPerCatch)[0];
  return {catches,summary,species,spots,baits,hours,weekdays,bestHour,bestDay,topCombo,pStats,efficient,totalWeight:catches.reduce((s,c)=>s+Number(c.weightKg||0),0),avgLength:analyticsAvg(catches.map(c=>c.lengthCm)),avgWeight:analyticsAvg(catches.map(c=>c.weightKg))};
}
function premiumInsightCard(icon,label,value,detail){
  return `<article class="analytics-insight-card"><span class="analytics-insight-icon">${icon}</span><div><small>${escapeHtml(label)}</small><strong>${escapeHtml(String(value||'–'))}</strong><p>${escapeHtml(detail||'')}</p></div></article>`;
}

function analyticsDateKey(c){
  const d=new Date(c.timestamp||c.createdAt);
  if(Number.isNaN(d.getTime()))return null;
  return d;
}
function analyticsSafePct(v,min=.08){
  const n=Number(v);
  return Number.isFinite(n)?Math.max(min,Math.min(1,n)):min;
}
function analyticsHourLabel(hour){
  const h=Math.max(0,Math.min(23,Number(hour)||0));
  return `${String(h).padStart(2,'0')}:00`;
}
function analyticsPredictionHint(m,focus){
  const catches=m.catches||[];
  if(!catches.length)return null;
  const hourScores=Array.from({length:24},(_,hour)=>({hour,score:0,count:0,weight:0,species:new Map(),bait:new Map(),spot:new Map()}));
  catches.forEach(c=>{
    const d=analyticsDateKey(c);if(!d)return;
    const h=d.getHours();
    const weight=Number(c.weightKg||0);
    const length=Number(c.lengthCm||0);
    const score=1+(weight*.42)+(length*.012);
    const bucket=hourScores[h];
    bucket.score+=score;bucket.count+=1;bucket.weight+=weight;
    const sp=speciesName(c)||'Unbekannte Art';
    const bait=c.bait||'Unbekannter Köder';
    const spot=c.spotLabel||c.location?.label||'Unbekannter Spot';
    bucket.species.set(sp,(bucket.species.get(sp)||0)+1);
    bucket.bait.set(bait,(bucket.bait.get(bait)||0)+1);
    bucket.spot.set(spot,(bucket.spot.get(spot)||0)+1);
  });
  const best=hourScores.sort((a,b)=>b.score-a.score||b.count-a.count)[0];
  const top=(map)=>[...map.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'–';
  return {hour:best.hour,label:analyticsHourLabel(best.hour),confidence:Math.round(Math.min(96,42+(best.count/Math.max(1,catches.length))*210+(best.score/Math.max(1,catches.length))*9)),species:top(best.species),bait:top(best.bait),spot:top(best.spot),focus};
}
function buildCatchFlowIntelligence(m){
  const catches=[...m.catches].map(c=>({catch:c,date:analyticsDateKey(c)})).filter(x=>x.date).sort((a,b)=>a.date-b.date);
  if(!catches.length){
    return `<article class="analytics-intel-visual analytics-flow-intel analytics-intel-v2"><div class="analytics-intel-head"><div><small>Catch Flow Intelligence v2</small><h4>Noch keine Fangphasen</h4></div><span>Flow</span></div><div class="analytics-intel-empty">Sobald Fänge vorhanden sind, erkennt diese Fläche automatisch Aktivitätszonen, Peaks und den besten nächsten Fangslot.</div></article>`;
  }
  const bucketCount=8;
  const buckets=Array.from({length:bucketCount},(_,i)=>({label:analyticsHourLabel(i*3),count:0,weight:0,length:0,species:new Map(),weatherTemp:[],weatherWind:[],weatherPrecip:[],weatherClouds:[],weatherConditions:new Map()}));
  catches.forEach(x=>{
    const idx=Math.min(bucketCount-1,Math.max(0,Math.floor(x.date.getHours()/3)));
    const b=buckets[idx];
    b.count+=1;b.weight+=Number(x.catch.weightKg||0);b.length+=Number(x.catch.lengthCm||0);
    const sp=speciesName(x.catch)||'Unbekannt';
    b.species.set(sp,(b.species.get(sp)||0)+1);
    const temp=Number(x.catch.weather_temp_c),wind=Number(x.catch.weather_wind_ms),precip=Number(x.catch.weather_precip_mm),clouds=Number(x.catch.weather_clouds);
    if(Number.isFinite(temp))b.weatherTemp.push(temp);
    if(Number.isFinite(wind))b.weatherWind.push(wind);
    if(Number.isFinite(precip))b.weatherPrecip.push(precip);
    if(Number.isFinite(clouds))b.weatherClouds.push(clouds);
    if(x.catch.weather_condition)b.weatherConditions.set(x.catch.weather_condition,(b.weatherConditions.get(x.catch.weather_condition)||0)+1);
  });
  const rawMax=Math.max(...buckets.map(b=>b.count),1);
  const avg=arr=>arr.length?arr.reduce((a,b)=>a+b,0)/arr.length:null;
  const scoreWeather=b=>{
    const temp=avg(b.weatherTemp),wind=avg(b.weatherWind),precip=avg(b.weatherPrecip),clouds=avg(b.weatherClouds);
    if(temp==null&&wind==null&&precip==null&&clouds==null)return null;
    let score=100;
    if(temp!=null)score-=Math.min(32,Math.abs(temp-12)*2.1);
    if(wind!=null)score-=Math.min(30,wind*4.2);
    if(precip!=null)score-=Math.min(24,precip*16);
    if(clouds!=null)score-=Math.min(14,Math.abs(clouds-55)*.18);
    return Math.round(Math.max(8,Math.min(99,score)));
  };
  const smooth=buckets.map((b,i)=>{
    const prev=buckets[i-1]?.count||0,next=buckets[i+1]?.count||0;
    const density=(prev*.32+b.count*.88+next*.32)/Math.max(1,rawMax*1.52);
    const weatherScore=scoreWeather(b);
    const topCondition=[...b.weatherConditions.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'';
    return {...b,density:analyticsSafePct(density,.04),phase:density>.72?'Peak':density>.42?'Build-Up':b.count?'Active':'Low',weatherScore,topCondition,avgTemp:avg(b.weatherTemp),avgWind:avg(b.weatherWind),avgPrecip:avg(b.weatherPrecip)};
  });
  const points=smooth.map((b,i)=>({x:6+(i/(Math.max(1,smooth.length-1)))*88,y:74-(b.density*48),...b}));
  const top=points.reduce((a,b)=>b.density>a.density?b:a,points[0]);
  const topIdx=points.indexOf(top);
  const path=points.map((p,i)=>`${i?'S':'M'} ${i?((points[i-1].x+p.x)/2).toFixed(2):p.x.toFixed(2)} ${p.y.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const waveLow=`${points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${(84-(p.density*7)).toFixed(2)}`).join(' ')} L 94 90 L 6 90 Z`;
  const waveMid=`${points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${(80-(p.density*18)).toFixed(2)}`).join(' ')} L 94 90 L 6 90 Z`;
  const waveHigh=`${points.map((p,i)=>`${i?'L':'M'} ${p.x.toFixed(2)} ${(76-(p.density*34)).toFixed(2)}`).join(' ')} L 94 90 L 6 90 Z`;
  const segments=points.map((p,i)=>{const w=88/Math.max(1,points.length);return `<span class="flow-zone is-${p.phase.toLowerCase().replace('-','')}" style="left:${Math.max(3,p.x-w/2).toFixed(2)}%;width:${Math.min(94,w).toFixed(2)}%"><b>${escapeHtml(p.phase)}</b></span>`;}).join('');
  const weatherSegments=points.map((p,i)=>{const w=88/Math.max(1,points.length),score=p.weatherScore,strength=score==null?.12:Math.max(.18,Math.min(.92,score/100)),label=score==null?'Wetter offen':`${score}% Weather Fit`;return `<span class="flow-weather-segment ${score==null?'is-empty':''}" style="left:${Math.max(3,p.x-w/2).toFixed(2)}%;width:${Math.min(94,w).toFixed(2)}%;--weather:${strength.toFixed(2)}" title="${escapeHtml(label)}"></span>`;}).join('');
  const topSpecies=[...top.species.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||'–';
  const avgPerHour=(catches.length/24).toFixed(1).replace('.',',');
  const activeWindow=`${escapeHtml(top.label)}–${escapeHtml(analyticsHourLabel((topIdx*3+3)%24))}`;
  const densities=points.map(p=>p.density);
  const avgDensity=densities.reduce((a,b)=>a+b,0)/Math.max(1,densities.length);
  const variance=densities.reduce((sum,d)=>sum+Math.pow(d-avgDensity,2),0)/Math.max(1,densities.length);
  const stability=Math.round(Math.max(0,Math.min(99,(1-Math.sqrt(variance))*100)));
  const weatherPoints=points.filter(p=>p.weatherScore!=null);
  const bestWeather=[...weatherPoints].sort((a,b)=>b.weatherScore-a.weatherScore||b.count-a.count)[0];
  const avgWeatherScore=weatherPoints.length?Math.round(weatherPoints.reduce((s,p)=>s+p.weatherScore,0)/weatherPoints.length):null;
  const weatherScoreLabel=avgWeatherScore==null?'–':`${avgWeatherScore}%`;
  const weatherWindow=bestWeather?`${escapeHtml(bestWeather.label)} · ${bestWeather.avgTemp==null?'–':Math.round(bestWeather.avgTemp)+'°C'} / ${bestWeather.avgWind==null?'–':bestWeather.avgWind.toFixed(1).replace('.',',')+' m/s'}`:'keine Wetterdaten';
  return `<article class="analytics-intel-visual analytics-flow-intel analytics-intel-v2"><div class="analytics-intel-head"><div><small>Catch Flow Intelligence v2</small><h4>Automatisch erkannte Fangphasen</h4></div><span>${top.phase}</span></div><div class="flow-v2-stage"><div class="flow-zone-rail">${segments}</div><div class="flow-weather-rail" aria-hidden="true">${weatherSegments}</div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="flowV2A" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--primary)" stop-opacity=".10"/><stop offset=".52" stop-color="var(--accent)" stop-opacity=".28"/><stop offset="1" stop-color="var(--primary)" stop-opacity=".08"/></linearGradient><linearGradient id="flowWeatherGlow" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--primary)" stop-opacity=".04"/><stop offset=".48" stop-color="var(--accent)" stop-opacity=".18"/><stop offset="1" stop-color="var(--primary)" stop-opacity=".06"/></linearGradient><filter id="flowV2Glow"><feGaussianBlur stdDeviation="2.2" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect class="flow-weather-haze" x="5" y="35" width="90" height="45" rx="18"></rect><path class="flow-v2-band flow-v2-low" d="${waveLow}"></path><path class="flow-v2-band flow-v2-mid" d="${waveMid}"></path><path class="flow-v2-band flow-v2-high" d="${waveHigh}"></path><path class="flow-v2-spine" d="${path}"></path></svg><div class="flow-v2-axis">${smooth.map((b,i)=>`<span class="${i===topIdx?'is-hot':''}">${escapeHtml(b.label)}</span>`).join('')}</div></div><div class="analytics-intel-facts analytics-flow-facts-v2"><span><b>${top.count}</b> Peak-Fänge</span><span><b>${escapeHtml(topSpecies)}</b> stärkste Phase</span><span><b>${fmtKg(top.weight)}</b> Peak-Gewicht</span><span><b>${avgPerHour}</b> Ø Fänge / h</span><span><b>${activeWindow}</b> aktivstes Zeitfenster</span><span><b>${stability}%</b> Flow Stability</span><span><b>${weatherScoreLabel}</b> Weather Fit</span><span><b>${weatherWindow}</b> Best Conditions</span></div></article>`;
}
function buildPatternSignatureIntelligence(m,activeIndex=-1){
  if(!m.catches.length){
    return `<article class="analytics-intel-visual analytics-signature-intel analytics-intel-v2"><div class="analytics-intel-head"><div><small>Pattern DNA v2</small><h4>Noch keine Erfolgs-DNA</h4></div><span>DNA</span></div><div class="analytics-intel-empty">Mit Fangdaten verknüpft diese Ansicht Spot, Köder, Zeit und Fischart zu automatisch erkannten Erfolgsmustern.</div></article>`;
  }
  const combo=new Map();
  m.catches.forEach(c=>{
    const d=new Date(c.timestamp||c.createdAt);
    const hour=Number.isNaN(d.getTime())?'–':analyticsHourLabel(d.getHours());
    const spot=c.spotLabel||c.location?.label||'Unbekannter Spot';
    const bait=c.bait||'Unbekannter Köder';
    const sp=speciesName(c)||'Unbekannte Art';
    const key=[spot,bait,hour,sp].join('|||');
    const item=combo.get(key)||{spot,bait,hour,species:sp,count:0,weight:0,length:0,catches:[]};
    item.count+=1;item.weight+=Number(c.weightKg||0);item.length+=Number(c.lengthCm||0);item.catches.push(c);combo.set(key,item);
  });
  const patterns=[...combo.values()].map(x=>({...x,score:x.count*4+(x.weight||0)*.75+(x.length/(x.count||1))*0.018})).sort((a,b)=>b.score-a.score).slice(0,6);
  const max=Math.max(...patterns.map(p=>p.score),1);
  const requestedIndex=Number(activeIndex);
  const isMaster=Number.isNaN(requestedIndex)||requestedIndex<0;
  const selectedIndex=isMaster?-1:Math.max(0,Math.min(patterns.length-1,requestedIndex));
  const topFrom=(field,fallback)=>{const map=new Map();patterns.forEach(p=>map.set(p[field],(map.get(p[field])||0)+p.count));return [...map.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||fallback;};
  const best=isMaster?{spot:topFrom('spot','Alle Spots'),bait:topFrom('bait','Alle Köder'),hour:topFrom('hour','Alle Zeiten'),species:topFrom('species','Alle Arten'),count:patterns.reduce((sum,p)=>sum+p.count,0),weight:patterns.reduce((sum,p)=>sum+p.weight,0),length:patterns.reduce((sum,p)=>sum+p.length,0),score:patterns.reduce((sum,p)=>sum+p.score,0),catches:m.catches}:(patterns[selectedIndex]||patterns[0]);
  const dim=[
    {key:'spot',type:'Spot',label:best.spot,x:50,y:21},
    {key:'bait',type:'Köder',label:best.bait,x:74,y:50},
    {key:'hour',type:'Zeit',label:best.hour,x:50,y:79},
    {key:'species',type:'Art',label:best.species,x:26,y:50}
  ];
  const altSource=isMaster?patterns:patterns.filter((_,i)=>i!==selectedIndex);
  const alt=altSource.slice(0,4).map((p,i)=>({label:p.spot===best.spot?p.bait:p.spot,score:p.score,x:[34,66,36,64][i],y:[34,34,66,66][i]}));
  const selectedScale=isMaster?1:analyticsSafePct(best.score/max,.42);
  const links=dim.map(n=>`<line class="dna-link dna-link-main" style="--w:${(1.1+selectedScale*.55).toFixed(2)}" x1="50" y1="50" x2="${n.x}" y2="${n.y}"></line>`).join('')+alt.map(a=>`<line class="dna-link dna-link-alt" style="--w:${(.55+Math.min(1,a.score/max)*.5).toFixed(2)}" x1="50" y1="50" x2="${a.x}" y2="${a.y}"></line>`).join('');
  const pred=isMaster?analyticsPredictionHint(m,'DNA'):{hour:best.hour,label:best.hour,confidence:Math.round(Math.max(0,Math.min(99,(best.score/Math.max(max,1))*100))),species:best.species,bait:best.bait,spot:best.spot,focus:'DNA'};
  const headTitle=isMaster?'Aggregierte Master-Signatur':'Dominante Erfolgs-Signatur';
  const headValue=isMaster?'100%':`${Math.round(best.score/max*100)}%`;
  const centerLabel=isMaster?'Master DNA':'Signature';
  const catchesWithData=best.catches||m.catches||[];
  const avgLength=catchesWithData.length>0?catchesWithData.reduce((sum,c)=>sum+Number(c.lengthCm??c.length_cm??0),0)/catchesWithData.length:null;
  const weatherData=catchesWithData.filter(c=>c.weather_temp_c!=null||c.weather_wind_ms!=null||c.weather_clouds!=null||c.weather_precip_mm!=null);
  const weatherAvg=weatherData.length?(()=>{const avg=key=>weatherData.reduce((sum,c)=>sum+Number(c[key]||0),0)/weatherData.length;return {temp:avg('weather_temp_c'),wind:avg('weather_wind_ms'),clouds:avg('weather_clouds'),rain:avg('weather_precip_mm')};})():null;
  const weatherRing=weatherAvg?`<div class="dna-weather-ring" aria-label="Durchschnittlicher Wetterkontext"><div class="weather-ring-node weather-ring-node-top"><strong>${Math.round(weatherAvg.temp)}°</strong><small>TEMP</small></div><div class="weather-ring-node weather-ring-node-right"><strong>${weatherAvg.wind.toFixed(1).replace('.',',')} m/s</strong><small>WIND</small></div><div class="weather-ring-node weather-ring-node-bottom"><strong>${weatherAvg.rain.toFixed(1).replace('.',',')} mm</strong><small>RAIN</small></div><div class="weather-ring-node weather-ring-node-left"><strong>${Math.round(weatherAvg.clouds)}%</strong><small>CLOUDS</small></div></div>`:'';
  const centerMetric=avgLength==null?'Ø – cm':`Ø ${Math.round(avgLength)} cm`;
  return `<article class="analytics-intel-visual analytics-signature-intel analytics-intel-v2" data-active-signature="${selectedIndex}"><div class="analytics-intel-head"><div><small>Pattern DNA v2 + Prediction</small><h4>${headTitle}</h4></div><span>${headValue}</span></div><div class="dna-v2-stage"><svg viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="xMidYMid meet"><defs><radialGradient id="dnaCoreV2" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="var(--accent)" stop-opacity=".82"/><stop offset="1" stop-color="var(--primary)" stop-opacity=".14"/></radialGradient></defs><circle class="dna-orbit dna-orbit-a" cx="50" cy="50" r="28"></circle><circle class="dna-orbit dna-orbit-b" cx="50" cy="50" r="17"></circle>${links}<circle class="dna-core-v2" cx="50" cy="50" r="7.6"></circle>${alt.map(a=>`<circle class="dna-alt-node" style="--s:${analyticsSafePct(a.score/max,.2).toFixed(2)}" cx="${a.x}" cy="${a.y}" r="${(3.1+Math.min(1,a.score/max)*1.9).toFixed(2)}"></circle>`).join('')}${dim.map(n=>`<circle class="dna-main-node" cx="${n.x}" cy="${n.y}" r="6.1"></circle>`).join('')}</svg>${weatherRing}${dim.map(n=>`<div class="dna-label dna-label-${n.key}" style="left:${n.x}%;top:${n.y}%"><small>${escapeHtml(n.type)}</small><strong>${escapeHtml(n.label)}</strong></div>`).join('')}<div class="dna-center"><small>${centerLabel}</small><strong>${best.count}×</strong><span>${centerMetric}</span></div></div><div class="intel-prediction-card dna-prediction"><small>Prediction Hint</small><strong>${pred?escapeHtml(pred.label):'–'}</strong><span>${pred?`${escapeHtml(pred.spot)} · ${escapeHtml(pred.bait)} · ${pred.confidence}% Muster-Fit`:'Zu wenig Daten für Prognose'}</span></div><div class="signature-rank signature-rank-v2">${patterns.map((p,i)=>`<button type="button" class="signature-rank-item is-clickable ${i===selectedIndex?'is-active':''}" data-signature-index="${i}" style="--rank:${Math.max(.16,p.score/max).toFixed(2)}" aria-pressed="${i===selectedIndex?'true':'false'}"><b>#${i+1}</b>${escapeHtml(p.spot)} · ${escapeHtml(p.bait)} · ${escapeHtml(p.hour)}</button>`).join('')}</div></article>`;
}
function renderAnalyticsIntelligenceVisuals(m,activeSignatureIndex=-1){
  return [buildCatchFlowIntelligence(m),buildPatternSignatureIntelligence(m,activeSignatureIndex)].join('');
}
function getFilteredPremiumAnalyticsModel(){
  const catches=typeof getAnalyticsCatches==='function'?getAnalyticsCatches():(state.catches||[]);
  return buildPremiumAnalyticsModel(catches);
}
let analyticsActiveSignatureIndex=0;
function refreshPatternSignatureIntelligence(activeIndex){
  analyticsActiveSignatureIndex=activeIndex;
  const intelEl=document.getElementById('analyticsIntelligenceGrid');
  const current=intelEl?.querySelector('.analytics-signature-intel');
  if(!intelEl||!current)return;
  const m=getFilteredPremiumAnalyticsModel();
  current.outerHTML=buildPatternSignatureIntelligence(m,activeIndex);
}

const liveCatchPredictionState={lat:null,lng:null,weather:null,loadingWeather:false,pickMode:false,spotType:''};
function liveCatchLatLng(c){
  const lat=Number(c?.location?.lat??c?.lat??c?.latitude);
  const lng=Number(c?.location?.lng??c?.lng??c?.longitude);
  return Number.isFinite(lat)&&Number.isFinite(lng)?{lat,lng}:null;
}
function liveCatchDistanceKm(a,b){
  const R=6371,dLat=(b.lat-a.lat)*Math.PI/180,dLng=(b.lng-a.lng)*Math.PI/180;
  const lat1=a.lat*Math.PI/180,lat2=b.lat*Math.PI/180;
  const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));
}
function liveCatchTimeBucket(value){
  const d=new Date(value||Date.now());
  const h=Number.isNaN(d.getTime())?new Date().getHours():d.getHours();
  if(h>=4&&h<9)return 'Morgen';
  if(h>=9&&h<16)return 'Tag';
  if(h>=16&&h<22)return 'Abend';
  return 'Nacht';
}
function liveCatchTimeScore(c,hour){
  const d=new Date(c.timestamp||c.createdAt);
  if(Number.isNaN(d.getTime()))return .35;
  const diff=Math.abs(d.getHours()-hour);
  return Math.max(0,1-Math.min(diff,24-diff)/12);
}
function liveCatchWeatherScore(c,w){
  if(!w)return .5;
  const parts=[];
  const add=(key,weatherKey,range)=>{const a=Number(c[key]),b=Number(w[weatherKey]);if(Number.isFinite(a)&&Number.isFinite(b))parts.push(Math.max(0,1-Math.abs(a-b)/range));};
  add('weather_temp_c','temperature_2m',14);add('weather_wind_ms','wind_speed_10m',8);add('weather_clouds','cloud_cover',70);add('weather_precip_mm','precipitation',8);
  return parts.length?parts.reduce((s,x)=>s+x,0)/parts.length:.5;
}
function liveCatchPressureDeltaFromWeather(w){
  const delta=Number(w?.pressure_delta_3h??w?.weather_pressure_delta_3h);
  return Number.isFinite(delta)?delta:null;
}
function liveCatchPressureScore(delta){
  const d=Number(delta);
  if(!Number.isFinite(d))return .5;
  if(d<=-2)return .95;
  if(d<=-.5)return .8;
  if(d<.5)return .55;
  if(d<1.5)return .4;
  return .25;
}
function liveCatchPressureLabel(delta){
  const d=Number(delta);
  if(!Number.isFinite(d))return 'Druck offen';
  if(d<=-2)return 'Druck stark ↓';
  if(d<=-.5)return 'Druck ↓';
  if(d<.5)return 'Druck stabil';
  if(d<1.5)return 'Druck ↑';
  return 'Druck stark ↑';
}
function liveCatchPressureDeltaLabel(delta){
  const d=Number(delta);
  return Number.isFinite(d)?`${d>0?'+':''}${d.toFixed(1).replace('.',',')} hPa / 3h`:'';
}

/* Participant Coach v1 – isolated helper layer, uses existing weather + map picker */
const participantCoachState={participantId:null,lat:null,lng:null,weather:null,loading:false,species:'pike',lastContext:null,error:''};
let participantCoachRulesPromise=null;
const PARTICIPANT_COACH_SPECIES=[
  {id:'pike',label:'Hecht'}, {id:'perch',label:'Barsch'}, {id:'zander',label:'Zander'}, {id:'trout',label:'Forelle'}, {id:'cod',label:'Dorsch'}, {id:'other',label:'Andere'}
];
function renderParticipantCoachLauncher(participantId){return `<section class="participant-coach-launcher"><div><p class="eyebrow">Fishing Coach</p><h3>Grimmigen Coach fragen</h3><span>Spot + Wetter + Uhrzeit + Regelwissen als Angel-Tipp.</span></div><button type="button" class="pill participant-coach-open" data-open-participant-coach="${escapeHtml(participantId)}">🎣 Coach öffnen</button></section>`;}
function participantCoachTimeOfDay(value=Date.now()){const d=new Date(value);const h=Number.isNaN(d.getTime())?new Date().getHours():d.getHours();if(h>=4&&h<7)return 'dawn';if(h>=7&&h<11)return 'morning';if(h>=11&&h<14)return 'midday';if(h>=14&&h<17)return 'afternoon';if(h>=17&&h<20)return 'evening';if(h>=20&&h<22)return 'dusk';return 'night';}
function participantCoachTimeLabel(key){return ({dawn:'Morgendämmerung',morning:'Morgen',midday:'Mittag',afternoon:'Nachmittag',evening:'Abend',dusk:'Abenddämmerung',night:'Nacht'}[key]||'Jetzt');}
function participantCoachPressureTrendFromWeather(w){const delta=liveCatchPressureDeltaFromWeather(w);if(delta==null)return null;if(delta<=-2)return 'strong_falling';if(delta<=-.5)return 'falling';if(delta<.5)return 'stable';if(delta<1.5)return 'rising';return 'strong_rising';}
function participantCoachPressureLabel(trend){return ({strong_falling:'stark fallend',falling:'fallend',stable:'stabil',rising:'steigend',strong_rising:'stark steigend'}[trend]||'offen');}
function participantCoachSpeciesLabel(id){return PARTICIPANT_COACH_SPECIES.find(s=>s.id===id)?.label||'Fisch';}
function participantCoachSpotLabel(value){const map={weed:'Kraut',weed_edge:'Krautkante',shallow:'flach',shallow_bay:'flache Bucht',dropoff:'Kante',edge:'Kante',canal:'Kanal',reed_bay:'Schilfbucht',deep:'tiefer Bereich',dying_weed:'absterbendes Kraut',rocky_shore:'felsiges Ufer',inlet:'Einlauf',river_mouth:'Flussmündung'};return map[value]||String(value||'Struktur');}
function participantCoachActivityLabel(value){return ({high:'hoch',medium:'mittel',low:'zäh'}[value]||'offen');}
function participantCoachWeatherContext(){const w=participantCoachState.weather||{};const temp=Number(w.temperature_2m);const wind=Number(w.wind_speed_10m);const pressureDelta=liveCatchPressureDeltaFromWeather(w);return {month:new Date().getMonth()+1,timeOfDay:participantCoachTimeOfDay(),weather_temp_c:Number.isFinite(temp)?temp:null,weather_wind_ms:Number.isFinite(wind)?wind:null,weather_pressure_trend:participantCoachPressureTrendFromWeather(w),pressureDelta};}
function participantCoachRangeFit(value,range){if(value==null||!range)return {score:0,matched:false,missing:true};const v=Number(value),min=Number(range.min),max=Number(range.max);if(!Number.isFinite(v))return {score:0,matched:false,missing:true};const hasMin=Number.isFinite(min),hasMax=Number.isFinite(max);if((!hasMin||v>=min)&&(!hasMax||v<=max))return {score:2,matched:true};let distance=0;if(hasMin&&v<min)distance=min-v;if(hasMax&&v>max)distance=v-max;return {score:Math.max(0,1-(distance/8)),matched:false};}
function participantCoachArrayFit(value,allowed,weight=2){if(!Array.isArray(allowed)||!allowed.length)return {score:0,matched:true,ignored:true};if(value==null)return {score:0,matched:false,missing:true};return allowed.includes(value)?{score:weight,matched:true}:{score:0,matched:false};}
function participantCoachRuleScore(rule,ctx){if(!rule||rule.species!==participantCoachState.species)return null;if(Array.isArray(rule.months)&&rule.months.length&&!rule.months.includes(ctx.month))return null;const conditions=rule.conditions||{};let score=Number(rule.priority||0)*.08+Number(rule.confidence||0)*2;let possible=2;const reasons=[];const timeFit=participantCoachArrayFit(ctx.timeOfDay,conditions.timeOfDay,2);if(!timeFit.ignored){possible+=2;score+=timeFit.score;if(timeFit.matched)reasons.push(participantCoachTimeLabel(ctx.timeOfDay));}const pressureFit=participantCoachArrayFit(ctx.weather_pressure_trend,conditions.weather_pressure_trend,2.4);if(!pressureFit.ignored){possible+=2.4;score+=pressureFit.score;if(pressureFit.matched)reasons.push('Druck '+participantCoachPressureLabel(ctx.weather_pressure_trend));}const tempFit=participantCoachRangeFit(ctx.weather_temp_c,conditions.weather_temp_c);if(conditions.weather_temp_c){possible+=2;score+=tempFit.score;if(tempFit.matched)reasons.push(`${Math.round(ctx.weather_temp_c)}°`);}const windFit=participantCoachRangeFit(ctx.weather_wind_ms,conditions.weather_wind_ms);if(conditions.weather_wind_ms){possible+=1.4;score+=(windFit.score*.7);if(windFit.matched)reasons.push(liveCatchWindLabel(ctx.weather_wind_ms));}return {...rule,_score:score/Math.max(1,possible),_reasons:reasons,_ctx:ctx};}
function participantCoachRegionFor(lat,lng,config){const regions=Array.isArray(config?.regions)?config.regions:[];const geoMatch=regions.find(r=>{const g=r.geo;if(!g)return false;return lat>=Number(g.latMin)&&lat<=Number(g.latMax)&&lng>=Number(g.lngMin)&&lng<=Number(g.lngMax);});return geoMatch||regions.find(r=>r.id==='europe_big')||regions.find(r=>r.id==='default')||regions[0]||null;}
async function loadParticipantCoachRules(){if(!participantCoachRulesPromise){participantCoachRulesPromise=fetch('final_big_coach_rules.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null);}return participantCoachRulesPromise;}
async function buildParticipantCoachInsight(){const lat=Number(participantCoachState.lat),lng=Number(participantCoachState.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))return {status:'no-location'};const config=await loadParticipantCoachRules();if(!config)return {status:'no-rules'};const region=participantCoachRegionFor(lat,lng,config);const ctx=participantCoachWeatherContext();const rules=(region?.rules||[]).map(r=>participantCoachRuleScore(r,ctx)).filter(Boolean).sort((a,b)=>b._score-a._score||Number(b.priority||0)-Number(a.priority||0));const best=rules[0];if(!best)return {status:'no-match',region,ctx};return {status:'ready',region,rule:best,ctx,confidence:Math.round(Math.max(40,Math.min(98,(best._score*100))))};}
function renderParticipantCoachShell(message='Wähle Standort und Zielfisch – dann motzt der Coach los.'){const body=document.getElementById('participantDetailBody');const title=document.getElementById('participantDetailTitle');if(title)title.textContent='Fishing Coach';const hasLoc=Number.isFinite(Number(participantCoachState.lat))&&Number.isFinite(Number(participantCoachState.lng));const lat=hasLoc?Number(participantCoachState.lat).toFixed(5):'–';const lng=hasLoc?Number(participantCoachState.lng).toFixed(5):'–';const speciesOptions=PARTICIPANT_COACH_SPECIES.map(s=>`<option value="${escapeHtml(s.id)}" ${s.id===participantCoachState.species?'selected':''}>${escapeHtml(s.label)}</option>`).join('');if(!body)return;body.innerHTML=`<div class="participant-coach-view"><button type="button" class="pill secondary participant-coach-back" data-participant-coach-back="${escapeHtml(participantCoachState.participantId||'')}">← Zurück zum Teilnehmer</button><section class="participant-coach-hero"><div class="participant-coach-avatar-wrap"><img src="coach.png" alt="Fishing Coach" class="participant-coach-avatar"></div><div><p class="eyebrow">Grimmiger Angel-Coach</p><h2>Was sagt der Fisch?</h2><p class="meta">Spot, Uhrzeit, Wetter und dein Coach-JSON werden live verknüpft.</p></div></section><section class="participant-coach-controls"><div class="coach-location-card"><div><strong>📍 Spot wählen</strong><span>${hasLoc?`${lat}, ${lng}`:'Noch kein Spot gewählt'}</span></div><div class="live-prediction-actions"><button type="button" id="participantCoachUseLocation" class="pill secondary">Aktueller Standort</button><button type="button" id="participantCoachPickMap" class="pill secondary">Auf Karte wählen</button></div></div><label class="live-prediction-spot-row participant-coach-species"><span>🐟 Zielfisch</span><select id="participantCoachSpecies">${speciesOptions}</select></label></section><section id="participantCoachResult" class="participant-coach-result is-muted">${escapeHtml(message)}</section></div>`;}
function renderParticipantCoachResult(result){const el=document.getElementById('participantCoachResult');if(!el)return;if(!result||result.status==='no-location'){el.className='participant-coach-result is-muted';el.innerHTML='Wähle zuerst einen Spot. Ohne Wasser unter der Nase redet der Coach nicht.';return;}if(result.status==='no-rules'){el.className='participant-coach-result is-muted';el.innerHTML='Coach-Regeln konnten nicht geladen werden.';return;}if(result.status==='no-match'){el.className='participant-coach-result is-muted';el.innerHTML=`Für ${escapeHtml(participantCoachSpeciesLabel(participantCoachState.species))} gibt es hier noch keinen starken Match. Tipp vom Alten: Druck, Kante und Köder langsam testen.`;return;}const r=result.rule,ctx=result.ctx;const depth=r.environment_depth_m;const depthText=depth?`${Number(depth.min||0).toFixed(1).replace('.',',')}–${Number(depth.max||0).toFixed(1).replace('.',',')} m`:'flexibel';const spots=(r.environment_spot_type||[]).map(participantCoachSpotLabel).join(' · ')||'Struktur suchen';const pressureDetail=liveCatchPressureDeltaLabel(ctx.pressureDelta);const reason=(r._reasons||[]).slice(0,4).join(' · ');el.className='participant-coach-result';el.innerHTML=`<div class="coach-result-top"><div><small>${escapeHtml(result.region?.name||'Coach-Kontext')} · ${escapeHtml(participantCoachSpeciesLabel(participantCoachState.species))}</small><h3>${escapeHtml(r.insight||'Der Coach hat einen Tipp.')}</h3><span>${escapeHtml(reason||'Aktuelle Bedingungen')} ${pressureDetail?`· ${escapeHtml(pressureDetail)}`:''}</span></div><div class="confidence-badge coach-confidence"><b>${result.confidence}%</b><small>Match</small></div></div><div class="coach-tip-grid"><article><span>🎯 Tiefe</span><strong>${escapeHtml(depthText)}</strong></article><article><span>📍 Struktur</span><strong>${escapeHtml(spots)}</strong></article><article><span>🧲 Köder</span><strong>${escapeHtml(r.action_lure||'Bewährter Köder')}</strong></article><article><span>🎣 Führung</span><strong>${escapeHtml(r.action_technique||'sauber führen')}</strong></article></div><div class="coach-callout"><b>Coach sagt:</b> ${escapeHtml(r.action_retrieve||'Bleib geduldig, variiere Pausen und such aktive Fische.')} <em>Aktivität: ${escapeHtml(participantCoachActivityLabel(r.activity_level))}</em></div>`;}
async function refreshParticipantCoach(){renderParticipantCoachShell(participantCoachState.loading?'Wetter wird geladen…':'Coach denkt nach…');const result=await buildParticipantCoachInsight();renderParticipantCoachResult(result);}
function openParticipantCoach(participantId){participantCoachState.participantId=participantId;participantCoachState.weather=null;participantCoachState.error='';renderParticipantCoachShell();}
async function updateParticipantCoachLocation(lat,lng){participantCoachState.lat=Number(lat);participantCoachState.lng=Number(lng);participantCoachState.loading=true;renderParticipantCoachShell('Wetter wird geladen…');try{if(typeof getWeather==='function'){const data=await getWeather(lat,lng);participantCoachState.weather=enrichWeatherWithPressureDelta(data);}}catch(e){console.warn('Coach Weather fetch fehlgeschlagen',e);}participantCoachState.loading=false;await refreshParticipantCoach();}
function participantCoachOpenMapPicker(){if(typeof useExistingLocationPicker==='function'){useExistingLocationPicker((pos)=>updateParticipantCoachLocation(pos.lat,pos.lng),{title:'Spot für Coach wählen'});return;}const btn=document.getElementById('pickOnMap');if(btn)btn.click();}
function enrichWeatherWithPressureDelta(data){
  const current=data?.current||null;
  if(!current)return null;
  let pressure_delta_3h=null;
  const times=data?.hourly?.time;
  const values=data?.hourly?.pressure_msl;
  const currentPressure=Number(current.pressure_msl);
  const currentTime=new Date(current.time||Date.now()).getTime();
  if(Array.isArray(times)&&Array.isArray(values)&&Number.isFinite(currentPressure)&&Number.isFinite(currentTime)){
    const target=currentTime-(3*3600*1000);
    let bestIndex=-1;
    let bestDiff=Infinity;
    times.forEach((time,index)=>{
      const ts=new Date(time).getTime();
      const diff=Math.abs(ts-target);
      if(Number.isFinite(ts)&&diff<bestDiff){bestDiff=diff;bestIndex=index;}
    });
    const pastPressure=bestIndex>=0?Number(values[bestIndex]):NaN;
    if(Number.isFinite(pastPressure))pressure_delta_3h=currentPressure-pastPressure;
  }
  return {...current,pressure_delta_3h};
}
function liveCatchWindLabel(wind){
  const n=Number(wind);
  if(!Number.isFinite(n))return 'passendem Wind';
  if(n<2)return 'ruhigem Wind';
  if(n<6)return 'leichtem Wind';
  if(n<10)return 'spürbarem Wind';
  return 'starkem Wind';
}
function liveCatchStd(values){
  const nums=values.map(Number).filter(Number.isFinite);
  if(nums.length<2)return 0;
  const avg=nums.reduce((s,n)=>s+n,0)/nums.length;
  return Math.sqrt(nums.reduce((s,n)=>s+(n-avg)**2,0)/nums.length);
}
function liveCatchAvgFit(values,fallback=.5){
  const nums=values.map(Number).filter(Number.isFinite);
  return nums.length?nums.reduce((s,n)=>s+n,0)/nums.length:fallback;
}
function liveCatchPredictionSpotOptions(catches){
  const base=['Krautkante','Totholz','Schilfkante','Freiwasser','Unbekannt'];
  const seen=new Set(base.map(v=>String(v).toLowerCase()));
  const dynamic=(catches||[]).map(c=>c.spotLabel||c.location?.label||'').filter(Boolean).filter(v=>{const key=String(v).toLowerCase();if(seen.has(key))return false;seen.add(key);return true;});
  return [...base,...dynamic];
}
function liveCatchSpotMatchScore(patternSpot,selectedSpot){
  if(!selectedSpot)return null;
  const a=String(patternSpot||'').trim().toLowerCase();
  const b=String(selectedSpot||'').trim().toLowerCase();
  if(!a||!b)return .2;
  return a===b?1:.12;
}
function usePatternEngine(catches,context={}){
  const now=new Date();
  const nowHour=now.getHours();
  const nowBucket=liveCatchTimeBucket(now);
  const loc=context?.location||null;
  const weather=context?.weather||null;
  const selectedSpot=context?.spotType||'';
  const groups=new Map();
  catches.forEach(c=>{
    const spot=c.spotLabel||c.location?.label||'Unbekannter Spot';
    const bait=c.bait||'Bewährter Köder';
    const bucket=liveCatchTimeBucket(c.timestamp||c.createdAt);
    const key=`${spot}__${bait}__${bucket}`;
    if(!groups.has(key))groups.set(key,{spot,bait,timeBucket:bucket,catches:[],catchCount:0,avgLength:0,consistency:0,score:0,contextualScore:0});
    groups.get(key).catches.push(c);
  });
  const patterns=[...groups.values()].map(p=>{
    const lengths=p.catches.map(c=>Number(c.lengthCm||0)).filter(Number.isFinite);
    const avgLength=lengths.length?lengths.reduce((s,n)=>s+n,0)/lengths.length:0;
    const std=liveCatchStd(lengths);
    const consistency=Math.max(0,1-Math.min(std/55,1));
    const timeFit=p.catches.reduce((s,c)=>s+liveCatchTimeScore(c,nowHour),0)/Math.max(1,p.catches.length);
    const currentBucketFit=p.timeBucket===nowBucket?1:.42;
    const weatherFit=liveCatchAvgFit(p.catches.map(c=>liveCatchWeatherScore(c,weather)),weather?.temperature_2m!=null?.5:.5);
    const geoLocationFit=loc?liveCatchAvgFit(p.catches.map(c=>{const ll=liveCatchLatLng(c);return ll?Math.max(0,1-liveCatchDistanceKm(loc,ll)/50):NaN;}),.35):.5;
    const selectedSpotFit=liveCatchSpotMatchScore(p.spot,selectedSpot);
    const locationFit=selectedSpotFit==null?geoLocationFit:selectedSpotFit;
    const spotSemanticFit=selectedSpotFit==null?.5:selectedSpotFit;
    const pressureDelta=liveCatchPressureDeltaFromWeather(weather);
    const pressureFit=liveCatchPressureScore(pressureDelta);
    const score=(p.catches.length*4)+(avgLength*.08)+(consistency*8)+(timeFit*5);
    const contextualScore=score+(currentBucketFit*7)+(timeFit*6)+(weatherFit*6)+(locationFit*5)+(pressureFit*4);
    return {...p,catchCount:p.catches.length,avgLength,consistency,timeFit,currentBucketFit,weatherFit,locationFit,geoLocationFit,spotSemanticFit,pressureFit,pressureDelta,score,contextualScore};
  }).sort((a,b)=>(b.contextualScore||b.score)-(a.contextualScore||a.score)||b.score-a.score);
  return {patterns,bestPattern:patterns[0]||null};
}
function liveCatchConfidence(pattern,totalRelevant){
  if(!pattern)return 0;
  const sizeFactor=Math.min(1,pattern.catchCount/Math.max(3,Math.min(12,totalRelevant||1)));
  const consistencyFactor=pattern.consistency||0;
  const newest=Math.max(...pattern.catches.map(c=>new Date(c.timestamp||c.createdAt).getTime()).filter(Number.isFinite),0);
  const ageDays=newest?Math.max(0,(Date.now()-newest)/86400000):365;
  const recencyFactor=Math.max(0,1-Math.min(ageDays/180,1));
  return Math.min(100,Math.round(((sizeFactor*.4)+(consistencyFactor*.3)+(recencyFactor*.3))*100));
}
function usePredictionEnhancer(existingPrediction,bestPattern,relevantCount){
  if(!bestPattern)return existingPrediction;
  const baseConfidence=liveCatchConfidence(bestPattern,relevantCount);
  const pressureConfidence=Math.round(liveCatchPressureScore(bestPattern.pressureDelta)*100);
  const confidence=Math.max(0,Math.min(100,Math.round((baseConfidence*.85)+(pressureConfidence*.15))));
  return {...(existingPrediction||{}),best:bestPattern.catches[0],pattern:bestPattern,confidence,relevantCount};
}
function liveCatchBestPattern(){
  const loc=Number.isFinite(liveCatchPredictionState.lat)&&Number.isFinite(liveCatchPredictionState.lng)?{lat:liveCatchPredictionState.lat,lng:liveCatchPredictionState.lng}:null;
  const catches=typeof getAnalyticsCatches==='function'?getAnalyticsCatches():(state.catches||[]);
  const relevant=loc?catches.map(c=>({c,ll:liveCatchLatLng(c)})).filter(x=>x.ll&&liveCatchDistanceKm(loc,x.ll)<=50).map(x=>x.c):catches;
  if(!relevant.length)return {status:loc?'no-data':'fallback-empty'};
  const engine=usePatternEngine(relevant,{location:loc,weather:liveCatchPredictionState.weather,spotType:liveCatchPredictionState.spotType});
  const enhanced=usePredictionEnhancer({status:'ready'},engine.bestPattern,relevant.length);
  if(!enhanced.pattern)return {status:'no-data'};
  return {status:'ready',...enhanced,weather:liveCatchPredictionState.weather,locationAware:Boolean(loc),spotType:liveCatchPredictionState.spotType};
}
function liveCatchOpenExistingLocationPicker(){
  if(typeof useExistingLocationPicker==='function'){
    useExistingLocationPicker((pos)=>updateLiveCatchPredictionLocation(pos.lat,pos.lng),{title:'Standort für Prediction wählen'});
    return;
  }
  const btn=document.getElementById('pickOnMap');
  if(btn)btn.click();
}
function renderLiveCatchPrediction(){
  const el=document.getElementById('liveCatchPrediction');
  if(!el)return;
  const hasLoc=Number.isFinite(liveCatchPredictionState.lat)&&Number.isFinite(liveCatchPredictionState.lng);
  const lat=hasLoc?liveCatchPredictionState.lat.toFixed(5):'–';
  const lng=hasLoc?liveCatchPredictionState.lng.toFixed(5):'–';
  const currentCatches=typeof getAnalyticsCatches==='function'?getAnalyticsCatches():(state.catches||[]);
  const spotOptions=liveCatchPredictionSpotOptions(currentCatches);
  const selectedSpot=liveCatchPredictionState.spotType||'';
  const spotSelect=`<label class="live-prediction-spot-row" for="livePredictionSpotType"><span>🎯 Spot-Typ</span><select id="livePredictionSpotType" aria-label="Spot-Typ für Prediction wählen"><option value="">Nicht definiert</option>${spotOptions.map(v=>`<option value="${escapeHtml(v)}" ${v===selectedSpot?'selected':''}>${escapeHtml(v)}</option>`).join('')}</select></label>`;
  const result=liveCatchBestPattern();
  let output='';
  if(result.status==='fallback-empty')output='<div class="live-prediction-output is-muted">Noch zu wenig Daten für eine Pattern-basierte Prediction.</div>';
  else if(result.status==='no-data')output='<div class="live-prediction-output is-muted">Für diesen Standort gibt es mit dem aktuellen Filter noch keine passenden Fangmuster.</div>';
  else{
    const p=result.pattern,w=result.weather;
    const temp=Number(w?.temperature_2m);
    const timePct=Math.round(Math.max(0,Math.min(1,p.timeFit||0))*100);
    const weatherPct=Math.round(Math.max(0,Math.min(1,p.weatherFit||0))*100);
    const locationPct=Math.round(Math.max(0,Math.min(1,p.locationFit||0))*100);
    const pressureDelta=liveCatchPressureDeltaFromWeather(w);
    const pressurePct=Math.round(liveCatchPressureScore(pressureDelta)*100);
    const pressureLabel=liveCatchPressureLabel(pressureDelta);
    const pressureDetail=liveCatchPressureDeltaLabel(pressureDelta);
    const contextLine=`${result.spotType?'Spot gewählt: '+result.spotType:(result.locationAware?'Standortbasiert':'Fallback auf aktuellen Analytics-Filter')} · ${p.catchCount} ähnliche Fänge · Ø ${Math.round(p.avgLength||0)} cm · ${Number.isFinite(temp)?Math.round(temp)+'°':'aktuelle Bedingungen'} / ${liveCatchWindLabel(w?.wind_speed_10m)}${pressureDetail?' · '+pressureDetail:''}`;
    output=`<div class="live-prediction-output live-prediction-contextual"><div><small>🎯 Contextual Prediction</small><strong>${escapeHtml(p.timeBucket)} · ${escapeHtml(p.spot)} · ${escapeHtml(p.bait)}</strong><span>${escapeHtml(contextLine)}</span><div class="context-fit-row"><em>Zeit ${timePct}%</em><em>Wetter ${weatherPct}%</em><em>${result.spotType?'Spot '+locationPct+'%':(result.locationAware?'Nähe '+locationPct+'%':'Spot offen')}</em><em>${escapeHtml(pressureLabel)} ${pressurePct}%</em></div></div><div class="confidence-badge" style="--confidence:${result.confidence}%"><b>${result.confidence}%</b><small>Confidence</small></div></div>`;
  }
  el.innerHTML=`<div class="panel-head live-prediction-head"><div><h3>Live Catch Prediction</h3><span class="meta">Pattern + Standort + aktuelle Zeit + Wetter</span></div></div><div class="live-prediction-location-card"><div><strong>📍 Standort wählen</strong><span>${hasLoc?`${lat}, ${lng}`:'Kein Standort – nutzt aktuellen Filter als Fallback'}</span></div><div class="live-prediction-actions"><button type="button" id="livePredictionUseLocation" class="pill secondary">Aktuell</button><button type="button" id="livePredictionPickMap" class="pill secondary">Karte öffnen</button></div></div>${spotSelect}${output}`;
}
async function updateLiveCatchPredictionLocation(lat,lng){
  liveCatchPredictionState.lat=Number(lat);liveCatchPredictionState.lng=Number(lng);renderLiveCatchPrediction();
  if(typeof getWeather==='function'){
    liveCatchPredictionState.loadingWeather=true;
    const data=await getWeather(lat,lng);
    liveCatchPredictionState.weather=enrichWeatherWithPressureDelta(data);liveCatchPredictionState.loadingWeather=false;renderLiveCatchPrediction();
  }
}


function renderPremiumAnalyticsDashboard(){
  const hero=document.getElementById('analyticsOverviewKpis');
  const summaryEl=document.getElementById('analyticsExecutiveSummary');
  const topEl=document.getElementById('analyticsTopInsights');
  const intelEl=document.getElementById('analyticsIntelligenceGrid');
  if(!hero&&!summaryEl&&!topEl&&!intelEl)return;
  const m=buildPremiumAnalyticsModel();
  const cockpitModel=typeof getFilteredPremiumAnalyticsModel==='function'
    ? getFilteredPremiumAnalyticsModel()
    : m;
  const cockpitLeader=cockpitModel.pStats[0];
  const leader=m.pStats[0];
  const topSpecies=m.species[0];
  const topSpot=m.spots[0];
  const topBait=m.baits[0];
  if(summaryEl){
    summaryEl.textContent=cockpitModel.catches.length
      ? `${cockpitModel.catches.length} Fänge, ${fmtKg(cockpitModel.totalWeight)} Gesamtgewicht und ${cockpitLeader?cockpitLeader.name+' als aktueller Performance-Anker':'noch kein Leader'} – die stärksten Muster sind Zeitfenster, Spot und Köder.`
      : 'Noch keine Fänge vorhanden. Sobald Daten erfasst sind, entsteht hier automatisch das Analytics Cockpit.';
  }
  if(hero){
    hero.innerHTML=[
      ['Fänge',cockpitModel.catches.length,'gesamt analysiert'],
      ['Gewicht',fmtKg(cockpitModel.totalWeight),'kumuliert'],
      ['Ø Länge',`${Math.round(cockpitModel.avgLength||0)} cm`,'pro Fang'],
      ['Beste Zeit',cockpitModel.bestHour.count?`${String(cockpitModel.bestHour.hour).padStart(2,'0')}:00`:'–',cockpitModel.bestHour.count?`${cockpitModel.bestHour.count} Fänge`:'noch offen']
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
    const intelModel=getFilteredPremiumAnalyticsModel();
    intelEl.innerHTML=renderAnalyticsIntelligenceVisuals(intelModel,analyticsActiveSignatureIndex);
  }
}

(function(){
  const originalRerenderAnalyticsView=window.rerenderAnalyticsView||rerenderAnalyticsView;
  if(typeof originalRerenderAnalyticsView==='function'){
    window.rerenderAnalyticsView=function(){
      const result=originalRerenderAnalyticsView.apply(this,arguments);
      renderPremiumAnalyticsDashboard();
      renderLiveCatchPrediction();
      return result;
    };
    try{rerenderAnalyticsView=window.rerenderAnalyticsView;}catch(e){}
  }
  document.addEventListener('click',e=>{
    const item=e.target.closest('.signature-rank-item.is-clickable');
    if(!item||!document.getElementById('analyticsIntelligenceGrid')?.contains(item))return;
    const next=Number(item.dataset.signatureIndex);
    const current=Number(item.closest('.analytics-signature-intel')?.dataset.activeSignature);
    refreshPatternSignatureIntelligence(Number.isFinite(next)?next:0);
  });
  document.addEventListener('click',e=>{
    if(e.target?.id==='livePredictionUseLocation'){
      if(!navigator.geolocation)return alert('Geolocation wird auf diesem Gerät nicht unterstützt.');
      navigator.geolocation.watchPosition(
        pos=>{
          const {latitude,longitude}=pos.coords;
          updateLiveCatchPredictionLocation(latitude,longitude);
        },
        ()=>alert('Standort konnte nicht ermittelt werden. Bitte Berechtigung prüfen.'),
        {
          enableHighAccuracy:true,
          maximumAge:0,
          timeout:5000
        }
      );
    }
    if(e.target?.id==='livePredictionPickMap'){
      liveCatchOpenExistingLocationPicker();
    }
    const coachOpen=e.target.closest?.('[data-open-participant-coach]');
    if(coachOpen){
      openParticipantCoach(coachOpen.dataset.openParticipantCoach);
    }
    const coachBack=e.target.closest?.('[data-participant-coach-back]');
    if(coachBack){
      renderParticipantDetail(coachBack.dataset.participantCoachBack);
    }
    if(e.target?.id==='participantCoachUseLocation'){
      if(!navigator.geolocation)return alert('Geolocation wird auf diesem Gerät nicht unterstützt.');
      navigator.geolocation.getCurrentPosition(pos=>updateParticipantCoachLocation(pos.coords.latitude,pos.coords.longitude),()=>alert('Standort konnte nicht ermittelt werden. Bitte Berechtigung prüfen.'));
    }
    if(e.target?.id==='participantCoachPickMap'){
      participantCoachOpenMapPicker();
    }
  });
  document.addEventListener('change',e=>{
    if(e.target?.id==='livePredictionSpotType'){
      liveCatchPredictionState.spotType=e.target.value||'';
      renderLiveCatchPrediction();
    }
    if(e.target?.id==='participantCoachSpecies'){
      participantCoachState.species=e.target.value||'pike';
      refreshParticipantCoach();
    }
  });
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{renderPremiumAnalyticsDashboard();renderLiveCatchPrediction();},0));
  window.addEventListener('load',()=>setTimeout(()=>{renderPremiumAnalyticsDashboard();renderLiveCatchPrediction();},120));
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
        const btn = L.DomUtil.create("button", "leaflet-bar weather-control topo-control");
        btn.type = "button";
        btn.innerHTML = "⛰";
        btn.style.width = "40px";
        btn.style.height = "40px";
        btn.style.cursor = "pointer";
        btn.setAttribute("aria-label", "Topografische Karte umschalten");
        btn.setAttribute("aria-pressed", "false");
        btn.setAttribute("title", "Topografische Karte umschalten");

        L.DomEvent.on(btn, "click", function (e) {
            L.DomEvent.stopPropagation(e);
            L.DomEvent.preventDefault(e);

            console.log("TOPO CLICK", isTopo);

            if (!isTopo) {
                if (baseLayer) map.removeLayer(baseLayer);
                topoLayer.addTo(map);
                isTopo = true;
                btn.classList.add("active");
                btn.setAttribute("aria-pressed", "true");
            } else {
                map.removeLayer(topoLayer);
                if (baseLayer) baseLayer.addTo(map);
                isTopo = false;
                btn.classList.remove("active");
                btn.setAttribute("aria-pressed", "false");
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
    // NORMALIZATION START (minimal-invasive)
    const maxValues = {
      points: Math.max(0,...pStats.map(p=>p.points||0)),
      catches: Math.max(0,...pStats.map(p=>p.count||0)),
      length: Math.max(0,...pStats.map(p=>p.avgLength||0))
    };
    const norm = (v,m)=> (!m?0:v/m);
    const pStatsNorm = pStats.map(p=>({
      ...p,
      points_n: norm(p.points||0, maxValues.points),
      count_n: norm(p.count||0, maxValues.catches),
      length_n: norm(p.avgLength||0, maxValues.length)
    }));
    // NORMALIZATION END

    analyticsDestroy('performanceDistribution');
    charts.performanceDistribution=new Chart(distribution,{type:'radar',data:{labels,datasets:[{label:'Punkte',data:pStatsNorm.map(p=>p.points_n),borderColor:'#4ad7d1',backgroundColor:'rgba(74,215,209,.16)',pointBackgroundColor:'#4ad7d1',borderWidth:2},{label:'Fänge',data:pStatsNorm.map(p=>p.count_n),borderColor:'#8ff0a7',backgroundColor:'rgba(143,240,167,.10)',pointBackgroundColor:'#8ff0a7',borderWidth:2},{label:'Ø Länge',data:pStatsNorm.map(p=>p.length_n),borderColor:'#ffb84d',backgroundColor:'rgba(255,184,77,.08)',pointBackgroundColor:'#ffb84d',borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,animation:false,plugins:{legend:{display:true,labels:{color:css('--muted'),usePointStyle:true,boxWidth:8,boxHeight:8,font:{size:11,weight:'800'}}},tooltip:{backgroundColor:'rgba(7,17,26,.95)',titleColor:css('--text'),bodyColor:css('--muted'),borderColor:'rgba(255,255,255,.12)',borderWidth:1,padding:12}},scales:{r:{beginAtZero:true,angleLines:{color:'rgba(255,255,255,.08)'},grid:{color:'rgba(255,255,255,.08)'},pointLabels:{color:css('--muted'),font:{size:11,weight:'800'}},ticks:{display:false}}}}});
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
 * It reads the existing Analytics catch selector and never touches the original catch map,
 * marker layer, filters, or map controls.
 */
(function(){
  let analyticsHeatmapMap=null;
  let analyticsHeatmapLayer=null;
  let analyticsHeatmapTileLayer=null;

  function validHeatmapPoints(){
    const catches = typeof getAnalyticsCatches === 'function'
      ? getAnalyticsCatches()
      : (state?.catches || []);

    return catches
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
        this._map = mapInstance;
      
        this._canvas = document.createElement('canvas');
        this._canvas.className = 'analytics-catch-heatmap-canvas';
      
        this._canvas.style.position = 'absolute';
        this._canvas.style.inset = '0';
        this._canvas.style.width = '100%';
        this._canvas.style.height = '100%';
        this._canvas.style.pointerEvents = 'none';
        this._canvas.style.zIndex = '99999';
        this._canvas.style.mixBlendMode = 'normal';
      
        document.getElementById('analyticsCatchHeatmap').appendChild(this._canvas);
      
        mapInstance.on('move zoom moveend zoomend resize viewreset', this._scheduleDraw, this);
        this._scheduleDraw();
      },
      onRemove(mapInstance){
        mapInstance.off('move zoom moveend zoomend resize viewreset', this._scheduleDraw, this);
      
        if(this._frame) cancelAnimationFrame(this._frame);
      
        if(this._canvas && this._canvas.parentNode){
          this._canvas.parentNode.removeChild(this._canvas);
        }
      
        this._canvas = null;
      },
      _scheduleDraw(){
        if(this._frame)cancelAnimationFrame(this._frame);
        this._frame=requestAnimationFrame(()=>this._draw());
      },
      _draw(){
        if(!this._map || !this._canvas) return;
      
        const size = this._map.getSize();
      
        const ratio = window.devicePixelRatio || 1;
      
        // 🔥 PERFORMANCE BOOST: interne Auflösung reduzieren
        const scale = 0.5; // 🔥 MAGIC (0.4–0.6 testen)
      
        const w = Math.max(1, Math.round(size.x * ratio * scale));
        const h = Math.max(1, Math.round(size.y * ratio * scale));
      
        this._canvas.width = w;
        this._canvas.height = h;
        this._canvas.style.width = size.x + 'px';
        this._canvas.style.height = size.y + 'px';
      
        const ctx = this._canvas.getContext('2d');
      
        // 🔥 wichtig: hochskalieren
        ctx.setTransform(ratio * scale,0,0,ratio * scale,0,0);
      
        ctx.clearRect(0,0,size.x,size.y);
      
        const zoom = this._map.getZoom();
        const radius = Math.max(40, Math.pow(2, zoom - 5));
      
        const cellSize = 30;
        const grid = new Map();
      
        this._data.forEach(p => {
          const pt = this._map.latLngToContainerPoint([p.lat, p.lng]);
          if (!pt) return;
      
          const gx = Math.round(pt.x / cellSize);
          const gy = Math.round(pt.y / cellSize);
      
          const key = `${gx}_${gy}`;
          grid.set(key, (grid.get(key) || 0) + 1);
        });
      
        const max = Math.max(1, ...grid.values());
      
        // =========================================================
        // 🔥 PHASE 1: INTENSITY
        // =========================================================
      
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 1;
        ctx.filter = 'blur(25px)';
      
        grid.forEach((count, key) => {
          const [gx, gy] = key.split('_').map(Number);
      
          const x = gx * cellSize;
          const y = gy * cellSize;
      
          let intensity = Math.pow(count / max, 0.35);
          intensity = Math.min(intensity, 0.85);
      
          const gradient = ctx.createRadialGradient(
            x, y, 0,
            x, y, radius
          );
      
          gradient.addColorStop(0, `rgba(255,255,255,${intensity})`);
          gradient.addColorStop(1, `rgba(255,255,255,0)`);
      
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        });
      
        ctx.filter = 'none';
      
        // =========================================================
        // 🎨 PHASE 2: COLORIZE (DEIN ORIGINAL – ABER SCHNELLER)
        // =========================================================
      
        const imageData = ctx.getImageData(0, 0, w, h);
        const pixels = imageData.data;
      
        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3] / 255;
          if (alpha === 0) continue;
      
          let r, g, b;
      
          if (alpha < 0.15) {
            r = 0;
            g = 120 * (alpha / 0.15);
            b = 255;
          } else if (alpha < 0.4) {
            r = 0;
            g = 200;
            b = 255 * (1 - (alpha - 0.15) / 0.25);
          } else if (alpha < 0.7) {
            r = 255 * ((alpha - 0.4) / 0.3);
            g = 255;
            b = 0;
          } else {
            r = 255;
            g = 255 * (1 - (alpha - 0.7) / 0.3);
            b = 0;
          }
      
          pixels[i]     = r;
          pixels[i + 1] = g;
          pixels[i + 2] = b;
        }
      
        ctx.putImageData(imageData, 0, 0);
      
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
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
        scrollWheelZoom:true,
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


/* === Weather UI Injection (safe, append-only) === */
function injectWeatherIntoCatchCards(){
  const cards = document.querySelectorAll('.catch-item');
  const catches = window.state?.catches || [];

  cards.forEach(card => {
    if (card.dataset.weatherInjected) return;

    const catchId = card.dataset.id;
    const match = catches.find(c => c.id === catchId);

    if (!match) return;

    if (
      match.weather_temp_c == null &&
      match.weather_wind_ms == null &&
      !match.weather_condition
    ) return;

    const row = document.createElement('div');
    row.className = 'weather-row';

    if (match.weather_temp_c != null) {
      row.innerHTML += `<div class="weather-chip">🌡 ${Math.round(match.weather_temp_c)}°</div>`;
    }

    if (match.weather_wind_ms != null) {
      row.innerHTML += `<div class="weather-chip">🌬 ${match.weather_wind_ms} m/s</div>`;
    }

    if (match.weather_condition) {
      row.innerHTML += `<div class="weather-chip">${match.weather_icon || '☁️'} ${match.weather_condition}</div>`;
    }

    if (match.weather_pressure_trend) {
  let icon = '';
  let label = '';

  if (match.weather_pressure_trend === 'strong_falling') {
    icon = '📉';
    label = 'Strong Drop';
  } else if (match.weather_pressure_trend === 'falling') {
    icon = '📉';
    label = 'Falling';
  } else if (match.weather_pressure_trend === 'slightly_rising') {
    icon = '📈';
    label = 'Slight Rise';
  } else if (match.weather_pressure_trend === 'rising') {
    icon = '📈';
    label = 'Rising';
  } else {
    icon = '➖';
    label = 'Stable';
  }

  row.innerHTML += `<div class="weather-chip">${icon} ${label}</div>`;
}

    const actions = card.querySelector('.list-actions');
    
    if (actions) {
      card.insertBefore(row, actions);
    } else {
      card.appendChild(row); // fallback (100% safe)
    }
    card.dataset.weatherInjected = "1";
  });
}

setInterval(injectWeatherIntoCatchCards, 800);

/* Live Prediction location picker bridge – reuses existing catch map picker, no second map instance */
(function(){
  if(window.useExistingLocationPicker)return;
  window.useExistingLocationPicker=function(onSelect,opts={}){
    const openBtn=document.getElementById('pickOnMap');
    const confirmBtn=document.getElementById('confirmMapLocation');
    const modal=document.getElementById('mapPickerModal');
    const title=modal?.querySelector('.panel-head h3');
    const latInput=document.querySelector('[name="lat"]');
    const lngInput=document.querySelector('[name="lng"]');
    if(!openBtn||!confirmBtn||!latInput||!lngInput){return;}
    const oldLat=latInput.value,oldLng=lngInput.value,oldTitle=title?title.textContent:'';
    if(title&&opts.title)title.textContent=opts.title;
    const handler=function(){
      setTimeout(()=>{
        const lat=Number(latInput.value),lng=Number(lngInput.value);
        latInput.value=oldLat;lngInput.value=oldLng;
        if(typeof window.updateCatchLocationPreview==='function'&&Number.isFinite(Number(oldLat))&&Number.isFinite(Number(oldLng))){
          window.updateCatchLocationPreview(Number(oldLat),Number(oldLng));
        }
        if(title)title.textContent=oldTitle;
        if(Number.isFinite(lat)&&Number.isFinite(lng)&&typeof onSelect==='function')onSelect({lat,lng});
      },0);
    };
    confirmBtn.addEventListener('click',handler,{once:true});
    openBtn.click();
  };
})();

/* Analytics live prediction picker visibility fix – override bridge only, no map duplication */
(function(){
  window.useExistingLocationPicker=function(onSelect,opts={}){
    const openBtn=document.getElementById('pickOnMap');
    const confirmBtn=document.getElementById('confirmMapLocation');
    const modal=document.getElementById('mapPickerModal');
    const title=modal?.querySelector('.panel-head h3');
    const latInput=document.querySelector('[name="lat"]');
    const lngInput=document.querySelector('[name="lng"]');
    if(!openBtn||!confirmBtn||!modal||!latInput||!lngInput)return;

    const oldLat=latInput.value;
    const oldLng=lngInput.value;
    const oldTitle=title?title.textContent:'';
    const originalParent=modal.parentNode;
    const originalNext=modal.nextSibling;
    let restored=false;

    const restore=()=>{
      if(restored)return;
      restored=true;
      latInput.value=oldLat;
      lngInput.value=oldLng;
      if(typeof window.updateCatchLocationPreview==='function'&&Number.isFinite(Number(oldLat))&&Number.isFinite(Number(oldLng))){
        window.updateCatchLocationPreview(Number(oldLat),Number(oldLng));
      }
      if(title)title.textContent=oldTitle;
      document.body.classList.remove('coach-map-open');
      
      if(originalParent&&modal.parentNode!==originalParent){
        originalParent.insertBefore(modal,originalNext);
      }
    };

    if(title&&opts.title)title.textContent=opts.title;

    document.body.classList.add('coach-map-open');
    
    if(modal.parentNode!==document.body){
      document.body.appendChild(modal);
    }

    const confirmHandler=()=>{
      setTimeout(()=>{
        const lat=Number(latInput.value);
        const lng=Number(lngInput.value);
        restore();
        if(Number.isFinite(lat)&&Number.isFinite(lng)&&typeof onSelect==='function')onSelect({lat,lng});
      },0);
    };

    const closeHandler=(e)=>{
      if(e.target?.id==='closeMapPicker'||e.target===modal){
        setTimeout(restore,0);
      }
    };

    confirmBtn.addEventListener('click',confirmHandler,{once:true});
    modal.addEventListener('click',closeHandler,{once:true});
    openBtn.click();
  };
})();


/* Duell / Schleppmeister Challenge – additive Supabase-backed tournament extension */
(function(){
  const KEY='fishtrack-duel-v2';
  const GPS_INTERVAL_MS=120000;
  const TALK_INTERVAL_MS=150000;
  const fishTiles=[
    {species:'Hecht',points:8},
    {species:'Zander',points:6},
    {species:'Barsch',points:4},
    {species:'Forelle',points:4},
    {species:'Dorsch',points:5},
    {species:'Andere',points:3}
  ];
  const roasts=[
    'Der Alte sagt: Bei dem Tempo überholt euch gleich ein Kormoran mit Rückenschmerzen.',
    'Schleppmeister-Regel 7: Wer nichts fängt, nennt es Gewässeranalyse.',
    'Noch kein Fisch? Perfekt, dann stört wenigstens keiner die Route.',
    'Der Köder läuft gut. Nur die Fische haben offenbar Homeoffice.',
    'Wenn jetzt keiner beisst, liegt es sicher am Luftdruck. Oder am Fahrer. Eher am Fahrer.',
    'Der Kapitän bekommt Bonuspunkte – aber nur, wenn er nicht wie ein Einkaufswagen driftet.'
  ];
  const feedFishStages=[
    {level:1,title:'Fit & Fröhlich',tone:'feed-good',caption:'Top fit und voller Energie!'},
    {level:2,title:'Etwas hungrig',tone:'feed-ok',caption:'Hat etwas Hunger, aber noch okay.'},
    {level:3,title:'Nicht gut drauf',tone:'feed-warn',caption:'Ihm geht’s nicht mehr so gut.'},
    {level:4,title:'Schlecht gelaunt',tone:'feed-warn',caption:'Schon ziemlich mitgenommen.'},
    {level:5,title:'Abgemagert',tone:'feed-danger',caption:'Er hat stark abgebaut.'},
    {level:6,title:'Fast am Ende',tone:'feed-critical',caption:'Es geht ihm richtig schlecht.'},
    {level:7,title:'Tot',tone:'feed-dead',caption:'RIP kleiner Freund.'}
  ];
  const feedRoasts=[
    'Der Alte sagt: Dein Fisch schaut schon, als hätte er den Wetterbericht gelesen.',
    'Fang was. Der kleine Schnauzer-Fisch googelt schon Bestattungsinstitute.',
    'Noch kein Fisch? Dann füttert ihn wenigstens mit Hoffnung. Kalorienarm, aber traurig.',
    'Der Fisch macht nicht schlapp. Er macht nur sehr überzeugend Theater.',
    'Wenn jetzt keiner beisst, stirbt zuerst die Motivation. Danach der Fisch.',
    'Der Fisch sagt: Ich bin nicht wütend, nur enttäuscht. Und hungrig.'
  ];
  function feedFishIntervalMs(s){return Math.max(45000,Number(s.durationMin||15)*60000/6);}
  function feedFishStage(level){return feedFishStages[Math.min(6,Math.max(0,Number(level||1)-1))]||feedFishStages[0];}
  function feedFishDefaultPlayer(){const now=Date.now();return {level:1,lastFedAt:now,lastStageAt:now,resilientUntil:0,mutatedUntil:0,twist:''};}
  function ensureFeedFishState(s){s.feedFish=s.feedFish||{players:{},nextTwistAt:Date.now()+90000,events:[]};[s.captainId,s.opponentId].filter(Boolean).forEach(id=>{if(!s.feedFish.players[id])s.feedFish.players[id]=feedFishDefaultPlayer();});return s.feedFish;}
  function feedFishOwnerIds(s){return [s.captainId,s.opponentId].filter(Boolean);}
  function feedFishProgress(player,s){if(Number(player.level||1)>=7)return 100;return Math.max(0,Math.min(100,((Date.now()-Number(player.lastStageAt||Date.now()))/feedFishIntervalMs(s))*100));}
  function feedFishImageForLevel(level){return `Transformation/Stufe_${feedFishStage(level).level}.png`;}
  function feedFishFinalImageUrl(s){const feed=ensureFeedFishState(s);const levels=feedFishOwnerIds(s).map(id=>Number(feed.players?.[id]?.level||1));const level=levels.length?Math.max(...levels):1;return feedFishImageForLevel(level);}
  function feedFishApplyDecay(s){if(!s.active||s.mode!=='feed')return s;const feed=ensureFeedFishState(s),now=Date.now(),interval=feedFishIntervalMs(s);let changed=false;feedFishOwnerIds(s).forEach(id=>{const p=feed.players[id];if(!p||Number(p.level||1)>=7)return;let elapsed=now-Number(p.lastStageAt||now);if(elapsed<interval)return;if(Number(p.resilientUntil||0)>now){p.lastStageAt=now;p.twist='Resilient! Der Fisch ignoriert den Hunger einfach.';changed=true;return;}const steps=Math.max(1,Math.floor(elapsed/interval));p.level=Math.min(7,Number(p.level||1)+steps);p.lastStageAt=now-Math.max(0,elapsed-(steps*interval));p.twist=p.level>=7?'Oh no. Der Fisch ist hinüber.':(steps>1?`Der Fisch ist während deiner Abwesenheit ${steps} Stufen verkümmert.`:'Der Fisch verkümmert eine Stufe.');changed=true;});if(now>=Number(feed.nextTwistAt||0)){feed.nextTwistAt=now+90000+Math.floor(Math.random()*150000);const ids=feedFishOwnerIds(s);const id=ids[Math.floor(Math.random()*ids.length)];const p=id&&feed.players[id];const r=Math.random();if(p&&r<.20&&Number(p.level||1)<7){p.level=Math.min(7,Number(p.level||1)+1);p.lastStageAt=now;p.twist='Random Krankheit! Der Fisch sieht plötzlich richtig elend aus.';s.lastTalk=`${participantName(id)}s Fisch hat spontan die Lebensfreude verloren. +1 Verkümmerung.`;changed=true;addRemoteEvent(s,'feed_twist',id,{type:'sick',level:p.level});}else if(p&&r<.30){p.resilientUntil=now+interval;p.twist='Resilient! Eine Verkümmerung wird geblockt.';s.lastTalk=`${participantName(id)}s Fisch ist heute aus Stahl. Nächster Schaden wird geblockt.`;changed=true;addRemoteEvent(s,'feed_twist',id,{type:'resilient'});}else if(p&&r<.35){p.level=Math.max(1,Number(p.level||1)-1);p.mutatedUntil=now+interval;p.lastStageAt=now;s.score=s.score||{};s.score[id]=Number(s.score[id]||0)+5;p.twist='Mutation! Der Schnauzer glüht – Bonus +5.';s.lastTalk=`Mutation! ${participantName(id)}s Fisch mutiert zum Biersee-Champion. +5 Punkte.`;changed=true;addRemoteEvent(s,'feed_twist',id,{type:'mutation',bonus:5});}}
    if(s.mode==='feed')s.fishImage=feedFishFinalImageUrl(s);if(changed)saveDuelState(s);return s;}
  function feedFishAfterCatch(s,target,fish){if(s.mode!=='feed'||!target)return;const feed=ensureFeedFishState(s),p=feed.players[target]||feedFishDefaultPlayer();feed.players[target]=p;p.level=Math.max(1,Number(p.level||1)-2);p.lastFedAt=Date.now();p.lastStageAt=Date.now();p.twist=`Gefüttert mit ${fish.species}. Nur dieser Fisch erholt sich.`;s.lastTalk=`${participantName(target)} füttert seinen Fisch mit ${fish.species}. Der Kleine lebt wieder auf.`;addRemoteEvent(s,'feed',target,{species:fish.species,level:p.level});}
  function resetFeedFish(){let s=getDuelState();s.feedFish=null;ensureFeedFishState(s);s.lastTalk='Alle Fische sind frisch gebadet, rasiert und bereit für schlechte Entscheidungen.';saveDuelState(s);updateDuelUi();}
  function activateFeedFishMode(startNow=false){
    let s=ensureDuelParticipants(getDuelState());
    s.mode='feed';
    ensureFeedFishState(s);
    s.lastTalk=s.active?'Feed your Fish ist aktiv. Jetzt zählt jeder eigene Fang.':'Feed your Fish ist scharf gestellt. Starte das Duell und rette die Schnauzer-Fische.';
    saveDuelState(s);
    const mode=document.getElementById('duelModeSelect');
    if(mode)mode.value='feed';
    if(startNow&&!s.active){startDuel();return;}
    updateDuelUi();
  }
  function renderFeedFishUi(){
    const card=document.getElementById('feedFishCard'),grid=document.getElementById('feedFishGrid');
    if(!card||!grid)return;
    let s=getDuelState();
    const modeSelect=document.getElementById('duelModeSelect');
    const selectedMode=modeSelect?.value||s.mode||'trolling';
    const isFeed=selectedMode==='feed'||s.mode==='feed';
    card.classList.toggle('is-feed-active',!!isFeed);
    const activateBtn=document.getElementById('feedFishActivateBtn'),startBtn=document.getElementById('feedFishStartBtn');
    if(activateBtn)activateBtn.classList.toggle('hidden',!!isFeed);
    if(startBtn)startBtn.classList.toggle('hidden',!!s.active||!isFeed);
    if(!isFeed){
      grid.innerHTML='<div class="feed-fish-empty"><b>Feed your Fish ist noch nicht aktiv.</b><br>Tippe auf „Modus aktivieren“ oder wähle oben Feed your Fish. Danach startet das Mini-Game sauber im bestehenden Duell-Modul.</div>';
      return;
    }
    s=ensureDuelParticipants(s);
    s.mode='feed';
    ensureFeedFishState(s);
    if(s.active)s=feedFishApplyDecay(s);
    const intervalMin=Math.round(feedFishIntervalMs(s)/60000);
    const ids=feedFishOwnerIds(s);
    const feed=s.feedFish;
    grid.innerHTML=ids.map(id=>{
      const p=feed.players[id]||feedFishDefaultPlayer();
      feed.players[id]=p;
      const stage=feedFishStage(p.level);
      const progress=s.active?feedFishProgress(p,s):0;
      const remainMs=Math.max(0,feedFishIntervalMs(s)-(Date.now()-Number(p.lastStageAt||Date.now())));
      const toNext=Number(p.level||1)>=7?'Endstation':(s.active?`${Math.ceil(remainMs/60000)} min bis Stufe ${Number(p.level||1)+1}`:'Startet beim Duell-Start');
      return `<article class="feed-fish-player ${stage.tone}"><div class="feed-fish-img-wrap"><img src="Transformation/Stufe_${stage.level}.png" alt="${escapeHtml(stage.title)}" loading="lazy"></div><div class="feed-fish-copy"><div class="feed-fish-player-head"><strong>${escapeHtml(participantAvatar(id))} ${escapeHtml(participantName(id))}</strong><span>Stufe ${stage.level}/7</span></div><h4>${escapeHtml(stage.title)}</h4><p>${escapeHtml(stage.caption)}</p><div class="feed-fish-progress"><i style="width:${progress}%"></i></div><small>${escapeHtml(toNext)} · Verfall-Zyklus ${intervalMin} min${p.twist?` · ${escapeHtml(p.twist)}`:''}</small></div></article>`;
    }).join('')||'<div class="feed-fish-empty">Wähle zwei Teilnehmer, damit jeder einen Fisch bekommt.</div>';
    saveDuelState(s);
  }

  let duelMap=null,duelRoute=null,duelMarkers=[];
  let tickTimer=null,gpsTimer=null,talkTimer=null,leaderboardCache=[];
  function defaultDuelState(){return {duelId:null,active:false,startedAt:null,durationMin:60,captainId:'',opponentId:'',mode:'trolling',score:{},catches:[],route:[],weather:null,lastTalk:roasts[0],endedAt:null,routeSnapshotSvg:null,feedFish:null,fishImage:null,startTimestamp:null};}
  function getDuelState(){try{return {...defaultDuelState(),...(JSON.parse(localStorage.getItem(KEY)||'{}')||{})};}catch{return defaultDuelState();}}
  function saveDuelState(s){localStorage.setItem(KEY,JSON.stringify(s));window.duelState=s;}
  function participant(id){return (state.participants||[]).find(p=>p.id===id)||null;}
  function participantName(id){return participant(id)?.name||'–';}
  function participantAvatar(id){return participant(id)?.avatar||'🎣';}
  function isUuid(v){return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(v||''));}
  function ensureDuelParticipants(s){const ps=state.participants||[];if(!s.captainId&&ps[0])s.captainId=ps[0].id;if(!s.opponentId&&ps[1])s.opponentId=ps[1].id;if(s.captainId===s.opponentId&&ps.find(p=>p.id!==s.captainId))s.opponentId=ps.find(p=>p.id!==s.captainId).id;return s;}
  function routeDistanceKm(route){let km=0;for(let i=1;i<route.length;i++)km+=distanceKm(route[i-1],route[i]);return km;}
  function distanceKm(a,b){const R=6371,toRad=x=>x*Math.PI/180;const dLat=toRad(Number(b.lat)-Number(a.lat));const dLng=toRad(Number(b.lng)-Number(a.lng));const lat1=toRad(Number(a.lat)),lat2=toRad(Number(b.lat));const h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;return 2*R*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
  function elapsedHours(s){if(!s.startedAt)return 0;const end=s.endedAt?new Date(s.endedAt).getTime():Date.now();return Math.max(0,(end-new Date(s.startedAt).getTime())/3600000);}
  function avgSpeed(s){const h=elapsedHours(s);return h>0?routeDistanceKm(s.route||[])/h:0;}
  function speedBonus(s){if(s.mode!=='trolling')return 0;const speed=avgSpeed(s);if(!speed)return 0;let bonus=0;if(speed>=2.0&&speed<=4.0)bonus+=4;else if(speed>=1.5&&speed<=4.8)bonus+=2;if(Number(s.weather?.wind_ms||99)<=6)bonus+=2;return bonus;}
  function captainBonus(s){return s.mode==='trolling'&&s.startedAt?5:0;}
  function totalScore(s,id){return Number(s.score?.[id]||0)+(id===s.captainId?captainBonus(s)+speedBonus(s):0);}
  function formatTime(ms){const total=Math.max(0,Math.ceil(ms/1000));const m=Math.floor(total/60),sec=total%60;return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function remainingMs(s){if(!s.active||!s.startedAt)return Number(s.durationMin||60)*60000;return Math.max(0,new Date(s.startedAt).getTime()+Number(s.durationMin||60)*60000-Date.now());}
  function routeSnapshotSvg(route){
    const pts=(route||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng)));
    const w=720,h=280,pad=34;
    if(!pts.length)return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" rx="28" fill="#08111b"/><text x="50%" y="50%" text-anchor="middle" fill="#9db0c3" font-family="Arial" font-size="18">Noch keine Route gespeichert</text></svg>`;
    const lats=pts.map(p=>Number(p.lat)),lngs=pts.map(p=>Number(p.lng));
    let minLat=Math.min(...lats),maxLat=Math.max(...lats),minLng=Math.min(...lngs),maxLng=Math.max(...lngs);
    if(minLat===maxLat){minLat-=.002;maxLat+=.002} if(minLng===maxLng){minLng-=.002;maxLng+=.002}
    const xy=p=>{const x=pad+((Number(p.lng)-minLng)/(maxLng-minLng))*(w-pad*2);const y=h-pad-((Number(p.lat)-minLat)/(maxLat-minLat))*(h-pad*2);return [x,y]};
    const poly=pts.map(p=>xy(p).map(n=>n.toFixed(1)).join(',')).join(' ');
    const [sx,sy]=xy(pts[0]),[ex,ey]=xy(pts[pts.length-1]);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><defs><radialGradient id="bg" cx="20%" cy="0%" r="90%"><stop offset="0" stop-color="#13394a"/><stop offset="1" stop-color="#08111b"/></radialGradient><filter id="glow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><rect width="100%" height="100%" rx="28" fill="url(#bg)"/><path d="M${pad} ${h-pad} C${w*.32} ${h*.64} ${w*.62} ${h*.34} ${w-pad} ${pad}" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="22" stroke-linecap="round"/><polyline points="${poly}" fill="none" stroke="#4ad7d1" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" filter="url(#glow)"/><circle cx="${sx.toFixed(1)}" cy="${sy.toFixed(1)}" r="9" fill="#ffb84d" stroke="#fff" stroke-width="3"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="11" fill="#8ff0a7" stroke="#fff" stroke-width="3"/><text x="${pad}" y="26" fill="#eef6ff" font-family="Arial" font-size="15" font-weight="700">${pts.length} GPS-Punkte · ${routeDistanceKm(pts).toFixed(2)} km</text></svg>`;
  }
  function svgDataUrl(svg){return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;}
  function normalizeDuelRoute(route){return (route||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).map(p=>({lat:Number(p.lat),lng:Number(p.lng),timestamp:p.timestamp||p.at||p.created_at||new Date().toISOString(),accuracy:p.accuracy??p.accuracy_m??null,speed_ms:p.speed_ms??null,demo:!!p.demo}));}
  function mergeDuelFishState(...states){return states.reduce((acc,item)=>{if(!item)return acc;let value=item;if(typeof value==='string'){try{value=JSON.parse(value);}catch(e){value=null;}}if(Array.isArray(value))return {...acc,players:value};if(value&&typeof value==='object')return {...acc,...value};return acc;},{});}
  function extractDuelRoute(d){const trackRoute=(d?.tracks||[]).map(t=>({lat:t.lat,lng:t.lng,timestamp:t.created_at,accuracy:t.accuracy_m??null,speed_ms:t.speed_ms??null}));if(trackRoute.length)return normalizeDuelRoute(trackRoute);const fs=mergeDuelFishState(d?.fish_state,d?.result?.fish_state);return normalizeDuelRoute(fs.gps_route||d?.result?.gps_route||[]);}
  function buildDuelResult(s){const route=normalizeDuelRoute(s.route||[]);const winner=[s.captainId,s.opponentId].filter(Boolean).sort((a,b)=>totalScore(s,b)-totalScore(s,a))[0]||null;const fishState=mergeDuelFishState(s.fishState,s.feedFish?.players);if(route.length)fishState.gps_route=route;return {winner_id:winner,winner_name:participantName(winner),captain_bonus:captainBonus(s),speed_bonus:speedBonus(s),avg_speed_kmh:Number(avgSpeed(s).toFixed(2)),distance_km:Number(routeDistanceKm(route).toFixed(3)),route_points:route.length,score:s.score||{},catches:s.catches||[],gps_route:route,route_snapshot_svg:s.routeSnapshotSvg||routeSnapshotSvg(route),fish_image:s.fishImage||null,feed_snapshot:s.feedFish||null,fish_state:fishState};}
  async function createRemoteDuel(s){
    if(!db||s.duelId)return s;
    try{
      const isFeed=s.mode==='feed';const payload={title:isFeed?'Feed your Fish Duell':'Schleppmeister Duell',duel_type:isFeed?'feed_your_fish':(s.mode==='trolling'?'trolling_master':'blitz'),status:'active',duration_minutes:Number(s.durationMin||60),captain_id:isUuid(s.captainId)?s.captainId:null,start_time:s.startedAt,target_species:fishTiles.map(f=>f.species),settings:{mode:s.mode}};if(isFeed){payload.fish_image=s.fishImage||feedFishFinalImageUrl(s);payload.feed_snapshot=s.feedFish||null;payload.fish_state=s.feedFish?.players||null;}
      if(isUuid(activeTournamentId))payload.tournament_id=activeTournamentId;
      const {data,error}=await db.from('duels').insert(payload).select('id').single();
      if(error)throw error;
      s.duelId=data.id;
      await syncRemoteParticipants(s);
      await addRemoteEvent(s,'system',null,{message:'Duell gestartet',mode:s.mode});
      saveDuelState(s);
      renderDuelLeaderboard();
    }catch(e){console.warn('Duell konnte nicht in Supabase erstellt werden',e);}
    return s;
  }
  async function syncRemoteParticipants(s){
    if(!db||!s.duelId)return;
    const rows=[s.captainId,s.opponentId].filter(Boolean).map(id=>({duel_id:s.duelId,participant_id:id,display_name:participantName(id),is_captain:id===s.captainId,score:Number(s.score?.[id]||0),bonus_score:id===s.captainId?captainBonus(s)+speedBonus(s):0,catches_count:(s.catches||[]).filter(c=>c.participantId===id).length}));
    if(!rows.length)return;
    const {error}=await db.from('duel_participants').upsert(rows,{onConflict:'duel_id,participant_id'});
    if(error)console.warn('Duell Teilnehmer Sync fehlgeschlagen',error);
  }
  async function addRemoteEvent(s,event_type,participant_id,payload){
    if(!db||!s.duelId)return;
    const {error}=await db.from('duel_events').insert({duel_id:s.duelId,participant_id:participant_id||null,event_type,payload:payload||{}});
    if(error)console.warn('Duell Event Sync fehlgeschlagen',error);
  }
  async function addRemoteTrack(s,point){
    if(!db||!s.duelId||!point)return;
    const {error}=await db.from('duel_tracks').insert({duel_id:s.duelId,participant_id:s.captainId||null,lat:Number(point.lat),lng:Number(point.lng),accuracy_m:point.accuracy??null,speed_ms:point.speed_ms??null,weather_temp_c:s.weather?.temp_c??null,weather_wind_ms:s.weather?.wind_ms??null,weather_pressure_hpa:s.weather?.pressure_hpa??null,created_at:point.at||new Date().toISOString()});
    if(error)console.warn('Duell Track Sync fehlgeschlagen',error);
  }
  async function finishRemoteDuel(s){
    if(!db||!s.duelId)return;
  
    const result = buildDuelResult(s);
  
    let safeFishImage = null;
    
    // 🔥 IMMER Upload priorisieren
    if (s.imageUrl) {
      safeFishImage = s.imageUrl;
    }
    
    // fallback
    else if (s.fishImage && s.fishImage.startsWith('data:image')) {
      safeFishImage = s.fishImage;
    }
    
    // letzter fallback SVG
    else if (s.routeSnapshotSvg && s.routeSnapshotSvg.includes('<svg')) {
      const svg = svgDataUrl(s.routeSnapshotSvg);
      if (svg.length < 500000) {
        safeFishImage = svg;
      }
    }
    
    // 2. fallback: imageUrl
    else if (s.imageUrl && (s.imageUrl.startsWith('http') || s.imageUrl.startsWith('data:image'))) {
      safeFishImage = s.imageUrl;
    }
    
    // 3. fallback: SVG → nur wenn gültig
    else if (s.routeSnapshotSvg && s.routeSnapshotSvg.includes('<svg')) {
      try {
        const svg = svgDataUrl(s.routeSnapshotSvg);
    
        // 🔥 Size Guard (wichtig!)
        if (svg.length < 500000) { // ~500kb limit
          safeFishImage = svg;
        } else {
          console.warn('SVG zu gross – wird nicht gespeichert');
        }
      } catch(e) {
        console.warn('SVG conversion failed', e);
      }
    }
  
    let existingDuel = null;
    try{
      const current = await db.from('duels').select('fish_state,feed_snapshot,result,fish_image,image_url').eq('id', s.duelId).maybeSingle();
      existingDuel = current?.data || null;
    }catch(e){console.warn('Bestehende Duell-Daten konnten nicht gelesen werden', e);}

    const routePoints = normalizeDuelRoute(s.route || []);
    const mergedFishState = mergeDuelFishState(existingDuel?.fish_state, existingDuel?.result?.fish_state, result.fish_state);
    if(routePoints.length) mergedFishState.gps_route = routePoints;

    const mergedResult = {
      ...(existingDuel?.result || {}),
      ...result,
      fish_state: mergedFishState
    };
    if(routePoints.length) mergedResult.gps_route = routePoints;

    const updatePayload = {
      status: 'finished',
      end_time: s.endedAt,
      result: mergedResult,
      image_url: s.imageUrl || safeFishImage || existingDuel?.image_url || null,
    
      // 👉 HIER IST DEIN FIX
      fish_image:
        s.imageUrl ||
        safeFishImage ||
        existingDuel?.fish_image ||
        null,
    
      fish_state: mergedFishState
    };
  
    if(s.mode === 'feed'){
      updatePayload.duel_type = 'feed_your_fish';
      updatePayload.fish_image =
        (s.fishImage && s.fishImage.length > 20 ? s.fishImage : null) ||
        feedFishFinalImageUrl(s) ||
        safeFishImage ||
        existingDuel?.fish_image ||
        null;
      updatePayload.feed_snapshot = s.feedFish || existingDuel?.feed_snapshot || null;
      updatePayload.fish_state = mergeDuelFishState(mergedFishState, s.feedFish?.players, routePoints.length ? {gps_route:routePoints} : null);
      updatePayload.result = {...mergedResult, fish_state:updatePayload.fish_state};
    }
  
    console.log("Saved fish_image:", updatePayload.fish_image?.slice(0,80), "route points:", routePoints.length);
    
    const {error} = await db
      .from('duels')
      .update(updatePayload)
      .eq('id', s.duelId);
  
    if(error) console.warn('Duell Abschluss Sync fehlgeschlagen', error);
  
    await syncRemoteParticipants(s);
    await addRemoteEvent(s,'system',null,{message:'Duell beendet',result});
    loadDuelLeaderboard();
  }
  async function loadDuelLeaderboard(){
    if(!db){renderDuelLeaderboard();return;}
    try{
      const {data:duels,error}=await db.from('duels').select('*').order('created_at',{ascending:false}).limit(24);
      if(error)throw error;
      const ids=(duels||[]).map(d=>d.id);
      let participants=[],tracks=[];
      if(ids.length){
        const pr=await db.from('duel_participants').select('*').in('duel_id',ids);
        const tr=await db.from('duel_tracks').select('*').in('duel_id',ids).order('created_at',{ascending:true});
        participants=pr.data||[];tracks=tr.data||[];
      }
      leaderboardCache=(duels||[]).map(d=>({...d,participants:participants.filter(p=>p.duel_id===d.id),tracks:tracks.filter(t=>t.duel_id===d.id)}));
      renderDuelLeaderboard();
    }catch(e){console.warn('Duell Rangliste konnte nicht geladen werden',e);renderDuelLeaderboard();}
  }
  function renderDuelLeaderboard(){
    const el=document.getElementById('duelLeaderboard');if(!el)return;
    const local=getDuelState();
    const localResult=buildDuelResult(local);
    const localEntry=local.startedAt?{id:local.duelId||'local',status:local.active?'active':'finished',created_at:local.startedAt,end_time:local.endedAt,duel_type:local.mode==='feed'?'feed_your_fish':undefined,result:localResult,image_url:local.imageUrl,fish_image:local.fishImage,fish_state:localResult.fish_state,participants:[local.captainId,local.opponentId].filter(Boolean).map(id=>({participant_id:id,display_name:participantName(id),score:Number(local.score?.[id]||0),bonus_score:id===local.captainId?captainBonus(local)+speedBonus(local):0,catches_count:(local.catches||[]).filter(c=>c.participantId===id).length,is_captain:id===local.captainId})),tracks:local.route||[]}:null;
    const entries=[...(localEntry?[localEntry]:[]),...leaderboardCache.filter(d=>d.id!==local.duelId)];
    if(!entries.length){el.innerHTML='<div class="meta">Noch keine Duelle gespeichert.</div>';return;}
    el.innerHTML=entries.map(d=>{
      const result=d.result||{};
      const tracks=extractDuelRoute(d);
      const svg=result.route_snapshot_svg||routeSnapshotSvg(tracks);
      const parts=(d.participants||[]).slice().sort((a,b)=>(Number(b.score||0)+Number(b.bonus_score||0))-(Number(a.score||0)+Number(a.bonus_score||0)));
      const rows=parts.map((p,i)=>`<div class="duel-history-row"><span>#${i+1} ${escapeHtml(p.display_name||participantName(p.participant_id))}${p.is_captain?' · Kapitän':''}</span><b>${Number(p.score||0)+Number(p.bonus_score||0)} P</b></div>`).join('');
      const date=d.created_at?fmtDateTime(d.created_at):'–';
      const meta=`${date} · ${result.distance_km??(tracks.length?routeDistanceKm(tracks).toFixed(2):'0')} km · Ø ${result.avg_speed_kmh??'–'} km/h`;
      const routeImageUrl = tracks.length
        ? svgDataUrl(routeSnapshotSvg(tracks))
        : null;
      
      const imageUrl =
        d.fish_image ||
        d.result?.fish_image ||
        d.image_url ||
        d.result?.image_url ||
        routeImageUrl ||
        svgDataUrl(svg);
            
      console.log("Render Image URL:", imageUrl?.slice(0,80));
      console.log("DUEL OBJECT:", d);    
      const image = imageUrl
        ? `<button class="duel-photo-button" type="button" data-duel-map-image="${escapeHtml(imageUrl)}" aria-label="Gespeicherte Duell-Karte öffnen"><img class="duel-photo" src="${imageUrl}" alt="Gespeicherte Duell-Karte" onerror="this.closest('.duel-photo-button')?.remove()"></button>`
        : '';
      
      return `<article class="duel-history-entry">
        <div class="duel-history-copy">
          <strong>${d.status==='active'?'Live Duell':'Duell abgeschlossen'}</strong>
          <small>${escapeHtml(meta)}</small>
          ${rows || '<div class="meta">Keine Teilnehmerdaten.</div>'}
        </div>
      
        <div class="duel-photo-container">
          ${image}
          
        </div>
      </article>`;
    }).join('');
  }
  function renderDuelSection(){
    const panel=document.getElementById('duelPanel');if(!panel)return;
    let s=ensureDuelParticipants(getDuelState());saveDuelState(s);
    const captain=document.getElementById('duelCaptainSelect'),opponent=document.getElementById('duelOpponentSelect'),catcher=document.getElementById('duelCatchParticipantSelect');
    const options=(state.participants||[]).map(p=>`<option value="${escapeHtml(p.id)}">${escapeHtml(p.avatar||'🎣')} ${escapeHtml(p.name)}</option>`).join('');
    [captain,opponent,catcher].forEach(sel=>{if(sel&&sel.innerHTML!==options)sel.innerHTML=options;});
    if(captain)captain.value=s.captainId||'';
    if(opponent)opponent.value=s.opponentId||'';
    if(catcher)catcher.value=s.captainId||s.opponentId||'';
    const dur=document.getElementById('duelDurationSelect');if(dur)dur.value=String(s.durationMin||60);
    const mode=document.getElementById('duelModeSelect');if(mode)mode.value=s.mode||'trolling';
    if((s.mode||'trolling')==='feed'){ensureFeedFishState(s);saveDuelState(s);}
    updateDuelUi();
    renderDuelLeaderboard();
    setTimeout(initDuelMap,80);
  }
  function updateDuelUi(){
    const s=getDuelState();
    const pill=document.getElementById('duelStatusPill');
    if(pill){pill.textContent=s.active?'Live':(s.endedAt?'Beendet':'Bereit');pill.classList.toggle('is-live',!!s.active);pill.classList.toggle('is-ended',!!s.endedAt&&!s.active);}
    const timer=document.getElementById('duelTimer');if(timer)timer.textContent=formatTime(remainingMs(s));
    const sp=document.getElementById('duelAvgSpeed');if(sp)sp.textContent=(avgSpeed(s)||0).toFixed(1).replace('.',',')+' km/h';
    const weather=document.getElementById('duelWeather');if(weather)weather.textContent=s.mode==='feed'?'Fischpflege':(s.weather?`${Math.round(Number(s.weather.temp_c||0))}° · ${Number(s.weather.wind_ms||0).toFixed(1).replace('.',',')} m/s`:'–');
    const talk=document.getElementById('duelTrashTalk');if(talk)talk.textContent=s.lastTalk||roasts[0];
    const scoreText=document.getElementById('duelScoreText');if(scoreText)scoreText.textContent=`${totalScore(s,s.captainId)} : ${totalScore(s,s.opponentId)}`;
    const scoreList=document.getElementById('duelScoreList');
    if(scoreList){
      const rows=[s.captainId,s.opponentId].filter(Boolean).map(id=>`<article class="duel-score-entry"><div><strong>${escapeHtml(participantAvatar(id))} ${escapeHtml(participantName(id))}${id===s.captainId?' · Kapitän':''}</strong><small>${(s.catches||[]).filter(c=>c.participantId===id).length} Fänge${id===s.captainId?` · Bonus ${captainBonus(s)+speedBonus(s)}`:''}</small></div><b>${totalScore(s,id)} P</b></article>`).join('');
      scoreList.innerHTML=rows||'<div class="meta">Wähle zwei Teilnehmer.</div>';
    }
    const tiles=document.getElementById('duelFishTiles');
    if(tiles&&!tiles.dataset.ready){tiles.innerHTML=fishTiles.map(f=>`<button type="button" class="duel-fish-tile" data-duel-fish="${escapeHtml(f.species)}"><b>${escapeHtml(f.species)}</b><small>+${f.points} P</small></button>`).join('');tiles.dataset.ready='1';}
    updateDuelMap();
    renderFeedFishUi();
    renderDuelLeaderboard();
  }
  function initDuelMap(){
    const el=document.getElementById('duelMap');if(!el||duelMap||typeof L==='undefined')return;
    duelMap=L.map(el,{zoomControl:true,attributionControl:false}).setView([59.442773,11.654906],8);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(duelMap);
    duelRoute=L.polyline([], {color:'#4ad7d1',weight:5,opacity:.85}).addTo(duelMap);
    setTimeout(()=>duelMap.invalidateSize(),120);
    updateDuelMap();
  }
  function updateDuelMap(){
    if(!duelMap||!duelRoute)return;const s=getDuelState();const pts=(s.route||[]).filter(p=>Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lng))).map(p=>[Number(p.lat),Number(p.lng)]);
    duelRoute.setLatLngs(pts);duelMarkers.forEach(m=>duelMap.removeLayer(m));duelMarkers=[];
    pts.forEach((pt,i)=>{if(i!==0&&i!==pts.length-1)return;duelMarkers.push(L.circleMarker(pt,{radius:i===pts.length-1?9:6,color:'#fff',fillColor:i===0?'#ffb84d':'#8ff0a7',fillOpacity:.9,weight:3,className:'duel-route-marker'}).addTo(duelMap).bindPopup(i===0?'Start':'Aktuell'));});
    if(pts.length)duelMap.fitBounds(L.latLngBounds(pts).pad(.25),{maxZoom:14});
    const meta=document.getElementById('duelMapMeta');if(meta)meta.textContent=pts.length?`${pts.length} GPS-Punkte · ${routeDistanceKm(s.route||[]).toFixed(2)} km Route · Punkte alle 2 Min.`:'Noch keine Route – GPS starten oder Punkt setzen.';
  }
  function startTimers(){stopTimers();tickTimer=setInterval(()=>{let s=getDuelState();if(s.active&&s.mode==='feed')s=feedFishApplyDecay(s);if(s.active&&remainingMs(s)<=0){endDuel();return;}updateDuelUi();},1000);gpsTimer=setInterval(addGpsPoint,GPS_INTERVAL_MS);talkTimer=setInterval(()=>{const s=getDuelState();const pool=s.mode==='feed'?[...roasts,...feedRoasts]:roasts;s.lastTalk=pool[Math.floor(Math.random()*pool.length)];saveDuelState(s);addRemoteEvent(s,'message',null,{message:s.lastTalk});updateDuelUi();},TALK_INTERVAL_MS);}
  function stopTimers(){[tickTimer,gpsTimer,talkTimer].forEach(t=>{if(t)clearInterval(t)});tickTimer=gpsTimer=talkTimer=null;}
  async function startDuel(){
    let s=ensureDuelParticipants(getDuelState());
  
    const cap=document.getElementById('duelCaptainSelect')?.value,
          opp=document.getElementById('duelOpponentSelect')?.value,
          selectedMode=document.getElementById('duelModeSelect')?.value||'trolling';
  
    if(!cap||!opp||cap===opp){
      alert('Bitte zwei unterschiedliche Teilnehmer wählen.');
      return;
    }
  
    const startIso=new Date().toISOString();
  
    s={
      ...defaultDuelState(),
      active:true,
      startedAt:startIso,
      startTimestamp:startIso,
      durationMin:Number(document.getElementById('duelDurationSelect')?.value||60),
      captainId:cap,
      opponentId:opp,
      mode:selectedMode,
      score:{[cap]:0,[opp]:0},
      lastTalk:selectedMode==='feed'
        ?'Feed your Fish läuft. Fang was, bevor der Schnauzer-Fisch dramatisch stirbt.'
        :'Leinen raus. Der Schleppmeister wird jetzt amtlich vermessen.'
    };
  
    if(selectedMode==='feed'){
      ensureFeedFishState(s);
      s.fishImage=feedFishFinalImageUrl(s);
    }
  
    saveDuelState(s);
  
    // 🔥 wichtig: remote duel erstellen
    s=await createRemoteDuel(s);
  
    // 🔥 NEU: ROUTE AUS DB LADEN (bei Reload / Resume)
    if(db && s.duelId){
      try{
        const {data}=await db
          .from('duel_tracks')
          .select('*')
          .eq('duel_id',s.duelId)
          .order('created_at',{ascending:true});
  
        if(data && data.length){
          s.route=data.map(p=>({lat:p.lat,lng:p.lng}));
          saveDuelState(s);
        }
      }catch(e){}
    }
  
    startTimers();
  
    // 🔥 FIX: nur initialen Punkt setzen wenn KEINE Route existiert
    if(!s.route || !s.route.length){
      addGpsPoint();
    }
  
    updateDuelUi();
  }
  async function endDuel(){
    let s = getDuelState();
  
    s.active = false;
    s.endedAt = new Date().toISOString();
  
    // Route Snapshot (Fallback)
    s.routeSnapshotSvg = routeSnapshotSvg(s.route || []);
  
    if (s.mode === 'feed') {
      s = feedFishApplyDecay(s);
      s.fishImage = feedFishFinalImageUrl(s);
    }
  
    s.lastTalk = s.mode === 'feed'
      ? 'Abpfiff. Wer seinen Fisch lebend heimbringt, darf ihn morgen wieder enttäuschen.'
      : 'Abpfiff. Jetzt zählen nur noch Punkte, Ausreden und wer den Kescher vergessen hat.';  

    stopTimers();
    updateDuelUi();
  
    // 🔥 warten bis Map fertig gerendert ist
    await new Promise(r => setTimeout(r, 300));
    
    // optional stärker:
    if (duelMap) {
      duelMap.invalidateSize();
    }
    
    await new Promise(r => setTimeout(r, 300));
    
    const svg = routeSnapshotSvg(s.route || []);
    const svgUrl = svgDataUrl(svg);
    
    s.fishImage = svgUrl;
  
    console.log("UPLOAD RESULT:", uploadedUrl);
  
    // ✅ wenn Upload klappt → echtes Bild nutzen
    if (uploadedUrl) {
      s.imageUrl = uploadedUrl;
      s.fishImage = uploadedUrl;
    } 
    // ❗ fallback NUR wenn Upload scheitert
    else if (s.routeSnapshotSvg) {
      s.fishImage = svgDataUrl(s.routeSnapshotSvg);
    }

    saveDuelState(s);
    updateDuelUi();
  
    await finishRemoteDuel(s);
  }
async function addGpsPoint(){
  let s=getDuelState();
  if(!s.active)return;

  const got=await new Promise(resolve=>{
    if(!navigator.geolocation)return resolve(null);
    navigator.geolocation.getCurrentPosition(
      pos=>resolve({
        lat:pos.coords.latitude,
        lng:pos.coords.longitude,
        at:new Date().toISOString(),
        accuracy:pos.coords.accuracy,
        speed_ms:pos.coords.speed
      }),
      ()=>resolve(null),
      {enableHighAccuracy:true,timeout:9000,maximumAge:20000}
    );
  });

  let point=got;
  
  // 🔥 FIX: State nach await neu holen + erneut prüfen
  s = getDuelState();
  if(!s.active) return;
  
  if(!point){
    const last=(s.route||[]).slice(-1)[0]||{lat:59.442773,lng:11.654906};
    point={
      lat:Number(last.lat)+(Math.random()-.45)*.006,
      lng:Number(last.lng)+(.004+Math.random()*.004),
      at:new Date().toISOString(),
      demo:true
    };
  }

  // ✅ bestehende Logik unverändert
  s.route=[...(s.route||[]),point];

  if(!s.weather && typeof getWeather==='function'){
    try{
      const w=await getWeather(point.lat,point.lng);
      if(w?.current){
        s.weather={
          temp_c:w.current.temperature_2m,
          wind_ms:w.current.wind_speed_10m,
          pressure_hpa:w.current.pressure_msl,
          at:w.current.time
        };
      }
    }catch(e){}
  }

  s.routeSnapshotSvg=routeSnapshotSvg(s.route||[]);
  saveDuelState(s);

  await addRemoteTrack(s,point);
  await addRemoteEvent(s,'gps',s.captainId,{
    lat:point.lat,
    lng:point.lng,
    accuracy:point.accuracy??null,
    demo:!!point.demo
  });

  updateDuelUi();
}
  function openDuelMapModal(imageUrl){if(!imageUrl)return;let modal=document.getElementById('duelMapPreviewModal');if(!modal){modal=document.createElement('div');modal.id='duelMapPreviewModal';modal.className='duel-map-preview-modal hidden';modal.innerHTML='<div class="duel-map-preview-card glass-card"><button class="duel-map-preview-close" type="button" data-close-duel-map-preview aria-label="Schliessen">×</button><img id="duelMapPreviewImage" class="duel-map-preview-image" alt="Gespeicherte Duell-Karte"></div>';document.body.appendChild(modal);}const img=modal.querySelector('#duelMapPreviewImage');if(img)img.src=imageUrl;modal.classList.remove('hidden');document.body.classList.add('duel-map-preview-open');}
  function closeDuelMapModal(){const modal=document.getElementById('duelMapPreviewModal');if(modal)modal.classList.add('hidden');document.body.classList.remove('duel-map-preview-open');}
  async function addDuelCatch(species){let s=getDuelState();if(!s.active){alert('Starte zuerst ein Duell.');return;}const fish=fishTiles.find(f=>f.species===species)||fishTiles[fishTiles.length-1];const target=document.getElementById('duelCatchParticipantSelect')?.value||s.captainId;if(!target){alert('Bitte zuerst einen Fänger auswählen.');return;}s.score=s.score||{};s.score[target]=Number(s.score[target]||0)+fish.points;const catchEvent={id:crypto.randomUUID(),participantId:target,species:fish.species,points:fish.points,at:new Date().toISOString()};s.catches=[...(s.catches||[]),catchEvent];s.lastTalk=`${participantName(target)} legt ${fish.species} vor. +${fish.points} Punkte – der Kescher applaudiert.`;if(s.mode==='feed')feedFishAfterCatch(s,target,fish);saveDuelState(s);await addRemoteEvent(s,'catch',target,catchEvent);await syncRemoteParticipants(s);updateDuelUi();}
  function bindDuel(){if(document.body.dataset.duelBound==='1')return;document.body.dataset.duelBound='1';document.addEventListener('click',e=>{const mapBtn=e.target.closest('[data-duel-map-image]');if(mapBtn){e.preventDefault();openDuelMapModal(mapBtn.dataset.duelMapImage);return;}if(e.target.closest('[data-close-duel-map-preview]')||e.target.id==='duelMapPreviewModal'){closeDuelMapModal();return;}if(e.target.closest('#duelStartBtn'))startDuel();if(e.target.closest('#duelStopBtn'))endDuel();if(e.target.closest('#duelGpsBtn'))addGpsPoint();if(e.target.closest('#feedFishActivateBtn'))activateFeedFishMode(false);if(e.target.closest('#feedFishStartBtn'))activateFeedFishMode(true);if(e.target.closest('#feedFishResetBtn'))resetFeedFish();const tile=e.target.closest('[data-duel-fish]');if(tile)addDuelCatch(tile.dataset.duelFish);});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDuelMapModal();});document.addEventListener('change',e=>{if(!e.target.closest('#duelPanel'))return;let s=ensureDuelParticipants(getDuelState());if(e.target.id==='duelCaptainSelect')s.captainId=e.target.value;if(e.target.id==='duelOpponentSelect')s.opponentId=e.target.value;if(e.target.id==='duelDurationSelect')s.durationMin=Number(e.target.value||60);if(e.target.id==='duelModeSelect'){s.mode=e.target.value;if(s.mode==='feed')ensureFeedFishState(s);}saveDuelState(s);updateDuelUi();});}
  const originalRenderTournaments=typeof renderTournaments==='function'?renderTournaments:null;
  if(originalRenderTournaments){
    renderTournaments=function(...args){const res=originalRenderTournaments.apply(this,args);try{renderDuelSection();}catch(e){console.warn('Duel render failed',e)}return res;};
    window.renderTournaments=renderTournaments;
  }
  document.addEventListener('DOMContentLoaded',()=>{bindDuel();renderDuelSection();loadDuelLeaderboard();const s=getDuelState();if(s.active)startTimers();});
  window.renderDuelSection=renderDuelSection;
})();

function exportElementAsImage(elementId, fileName = "fishtrack-export.png") {
  const element = document.getElementById(elementId);

  if (!element) {
    console.error("Element nicht gefunden:", elementId);
    return;
  }

  html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    scale: 2,
    logging: false
  }).then(canvas => {
    const link = document.createElement("a");
    link.download = fileName;
    link.href = canvas.toDataURL("image/png");
    link.click();
  });
}

async function exportElementAsImageAndUpload(elementId, duelId){
  const element = document.getElementById(elementId);

  if (!element) {
    console.error("Element nicht gefunden:", elementId);
    return null;
  }

  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    scale: 2
  });

  return new Promise((resolve)=>{
    canvas.toBlob(async (blob)=>{
      const fileName = `duel-${duelId}-${Date.now()}.png`;

      const client = window.supabaseClient || db;
      if(!client){ console.warn('Supabase Client fehlt für Duel Image Upload'); resolve(null); return; }
      const { error } = await client
        .storage
        .from('duel-images')
        .upload(fileName, blob);

      if(error){
        console.error("Upload Fehler:", error);
        resolve(null);
        return;
      }

      const { data } = client
        .storage
        .from('duel-images')
        .getPublicUrl(fileName);

      resolve(data.publicUrl);
    });
  });
}
