const STORAGE_KEY='fishtrack-norway-v2';const THEME_KEY='fishtrack-theme';const speciesPalette={'Barsch':'#8ff0a7','Hecht':'#ffb84d','Zander':'#66e7ff','Forelle':'#ff8ab4','Dorsch':'#b7a0ff','Andere':'#d4dbe3'};const RULESETS={all_fish:{id:'all_fish',name:'Jeder Fisch zählt',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:5,bonusLargestPerSpecies:3,bonusNewArea:0,bonusOver80cm:0,bonusOver100cm:0},first_fish:{id:'first_fish',name:'Erster Fisch gewinnt',pointsPerFish:1,bonusFirstFish:10,bonusLargestFish:5,bonusLargestPerSpecies:0,bonusNewArea:0,bonusOver80cm:0,bonusOver100cm:0},species_hunter:{id:'species_hunter',name:'Artenjäger',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:0,bonusLargestPerSpecies:5,bonusNewArea:0,bonusOver80cm:0,bonusOver100cm:0,bonusNewSpecies:3},trophy_hunter:{id:'trophy_hunter',name:'Trophy Hunter',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:10,bonusLargestPerSpecies:3,bonusNewArea:0,bonusOver80cm:2,bonusOver100cm:5},explorer:{id:'explorer',name:'Entschneidern / Spot Explorer',pointsPerFish:1,bonusFirstFish:0,bonusLargestFish:5,bonusLargestPerSpecies:0,bonusNewArea:5,bonusOver80cm:0,bonusOver100cm:0}};const defaultData={meta:{tripName:'Aarnes / Norwegen',tripSubtitle:'Fänge, Fangorte und Teilnehmer-Leaderboard'},participants:[{id:crypto.randomUUID(),name:'Nico',color:'#4ad7d1',avatar:'🎣'},{id:crypto.randomUUID(),name:'Dad',color:'#ffb84d',avatar:'🧢'}],catches:[],tournaments:[]};(()=>{const now=new Date(),p1=defaultData.participants[0].id,p2=defaultData.participants[1].id,baseLat=59.915,baseLng=10.78,demo=[['Hecht',91,6.8,p1,-6,6,'Gummifisch','Nordufer'],['Barsch',34,0.65,p2,-5,18,'Spinner','Steg'],['Zander',63,2.7,p1,-4,21,'Jig','Tiefenkante'],['Barsch',29,0.42,p1,-3,7,'Wobbler','Schilfkante'],['Hecht',78,4.9,p2,-2,9,'Jerkbait','Bucht Ost'],['Forelle',47,1.4,p1,-1,14,'Spinner','Zulauf'],['Zander',58,2.1,p2,0,20,'Jig','Tiefenkante']];defaultData.catches=demo.map((d,i)=>{const dt=new Date(now);dt.setDate(now.getDate()+d[4]);dt.setHours(d[5],20,0,0);return{id:crypto.randomUUID(),species:d[0],customSpecies:'',lengthCm:d[1],weightKg:d[2],participantId:d[3],timestamp:dt.toISOString(),bait:d[6],spotLabel:d[7],note:'',location:{lat:baseLat+((i%3)*0.015),lng:baseLng+((i%4)*0.02),label:d[7]},createdAt:new Date().toISOString()}})})();let state=loadState();let charts={};let map;let markersLayer;let beforeInstallPromptEvent=null;let activeTournamentId=null;function loadState(){const raw=localStorage.getItem(STORAGE_KEY);if(!raw)return structuredClone(defaultData);try{const data=JSON.parse(raw);return{meta:data.meta||structuredClone(defaultData.meta),participants:Array.isArray(data.participants)?data.participants:[],catches:Array.isArray(data.catches)?data.catches:[],tournaments:Array.isArray(data.tournaments)?data.tournaments:[]}}catch{return structuredClone(defaultData)}}function persist(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}function fmtKg(v){return`${Number(v||0).toFixed(2)} kg`}function fmtDateTime(v){const d=new Date(v);return d.toLocaleString('de-CH',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}function startOfDay(date){const d=new Date(date);d.setHours(0,0,0,0);return d}function sameDay(a,b){return startOfDay(a).getTime()===startOfDay(b).getTime()}function participantById(id){return state.participants.find(p=>p.id===id)}function speciesName(c){return c.species==='Andere'?(c.customSpecies||'Andere'):c.species}function computeParticipantStats(){return state.participants.map(p=>{const catches=state.catches.filter(c=>c.participantId===p.id);const totalWeight=catches.reduce((s,c)=>s+Number(c.weightKg||0),0);const heaviest=catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null);const totalLength=catches.reduce((s,c)=>s+Number(c.lengthCm||0),0);const points=catches.reduce((s,c)=>{let pts=1+Math.ceil(Number(c.weightKg||0));if(Number(c.lengthCm||0)>=80)pts+=1;if(Number(c.lengthCm||0)>=100)pts+=2;return s+pts},0);return{...p,catches,count:catches.length,totalWeight,avgWeight:catches.length?totalWeight/catches.length:0,avgLength:catches.length?totalLength/catches.length:0,points,heaviest}}).sort((a,b)=>b.points-a.points||b.totalWeight-a.totalWeight)}function computeSummary(){const totalCatches=state.catches.length,totalWeight=state.catches.reduce((s,c)=>s+Number(c.weightKg||0),0),avgWeight=totalCatches?totalWeight/totalCatches:0,biggest=state.catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null),todayCount=state.catches.filter(c=>sameDay(c.timestamp,new Date())).length,leaderboard=computeParticipantStats(),leader=leaderboard[0],byHour=Array.from({length:24},(_,h)=>({hour:h,count:state.catches.filter(c=>new Date(c.timestamp).getHours()===h).length})),bestHour=byHour.reduce((m,h)=>h.count>m.count?h:m,{hour:0,count:0});return{totalCatches,totalWeight,avgWeight,biggest,todayCount,leader,bestHour,leaderboard}}function dailyBuckets(){const map=new Map();[...state.catches].forEach(c=>{const key=new Date(c.timestamp).toISOString().slice(0,10);map.set(key,(map.get(key)||0)+1)});return[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0]))}function speciesBuckets(){const map=new Map();state.catches.forEach(c=>{const key=speciesName(c);map.set(key,(map.get(key)||0)+1)});return[...map.entries()].sort((a,b)=>b[1]-a[1])}function getInsights(){const insights=[];const summary=computeSummary();if(summary.biggest){const p=participantById(summary.biggest.participantId);insights.push({title:'Größter Fisch',body:`${speciesName(summary.biggest)} mit ${fmtKg(summary.biggest.weightKg)} und ${summary.biggest.lengthCm} cm von ${p?.name||'–'}.`})}const species=speciesBuckets();if(species[0])insights.push({title:'Häufigste Art',body:`${species[0][0]} führt mit ${species[0][1]} Fang${species[0][1]===1?'':'en'}.`});const spotMap=new Map();state.catches.forEach(c=>{const label=c.spotLabel||c.location?.label||'Unbekannter Spot';spotMap.set(label,(spotMap.get(label)||0)+1)});const topSpot=[...spotMap.entries()].sort((a,b)=>b[1]-a[1])[0];if(topSpot)insights.push({title:'Hot Spot',body:`${topSpot[0]} brachte ${topSpot[1]} Fang${topSpot[1]===1?'':'e'}.`});if(summary.bestHour.count>0)insights.push({title:'Beste Zeit',body:`Die beste Fangzeit liegt aktuell um ${String(summary.bestHour.hour).padStart(2,'0')}:00 Uhr.`});const leaderboard=summary.leaderboard;if(leaderboard[0])insights.push({title:'Aktueller Leader',body:`${leaderboard[0].name} führt mit ${leaderboard[0].points} Punkten und ${leaderboard[0].count} Fängen.`});return insights}function getForecast(){const catches=state.catches;if(!catches.length)return{text:'Noch zu wenig Daten für eine sinnvolle Prognose.'};const dates=catches.map(c=>startOfDay(c.timestamp).getTime()),min=Math.min(...dates),max=Math.max(...dates),days=Math.max(1,Math.round((max-min)/86400000)+1),avgPerDay=catches.length/days,projected30=Math.round(avgPerDay*30),weightPerCatch=catches.reduce((s,c)=>s+Number(c.weightKg||0),0)/catches.length;return{text:`Wenn ihr dieses Tempo haltet, landet ihr in 30 Tagen bei etwa ${projected30} Fängen. Bei eurem aktuellen Schnitt entspricht das rund ${fmtKg(projected30*weightPerCatch)} Gesamtgewicht.`,avgPerDay,projected30}}function populateSelects(){const participantSelect=document.getElementById('participantSelect'),participantFilter=document.getElementById('participantFilter');participantSelect.innerHTML='';participantFilter.innerHTML='<option value="all">Alle Teilnehmer</option>';state.participants.forEach(p=>{participantSelect.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.avatar||'🎣'} ${p.name}</option>`);participantFilter.insertAdjacentHTML('beforeend',`<option value="${p.id}">${p.name}</option>`)});const speciesFilter=document.getElementById('speciesFilter');const speciesValues=[...new Set(state.catches.map(c=>speciesName(c)))];speciesFilter.innerHTML='<option value="all">Alle Fischarten</option>'+speciesValues.map(v=>`<option value="${v}">${v}</option>`).join('');const tournamentSelect=document.getElementById('tournamentSelect');if(tournamentSelect){tournamentSelect.innerHTML='<option value="">Kein Turnier</option>'+state.tournaments.map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}renderTournamentParticipantPicks()}function renderDashboard(){const s=computeSummary();document.getElementById('tripTitle').textContent=state.meta.tripName;document.getElementById('tripSubtitle').textContent=state.meta.tripSubtitle;document.getElementById('totalCatches').textContent=s.totalCatches;document.getElementById('totalWeight').textContent=fmtKg(s.totalWeight);document.getElementById('biggestCatch').textContent=s.biggest?`${speciesName(s.biggest)} ${Number(s.biggest.lengthCm||0).toFixed(0)} cm`:'–';document.getElementById('todayCatches').textContent=s.todayCount;document.getElementById('currentLeader').textContent=s.leader?s.leader.name:'–';document.getElementById('avgWeight').textContent=fmtKg(s.avgWeight);document.getElementById('bestTimeSlot').textContent=s.bestHour.count?`${String(s.bestHour.hour).padStart(2,'0')}:00`:'–';const leaderboard=document.getElementById('leaderboardList');leaderboard.innerHTML='';s.leaderboard.forEach((p,i)=>leaderboard.insertAdjacentHTML('beforeend',`<article class="list-card"><div><div class="list-title-row"><strong>#${i+1} ${p.avatar||'🎣'} ${p.name}</strong><span class="badge" style="background:${p.color}">${p.points} Punkte</span></div><div class="meta">${p.count} Fänge · ${fmtKg(p.totalWeight)} Gesamtgewicht · Ø ${Math.round((p.avgLength||0))} cm</div></div><div class="meta">${p.heaviest?`Top: ${speciesName(p.heaviest)} ${fmtKg(p.heaviest.weightKg)}`:'Noch kein Fang'}</div></article>`));const recent=[...state.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp)).slice(0,6),recentEl=document.getElementById('recentCatches');recentEl.innerHTML=recent.length?'':'<div class="meta">Noch keine Fänge vorhanden.</div>';recent.forEach(c=>{const p=participantById(c.participantId),bg=p?.color||'#4ad7d1';recentEl.insertAdjacentHTML('beforeend',`<article class="list-card"><div><div class="list-title-row"><strong>${speciesName(c)}</strong><span class="badge" style="background:${bg}">${p?.avatar||'🎣'} ${p?.name||'–'}</span></div><div class="meta">${c.lengthCm} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</div><div class="note">${c.spotLabel||c.location?.label||'Kein Spot'}${c.bait?` · Köder: ${c.bait}`:''}</div></div></article>`)}) ;const insights=document.getElementById('insightsList');insights.innerHTML='';getInsights().forEach(item=>insights.insertAdjacentHTML('beforeend',`<article class="insight-card"><strong>${item.title}</strong><span>${item.body}</span></article>`));renderCharts()}function cleanup(key){if(charts[key])charts[key].destroy()}function css(name){return getComputedStyle(document.body).getPropertyValue(name).trim()}function renderCharts(){const species=speciesBuckets();cleanup('species');charts.species=new Chart(document.getElementById('speciesChart'),{type:'doughnut',data:{labels:species.map(x=>x[0]),datasets:[{data:species.map(x=>x[1]),backgroundColor:species.map(x=>speciesPalette[x[0]]||'#b7c2ce'),borderWidth:0}]},options:{responsive:true,plugins:{legend:{labels:{color:css('--text')}}}}});const daily=dailyBuckets();cleanup('daily');charts.daily=new Chart(document.getElementById('dailyChart'),{type:'bar',data:{labels:daily.map(x=>x[0].slice(5)),datasets:[{label:'Fänge',data:daily.map(x=>x[1]),backgroundColor:'#4ad7d1',borderRadius:12}]},options:{scales:{x:{ticks:{color:css('--muted')},grid:{display:false}},y:{ticks:{color:css('--muted')},grid:{color:'rgba(255,255,255,.08)'}}},plugins:{legend:{display:false}}}});const pStats=computeParticipantStats();cleanup('participants');charts.participants=new Chart(document.getElementById('participantChart'),{type:'bar',data:{labels:pStats.map(p=>p.name),datasets:[{label:'Fänge',data:pStats.map(p=>p.count),backgroundColor:'#4ad7d1',borderRadius:12},{label:'Punkte',data:pStats.map(p=>p.points),backgroundColor:'#ffb84d',borderRadius:12}]},options:{scales:{x:{ticks:{color:css('--muted')},grid:{display:false}},y:{ticks:{color:css('--muted')},grid:{color:'rgba(255,255,255,.08)'}}},plugins:{legend:{labels:{color:css('--text')}}}}})}function renderHistory(){const list=document.getElementById('catchHistoryList');const speciesFilter=document.getElementById('speciesFilter').value,participantFilter=document.getElementById('participantFilter').value,q=document.getElementById('searchCatch').value.trim().toLowerCase();let items=[...state.catches].sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));if(speciesFilter!=='all')items=items.filter(c=>speciesName(c)===speciesFilter);if(participantFilter!=='all')items=items.filter(c=>c.participantId===participantFilter);if(q)items=items.filter(c=>[speciesName(c),c.spotLabel,c.bait,c.note].join(' ').toLowerCase().includes(q));list.innerHTML='';if(!items.length){list.innerHTML='<div class="meta">Keine Fänge für den aktuellen Filter.</div>';return}items.forEach(c=>{const p=participantById(c.participantId),wrap=document.createElement('article');wrap.className='list-card catch-item';wrap.innerHTML=`<div class="list-main"><div class="list-title-row"><strong>${speciesName(c)}</strong><span class="badge" style="background:${p?.color||'#4ad7d1'}">${p?.avatar||'🎣'} ${p?.name||'–'}</span></div><div class="meta">${c.lengthCm} cm · ${fmtKg(c.weightKg)} · ${fmtDateTime(c.timestamp)}</div><div class="note">${c.spotLabel||c.location?.label||'Kein Spot'}${c.bait?` · Köder: ${c.bait}`:''}${c.note?` · ${c.note}`:''}</div></div><div class="list-actions"><button class="icon-btn edit-btn">✎</button><button class="icon-btn delete-btn">✕</button></div>`;wrap.querySelector('.delete-btn').addEventListener('click',()=>{if(!confirm('Diesen Fang wirklich löschen?'))return;state.catches=state.catches.filter(x=>x.id!==c.id);persist();rerender()});wrap.querySelector('.edit-btn').addEventListener('click',()=>loadCatchIntoForm(c));list.appendChild(wrap)})}function loadCatchIntoForm(c){showScreen('catches');const form=document.getElementById('catchForm');form.dataset.editingId=c.id;form.species.value=c.species;document.getElementById('speciesSelect').dispatchEvent(new Event('change'));form.customSpecies.value=c.customSpecies||'';form.participantId.value=c.participantId;if(form.tournamentId)form.tournamentId.value=c.tournamentId||'';form.lengthCm.value=c.lengthCm;form.weightKg.value=c.weightKg;form.timestamp.value=new Date(c.timestamp).toISOString().slice(0,16);form.bait.value=c.bait||'';form.spotLabel.value=c.spotLabel||'';form.note.value=c.note||'';form.lat.value=c.location?.lat||'';form.lng.value=c.location?.lng||'';if(c.location?.lat&&c.location?.lng&&window.updateCatchLocationPreview)window.updateCatchLocationPreview(c.location.lat,c.location.lng);window.scrollTo({top:0,behavior:'smooth'})}function renderParticipants(){const container=document.getElementById('participantsList');container.innerHTML='';computeParticipantStats().forEach(p=>{const article=document.createElement('article');article.className='list-card';article.innerHTML=`<div><div class="list-title-row"><strong>${p.avatar||'🎣'} ${p.name}</strong><span class="badge" style="background:${p.color}">${p.points} Punkte</span></div><div class="meta">${p.count} Fänge · ${fmtKg(p.totalWeight)} · Ø ${Math.round((p.avgLength||0))} cm</div></div><div class="list-actions"><button class="icon-btn delete-btn">✕</button></div>`;article.querySelector('.delete-btn').addEventListener('click',()=>{if(state.catches.some(c=>c.participantId===p.id)){alert('Dieser Teilnehmer hat bereits Fänge. Bitte zuerst Fänge löschen oder umhängen.');return}state.participants=state.participants.filter(x=>x.id!==p.id);persist();rerender()});container.appendChild(article)})}function renderRecords(){const list=document.getElementById('recordsList'),catches=[...state.catches],heaviest=catches.reduce((m,c)=>!m||c.weightKg>m.weightKg?c:m,null),longest=catches.reduce((m,c)=>!m||c.lengthCm>m.lengthCm?c:m,null),earliest=catches.reduce((m,c)=>!m||new Date(c.timestamp)<new Date(m.timestamp)?c:m,null),latest=catches.reduce((m,c)=>!m||new Date(c.timestamp)>new Date(m.timestamp)?c:m,null),entries=[heaviest&&`Schwerster Fisch: ${speciesName(heaviest)} mit ${fmtKg(heaviest.weightKg)} von ${participantById(heaviest.participantId)?.name||'–'}.`,longest&&`Längster Fisch: ${speciesName(longest)} mit ${longest.lengthCm} cm.`,earliest&&`Erster erfasster Fang: ${fmtDateTime(earliest.timestamp)} am Spot ${earliest.spotLabel||earliest.location?.label||'–'}.`,latest&&`Letzter erfasster Fang: ${fmtDateTime(latest.timestamp)}.`].filter(Boolean);list.innerHTML=entries.length?entries.map(t=>`<article class="list-card"><div>${t}</div></article>`).join(''):'<div class="meta">Noch keine Rekorde vorhanden.</div>'}function renderForecast(){document.getElementById('forecastBox').innerHTML=`<article class="insight-card"><strong>30-Tage-Prognose</strong><span>${getForecast().text}</span></article>`}function renderTimeHeatmap(){const grid=document.getElementById('timeHeatmap');grid.innerHTML='';const counts=Array.from({length:24},(_,h)=>state.catches.filter(c=>new Date(c.timestamp).getHours()===h).length),max=Math.max(1,...counts);counts.forEach((count,hour)=>{const opacity=.12+(count/max)*.88,cell=document.createElement('div');cell.className='time-cell';cell.style.background=`rgba(74,215,209,${opacity})`;cell.style.color=opacity>.45?'#00131c':css('--text');cell.innerHTML=`<strong>${String(hour).padStart(2,'0')}:00</strong><span>${count} Fang${count===1?'':'e'}</span>`;grid.appendChild(cell)})}function initMap(){if(map)return;map=L.map('map').setView([59.915,10.78],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'&copy; OpenStreetMap'}).addTo(map);markersLayer=L.layerGroup().addTo(map)}function renderMap(){initMap();markersLayer.clearLayers();const points=state.catches.filter(c=>c.location?.lat&&c.location?.lng);const bounds=[];points.forEach(c=>{const p=participantById(c.participantId),species=speciesName(c),color=speciesPalette[species]||speciesPalette[c.species]||'#4ad7d1',marker=L.circleMarker([c.location.lat,c.location.lng],{radius:Math.max(7,Math.min(18,4+Number(c.weightKg||0)*1.5)),color,fillColor:color,fillOpacity:.65,weight:2}).bindPopup(`<strong>${species}</strong><br>${c.lengthCm} cm · ${fmtKg(c.weightKg)}<br>${p?.name||'–'} · ${fmtDateTime(c.timestamp)}<br>${c.spotLabel||c.location?.label||'Kein Spot'}`);marker.addTo(markersLayer);bounds.push([c.location.lat,c.location.lng])});if(bounds.length)map.fitBounds(bounds,{padding:[30,30]});const legend=document.getElementById('mapLegend'),uniqueSpecies=[...new Set(state.catches.map(c=>speciesName(c)))];legend.innerHTML=uniqueSpecies.map(s=>`<div class="legend-item"><span class="legend-color" style="background:${speciesPalette[s]||'#4ad7d1'}"></span><span>${s}</span></div>`).join('')||'<div class="meta">Noch keine Fangorte gespeichert.</div>';renderHeatmapGrid(points)}function renderHeatmapGrid(points){const container=document.getElementById('heatmapGrid');if(!points.length){container.innerHTML='<div class="meta">Noch keine Standortdaten vorhanden.</div>';return}const rows=5,cols=5;
// feste Europa-/Skandinavien-Grenzen statt dynamischer Verschiebung
const minLat=54,maxLat=72,minLng=4,maxLng=32;
const grid=Array.from({length:rows*cols},()=>0);
points.forEach(c=>{
const r=Math.min(rows-1,Math.max(0,Math.floor(((c.location.lat-minLat)/(maxLat-minLat))*rows)));
const col=Math.min(cols-1,Math.max(0,Math.floor(((c.location.lng-minLng)/(maxLng-minLng))*cols)));
grid[r*cols+col]+=1});const max=Math.max(...grid,1);container.innerHTML='';grid.forEach((count,idx)=>{const opacity=.12+(count/max)*.88,cell=document.createElement('div');cell.className='heat-cell';cell.dataset.zone=`Zone ${idx+1}`;cell.style.background=`rgba(143,240,167,${opacity})`;cell.style.color=opacity>.5?'#06210c':css('--text');cell.innerHTML=`<strong>Zone ${idx+1}</strong><span>${count} Fang${count===1?'':'e'}</span>`;container.appendChild(cell)})}function rerender(){populateSelects();renderDashboard();renderHistory();renderParticipants();renderRecords();renderForecast();renderTimeHeatmap();renderMap();renderTournaments()}function showScreen(name){document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.id===`screen-${name}`));document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.screen===name));if(name==='map'&&map)setTimeout(()=>map.invalidateSize(),120)}function attachEvents(){document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>showScreen(btn.dataset.screen)));document.getElementById('themeToggle').addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem(THEME_KEY,document.body.classList.contains('light')?'light':'dark');renderCharts();renderTimeHeatmap();renderMap()});document.getElementById('speciesSelect').addEventListener('change',e=>document.getElementById('customSpeciesWrap').classList.toggle('hidden',e.target.value!=='Andere'));document.getElementById('catchForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target),editingId=e.target.dataset.editingId,entry={id:editingId||crypto.randomUUID(),species:fd.get('species'),customSpecies:fd.get('customSpecies')||'',participantId:fd.get('participantId'),tournamentId:fd.get('tournamentId')||'',lengthCm:Number(fd.get('lengthCm')),weightKg:fd.get('weightKg')?Number(fd.get('weightKg')):0,timestamp:new Date(fd.get('timestamp')).toISOString(),bait:fd.get('bait')||'',spotLabel:fd.get('spotLabel')||'',note:fd.get('note')||'',location:{lat:fd.get('lat')?Number(fd.get('lat')):null,lng:fd.get('lng')?Number(fd.get('lng')):null,label:fd.get('spotLabel')||''},createdAt:new Date().toISOString()};if(editingId){state.catches=state.catches.map(c=>c.id===editingId?entry:c);delete e.target.dataset.editingId}else state.catches.push(entry);persist();e.target.reset();document.getElementById('customSpeciesWrap').classList.add('hidden');document.getElementById('timestampInput').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);rerender();showScreen('dashboard')});document.getElementById('participantForm').addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);state.participants.push({id:crypto.randomUUID(),name:fd.get('name').trim(),color:fd.get('color'),avatar:fd.get('avatar')||'🎣'});persist();e.target.reset();e.target.color.value='#4ad7d1';e.target.avatar.value='🎣';rerender()});['speciesFilter','participantFilter','searchCatch'].forEach(id=>{document.getElementById(id).addEventListener('input',renderHistory);document.getElementById(id).addEventListener('change',renderHistory)});document.getElementById('useCurrentLocation').addEventListener('click',()=>{if(!navigator.geolocation)return alert('Geolocation wird auf diesem Gerät nicht unterstützt.');navigator.geolocation.getCurrentPosition(pos=>{document.querySelector('[name="lat"]').value=pos.coords.latitude.toFixed(6);document.querySelector('[name="lng"]').value=pos.coords.longitude.toFixed(6);if(window.updateCatchLocationPreview)window.updateCatchLocationPreview(pos.coords.latitude,pos.coords.longitude)},()=>alert('Standort konnte nicht ermittelt werden. Bitte in Safari/Geräteeinstellungen erlauben.'))});document.getElementById('exportBtn').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`fishtrack-export-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)});document.getElementById('importInput').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());if(!Array.isArray(parsed.participants)||!Array.isArray(parsed.catches))throw new Error();state={meta:parsed.meta||structuredClone(defaultData.meta),participants:Array.isArray(parsed.participants)?parsed.participants:[],catches:Array.isArray(parsed.catches)?parsed.catches:[],tournaments:Array.isArray(parsed.tournaments)?parsed.tournaments:[]};persist();rerender();alert('Import erfolgreich.')}catch{alert('Import fehlgeschlagen. Bitte eine gültige JSON-Datei verwenden.')}});document.getElementById('resetDemoBtn').addEventListener('click',()=>{if(!confirm('Wirklich auf Demo-Daten zurücksetzen?'))return;state=structuredClone(defaultData);persist();rerender()});document.getElementById('tournamentForm')?.addEventListener('submit',e=>{e.preventDefault();const fd=new FormData(e.target);const selectedParticipants=[...document.querySelectorAll('#tournamentParticipants input[type="checkbox"]:checked')].map(x=>x.value);const useCustom=document.getElementById('enableCustomRules')?.checked||fd.get('rulesetId')==='custom';const customRules={pointsPerFish:Number(document.getElementById('rule_pointsPerFish').value||0),bonusFirstFish:Number(document.getElementById('rule_bonusFirstFish').value||0),bonusLargestFish:Number(document.getElementById('rule_bonusLargestFish').value||0),bonusLargestPerSpecies:Number(document.getElementById('rule_bonusLargestPerSpecies').value||0),bonusNewArea:Number(document.getElementById('rule_bonusNewArea').value||0),bonusOver80cm:Number(document.getElementById('rule_bonusOver80cm').value||0),bonusOver100cm:Number(document.getElementById('rule_bonusOver100cm').value||0)};const tournament={id:crypto.randomUUID(),name:(fd.get('name')||'').trim(),rulesetId:useCustom?'custom':(fd.get('rulesetId')||'all_fish'),customRules:useCustom?customRules:null,start:fd.get('start')||'',end:fd.get('end')||'',participantIds:selectedParticipants};state.tournaments.push(tournament);activeTournamentId=tournament.id;persist();e.target.reset();document.getElementById('enableCustomRules').checked=false;updateRulesPreview();renderTournamentParticipantPicks();rerender();showScreen('tournaments')});document.getElementById('rulesetSelect')?.addEventListener('change',updateRulesPreview);document.getElementById('enableCustomRules')?.addEventListener('change',updateRulesPreview);updateRulesPreview();window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();beforeInstallPromptEvent=e;document.getElementById('installPromptBtn').classList.remove('hidden')});document.getElementById('installPromptBtn').addEventListener('click',async()=>{if(!beforeInstallPromptEvent)return;beforeInstallPromptEvent.prompt();await beforeInstallPromptEvent.userChoice;beforeInstallPromptEvent=null;document.getElementById('installPromptBtn').classList.add('hidden')})}


function updateRulesPreview(){const select=document.getElementById('rulesetSelect');const customToggle=document.getElementById('enableCustomRules');if(!select)return;const useCustom=customToggle?.checked||select.value==='custom';const rule=useCustom?null:(RULESETS[select.value]||RULESETS.all_fish);['pointsPerFish','bonusFirstFish','bonusLargestFish','bonusLargestPerSpecies','bonusNewArea','bonusOver80cm','bonusOver100cm'].forEach(key=>{const input=document.getElementById('rule_'+key);if(!input)return;if(rule){input.value=rule[key]||0;input.disabled=true}else{input.disabled=false}})}

function gridIdFromCatch(c){if(!c.location||!c.location.lat||!c.location.lng)return'unknown';const cellLat=Math.floor(Number(c.location.lat)/0.018);const cellLng=Math.floor(Number(c.location.lng)/0.036);return`grid_${cellLat}_${cellLng}`}
function tournamentById(id){return state.tournaments.find(t=>t.id===id)}
function renderTournamentParticipantPicks(){const box=document.getElementById('tournamentParticipants');if(!box)return;box.innerHTML='';state.participants.forEach(p=>{box.insertAdjacentHTML('beforeend',`<label class="pick-chip"><input type="checkbox" value="${p.id}" checked><span>${p.avatar||'🎣'} ${p.name}</span></label>`)})}
function getTournamentRules(t){if(t?.rulesetId==='custom'&&t.customRules)return {...t.customRules,name:'Eigenes Regelwerk'};return RULESETS[t?.rulesetId]||RULESETS.all_fish}
function computeTournamentScores(tournament){const catches=state.catches.filter(c=>c.tournamentId===tournament.id).sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp));const rules=getTournamentRules(tournament);const allowed=tournament.participantIds?.length?tournament.participantIds:state.participants.map(p=>p.id);const scoreMap=new Map(allowed.map(id=>[id,{participant:participantById(id),points:0,catches:0,totalWeight:0,bonuses:[],species:new Set()}]));const add=(id,pts,label)=>{if(!scoreMap.has(id))scoreMap.set(id,{participant:participantById(id),points:0,catches:0,totalWeight:0,bonuses:[],species:new Set()});const row=scoreMap.get(id);row.points+=pts;if(label)row.bonuses.push(label)};catches.forEach((c,i)=>{const row=scoreMap.get(c.participantId);if(!row)return;row.catches+=1;row.totalWeight+=Number(c.weightKg||0);row.points+=rules.pointsPerFish||0;if((rules.bonusNewSpecies||0)>0){const s=speciesName(c);if(!row.species.has(s)){row.species.add(s);row.points+=rules.bonusNewSpecies;row.bonuses.push(`Neue Art: ${s} +${rules.bonusNewSpecies}`)}}if((rules.bonusOver80cm||0)>0&&Number(c.lengthCm||0)>=80){row.points+=rules.bonusOver80cm;row.bonuses.push(`>80 cm +${rules.bonusOver80cm}`)}if((rules.bonusOver100cm||0)>0&&Number(c.lengthCm||0)>=100){row.points+=rules.bonusOver100cm;row.bonuses.push(`>100 cm +${rules.bonusOver100cm}`)}if((rules.bonusNewArea||0)>0){const grid=gridIdFromCatch(c);const seenBefore=catches.slice(0,i).some(x=>gridIdFromCatch(x)===grid);if(!seenBefore&&grid!=='unknown'){row.points+=rules.bonusNewArea;row.bonuses.push(`Entschneidert +${rules.bonusNewArea}`)}}});if(catches[0]&&(rules.bonusFirstFish||0)>0)add(catches[0].participantId,rules.bonusFirstFish,`Erster Fisch +${rules.bonusFirstFish}`);if((rules.bonusLargestFish||0)>0&&catches.length){const biggest=[...catches].reduce((m,c)=>!m||Number(c.weightKg||0)>Number(m.weightKg||0)?c:m,null);if(biggest)add(biggest.participantId,rules.bonusLargestFish,`Größter Fisch +${rules.bonusLargestFish}`)}if((rules.bonusLargestPerSpecies||0)>0&&catches.length){const bySpecies={};catches.forEach(c=>{const s=speciesName(c);if(!bySpecies[s]||Number(c.weightKg||0)>Number(bySpecies[s].weightKg||0))bySpecies[s]=c});Object.values(bySpecies).forEach(c=>add(c.participantId,rules.bonusLargestPerSpecies,`Größter ${speciesName(c)} +${rules.bonusLargestPerSpecies}`))}return{rules,catches,rows:[...scoreMap.values()].sort((a,b)=>b.points-a.points||b.totalWeight-a.totalWeight)}}
function renderTournaments(){const list=document.getElementById('tournamentList');const title=document.getElementById('activeTournamentTitle');const meta=document.getElementById('activeTournamentMeta');const leaderboard=document.getElementById('tournamentLeaderboard');const highlights=document.getElementById('tournamentHighlights');if(!list||!title||!meta||!leaderboard||!highlights)return;list.innerHTML='';if(!state.tournaments.length){list.innerHTML='<div class="meta">Noch keine Turniere angelegt.</div>';title.textContent='Turnierauswertung';meta.textContent='Noch kein Turnier ausgewählt';leaderboard.innerHTML='';highlights.innerHTML='<div class="meta">Lege zuerst ein Turnier an.</div>';return}if(!activeTournamentId||!tournamentById(activeTournamentId))activeTournamentId=state.tournaments[0].id;state.tournaments.forEach(t=>{const rules=getTournamentRules(t);const article=document.createElement('article');article.className='list-card tournament-card'+(t.id===activeTournamentId?' active':'');article.innerHTML=`<div><div class="list-title-row"><strong>${t.name}</strong><span class="badge">${rules.name}</span></div><div class="meta">${t.start||'–'} bis ${t.end||'–'} · ${(t.participantIds||[]).length||state.participants.length} Teilnehmer</div><div class="tournament-rule">Fänge müssen beim Eintragen dem Turnier zugeordnet werden.</div></div><div class="list-actions"><button class="icon-btn open-btn">↗</button><button class="icon-btn delete-btn">✕</button></div>`;article.querySelector('.open-btn').addEventListener('click',()=>{activeTournamentId=t.id;renderTournaments();showScreen('tournaments')});article.querySelector('.delete-btn').addEventListener('click',()=>{if(!confirm('Dieses Turnier löschen? Zugeordnete Fänge bleiben bestehen, verlieren aber die Zuordnung.'))return;state.catches=state.catches.map(c=>c.tournamentId===t.id?{...c,tournamentId:''}:c);state.tournaments=state.tournaments.filter(x=>x.id!==t.id);if(activeTournamentId===t.id)activeTournamentId=state.tournaments[0]?.id||null;persist();rerender()});list.appendChild(article)});const tournament=tournamentById(activeTournamentId);const result=computeTournamentScores(tournament);title.textContent=tournament.name;meta.textContent=`${getTournamentRules(tournament).name} · ${result.catches.length} zugeordnete Fänge`;leaderboard.innerHTML='';result.rows.forEach((row,i)=>{leaderboard.insertAdjacentHTML('beforeend',`<article class="list-card"><div><div class="list-title-row"><strong>#${i+1} ${row.participant?.avatar||'🎣'} ${row.participant?.name||'–'}</strong><span class="badge" style="background:${row.participant?.color||'#4ad7d1'}">${row.points} Punkte</span></div><div class="meta">${row.catches} Fänge · ${fmtKg(row.totalWeight)}</div></div><div class="meta">${row.bonuses.slice(0,3).join(' · ')||'Nur Basiswertung'}</div></article>`)});const biggest=result.catches.reduce((m,c)=>!m||Number(c.weightKg||0)>Number(m.weightKg||0)?c:m,null);const first=result.catches[0]||null;const speciesWins={};result.catches.forEach(c=>{const s=speciesName(c);if(!speciesWins[s]||Number(c.weightKg||0)>Number(speciesWins[s].weightKg||0))speciesWins[s]=c});const topAreas=[...new Map(result.catches.map(c=>[gridIdFromCatch(c), (result.catches.filter(x=>gridIdFromCatch(x)===gridIdFromCatch(c)).length)])).entries()].filter(x=>x[0]!=='unknown').sort((a,b)=>b[1]-a[1]).slice(0,3);highlights.innerHTML='';const cards=[];if(first)cards.push(`<article class="tournament-highlight"><strong>Erster Fisch</strong><div class="meta">${speciesName(first)} von ${participantById(first.participantId)?.name||'–'} um ${fmtDateTime(first.timestamp)}</div></article>`);if(biggest)cards.push(`<article class="tournament-highlight"><strong>Größter Fisch</strong><div class="meta">${speciesName(biggest)} · ${fmtKg(biggest.weightKg)} · ${biggest.lengthCm} cm</div></article>`);Object.values(speciesWins).slice(0,4).forEach(c=>cards.push(`<article class="tournament-highlight"><strong>Artensieger ${speciesName(c)}</strong><div class="meta">${participantById(c.participantId)?.name||'–'} · ${fmtKg(c.weightKg)}</div></article>`));if(topAreas.length)cards.push(`<article class="tournament-highlight"><strong>Beste Raster</strong><div class="meta">${topAreas.map(([id,count])=>`${id.replace('grid_','')}: ${count}`).join(' · ')}</div></article>`);if(!cards.length)cards.push('<div class="meta">Noch keine Turnierdaten vorhanden.</div>');highlights.innerHTML=cards.join('')}
function initLocationPicker(){const previewEl=document.getElementById('locationPreviewMap');const modal=document.getElementById('mapPickerModal');const openBtn=document.getElementById('pickOnMap');const closeBtn=document.getElementById('closeMapPicker');const confirmBtn=document.getElementById('confirmMapLocation');const latInput=document.querySelector('[name="lat"]');const lngInput=document.querySelector('[name="lng"]');if(!previewEl||!modal||!openBtn||!closeBtn||!confirmBtn||!latInput||!lngInput||typeof L==='undefined')return;let previewMap=L.map(previewEl,{zoomControl:false,attributionControl:false}).setView([59.442773,11.654906],8);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(previewMap);let previewMarker=null;window.updateCatchLocationPreview=(lat,lng)=>{previewMap.invalidateSize();previewMap.setView([lat,lng],11);if(previewMarker)previewMarker.setLatLng([lat,lng]);else previewMarker=L.marker([lat,lng]).addTo(previewMap)};let pickerMap=null;let pickerMarker=null;let selected=null;const syncFromInputs=()=>{const lat=parseFloat(latInput.value),lng=parseFloat(lngInput.value);if(!isNaN(lat)&&!isNaN(lng))window.updateCatchLocationPreview(lat,lng)};latInput.addEventListener('input',syncFromInputs);lngInput.addEventListener('input',syncFromInputs);syncFromInputs();openBtn.addEventListener('click',()=>{modal.classList.remove('hidden');modal.setAttribute('aria-hidden','false');setTimeout(()=>{if(!pickerMap){pickerMap=L.map('mapPicker').setView([59.442773,11.654906],9);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(pickerMap);pickerMap.on('click',e=>{selected=e.latlng;if(pickerMarker){pickerMarker.setLatLng(selected)}else{pickerMarker=L.marker(selected,{draggable:true}).addTo(pickerMap);pickerMarker.on('dragend',()=>{selected=pickerMarker.getLatLng()})}})}const lat=parseFloat(latInput.value),lng=parseFloat(lngInput.value);if(!isNaN(lat)&&!isNaN(lng)){selected={lat,lng};pickerMap.setView([lat,lng],11);if(pickerMarker){pickerMarker.setLatLng([lat,lng])}else{pickerMarker=L.marker([lat,lng],{draggable:true}).addTo(pickerMap);pickerMarker.on('dragend',()=>{selected=pickerMarker.getLatLng()})}}pickerMap.invalidateSize()},80)});const closeModal=()=>{modal.classList.add('hidden');modal.setAttribute('aria-hidden','true')};closeBtn.addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});confirmBtn.addEventListener('click',()=>{if(!selected)return;latInput.value=Number(selected.lat).toFixed(6);lngInput.value=Number(selected.lng).toFixed(6);window.updateCatchLocationPreview(selected.lat,selected.lng);closeModal()})}
function init(){if(localStorage.getItem(THEME_KEY)==='light')document.body.classList.add('light');document.getElementById('timestampInput').value=new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);attachEvents();initLocationPicker();rerender();if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(console.error))}init();

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
        const points = state.catches.filter(c => c.location && c.location.lat != null && c.location.lng != null);
        drawGridNew(points);
      });
    }
    if (showAllBtn) {
      showAllBtn.addEventListener('click', () => {
        const points = state.catches.filter(c => c.location && c.location.lat != null && c.location.lng != null);
        fitAllNew(points);
      });
    }
  });
})();

document.addEventListener('DOMContentLoaded',()=>{
 const oldRenderDashboard = window.renderDashboard;
 if(oldRenderDashboard){
  window.renderDashboard=function(...args){
   const r=oldRenderDashboard.apply(this,args);
   try{
    const canvas=document.getElementById('speciesTimelineChart');
    if(canvas && window.Chart){
      if(window.speciesTimelineInstance){window.speciesTimelineInstance.destroy();}
      const hours=[...Array(25).keys()];
      const speciesColors={Barsch:'#38bdf8',Hecht:'#22c55e',Zander:'#facc15',Forelle:'#fb923c',Dorsch:'#a78bfa',Andere:'#94a3b8'};
      const datasets=Object.keys(speciesColors).map(sp=>{
        const vals=hours.map(h=>0);
        (state.catches||[]).forEach(c=>{
          const s=c.species||'Andere';
          const hour=new Date(c.timestamp||c.date||Date.now()).getHours();
          if((sp===s)|| (sp==='Andere' && !speciesColors[s])) vals[hour]+=1;
        });
        return {label:sp,data:vals,borderColor:speciesColors[sp],backgroundColor:'transparent',tension:.4,borderWidth:3,pointRadius:0};
      });
      window.speciesTimelineInstance=new Chart(canvas,{
        type:'line',
        data:{labels:hours,datasets},
        options:{
          responsive:true,
          plugins:{legend:{labels:{color:'#cbd5e1'}}},
          scales:{
            x:{ticks:{color:'#94a3b8'},title:{display:true,text:'Zeit (0–24 Uhr)',color:'#94a3b8'},grid:{color:'rgba(255,255,255,.08)'}},
            y:{ticks:{color:'#94a3b8'},title:{display:true,text:'Anzahl Fische',color:'#94a3b8'},grid:{color:'rgba(255,255,255,.08)'}}
          }
        }
      });
    }
   }catch(e){console.log(e)}
   return r;
  }
 }
});


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


// Replace species donut with smooth timeline distribution chart
(function(){
  const speciesColors = {
    Barsch:'#8BE39A',
    Hecht:'#F6B84C',
    Forelle:'#F48AB5',
    Zander:'#66D9F3',
    Dorsch:'#A997FF',
    Andere:'#D9DEE5'
  };

  function buildTimelineChart(){
    const canvas = document.getElementById('speciesTimelineChart');
    if(!canvas || typeof Chart === 'undefined') return;

    if(window.speciesTimelineChartInstance){
      window.speciesTimelineChartInstance.destroy();
    }

    const labels = Array.from({length:25}, (_,i)=>i);
    const datasets = Object.entries(speciesColors).map(([species,color])=>{
      const values = new Array(25).fill(0);

      (window.state?.catches || []).forEach(c=>{
        const currentSpecies = c.species || 'Andere';
        const hour = new Date(c.timestamp || c.createdAt || Date.now()).getHours();

        if(currentSpecies === species || (species === 'Andere' && !speciesColors[currentSpecies])){
          values[hour] += 1;
        }
      });

      return {
        label: species,
        data: values,
        borderColor: color,
        backgroundColor: color + '55',
        fill: true,
        tension: 0.55,
        pointRadius: 0,
        borderWidth: 3
      };
    });

    window.speciesTimelineChartInstance = new Chart(canvas, {
      type:'line',
      data:{labels,datasets},
      options:{
        responsive:true,
        maintainAspectRatio:false,
        interaction:{mode:'index', intersect:false},
        plugins:{
          legend:{
            position:'top',
            labels:{
              color:'#E5E7EB',
              padding:18,
              boxWidth:36,
              boxHeight:12,
              font:{size:14, weight:'600'}
            }
          }
        },
        scales:{
          x:{
            min:0,
            max:24,
            ticks:{
              color:'#B6C2D1',
              stepSize:3
            },
            title:{
              display:true,
              text:'Zeit (0–24 Uhr)',
              color:'#B6C2D1',
              font:{size:15}
            },
            grid:{color:'rgba(255,255,255,0.08)'}
          },
          y:{
            beginAtZero:true,
            ticks:{
              color:'#B6C2D1',
              precision:0
            },
            title:{
              display:true,
              text:'Anzahl Fische',
              color:'#B6C2D1',
              font:{size:15}
            },
            grid:{color:'rgba(255,255,255,0.08)'}
          }
        }
      }
    });
  }

  const origDashboard = window.renderDashboard;
  if(typeof origDashboard === 'function'){
    window.renderDashboard = function(...args){
      const result = origDashboard.apply(this,args);
      setTimeout(buildTimelineChart, 50);
      return result;
    }
  }

  window.addEventListener('load', ()=>setTimeout(buildTimelineChart, 200));
})();

window.addEventListener('load', function () {
  function renderSpeciesTimeline() {
    const canvas = document.getElementById('speciesTimelineChart');
    const legendEl = null;
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.__speciesTimelineChart) {
      window.__speciesTimelineChart.destroy();
    }

    const colors = {
      Barsch: '#8BE39A',
      Hecht: '#F6B84C',
      Forelle: '#F48AB5',
      Zander: '#66D9F3',
      Dorsch: '#A997FF',
      Andere: '#D9DEE5'
    };

    const labels = Array.from({ length: 25 }, (_, i) => i);

    const datasets = Object.entries(colors).map(([species, color]) => {
      const values = new Array(25).fill(0);

      (window.state?.catches || []).forEach(c => {
        const catchSpecies = c.species || 'Andere';
        const dateValue = c.timestamp || c.createdAt || c.date;
        const hour = dateValue ? new Date(dateValue).getHours() : 0;

        if (catchSpecies === species || (species === 'Andere' && !colors[catchSpecies])) {
          values[hour] += 1;
        }
      });

      return {
        label: species,
        data: values,
        borderColor: color,
        backgroundColor: color + '26',
        fill: true,
        tension: 0.55,
        pointRadius: 0,
        borderWidth: 3,
        cubicInterpolationMode: 'monotone'
      };
    });
window.__speciesTimelineChart = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          ...ds,
          backgroundColor: ds.borderColor + '55',
          fill: true,
          borderWidth: 4,
          pointRadius: 0,
          tension: 0.55,
          cubicInterpolationMode: 'monotone'
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      aspectRatio: 1.9,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        elements: {
          line: { capBezierPoints: true }
        },
        layout: {
          padding: { top: 6, left: 6, right: 10, bottom: 0 }
        },
        scales: {
          x: {
            min: 0,
            max: 24,
            border: { display: false },
            ticks: {
              color: 'rgba(220,227,236,0.78)',
              stepSize: 2,
              font: { size: 11 },
              padding: 10
            },
            title: {
              display: true,
              text: 'Zeit (0–24 Uhr)',
              color: 'rgba(220,227,236,0.78)',
              font: { size: 12, weight: '400' },
              padding: { top: 16 }
            },
            grid: {
              display: false,
              drawTicks: false
            }
          },
          y: {
            beginAtZero: true,
            border: { display: false },
            ticks: {
              stepSize: 1,
              color: 'rgba(220,227,236,0.78)',
              precision: 0,
              font: { size: 11 },
              padding: 10
            },
            title: {
              display: true,
              text: 'Anzahl Fische',
              color: 'rgba(220,227,236,0.78)',
              font: { size: 12, weight: '400' },
              padding: { bottom: 10 }
            },
            grid: {
              display: false,
              drawTicks: false
            }
          }
        }
      }
    });
  }

  setTimeout(renderSpeciesTimeline, 300);

  if (typeof window.renderDashboard === 'function') {
    const oldRenderDashboard = window.renderDashboard;
    window.renderDashboard = function () {
      const result = oldRenderDashboard.apply(this, arguments);
      setTimeout(renderSpeciesTimeline, 100);
      return result;
    };
  }
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

const __originalRenderSpeciesTimeline = window.renderSpeciesTimeline;
window.renderSpeciesTimeline = function () {
  if (typeof __originalRenderSpeciesTimeline === 'function') {
    __originalRenderSpeciesTimeline();
  }

  const legend = document.getElementById('speciesTimelineLegend');
  if (legend) legend.style.display = 'none';

  if (window.__speciesTimelineChart) {
    const chart = window.__speciesTimelineChart;
    chart.options.plugins.legend.display = false;

    chart.data.datasets.forEach(ds => {
      ds.fill = true;
      ds.backgroundColor = (ds.borderColor || '#4ad7d1') + '80';
      ds.borderWidth = 1;
      ds.tension = 0.3;
      ds.pointRadius = 0;
    });

    if (chart.options.scales?.x?.grid) chart.options.scales.x.grid.display = false;
    if (chart.options.scales?.y?.grid) chart.options.scales.y.grid.display = false;

    chart.update();
  }
};


document.addEventListener('DOMContentLoaded', () => {
  const fishIcons = {
    'Barsch':'#8BE39A',
    'Hecht':'#F6B84C',
    'Forelle':'#F48AB5',
    'Zander':'#66D9F3',
    'Dorsch':'#A997FF',
    'Andere':'#D9DEE5'
  };

  const original = window.renderSpeciesTimeline;
  window.renderSpeciesTimeline = function(){
    if(original) original();

    const chart = window.__speciesTimelineChart;
    const legend = document.getElementById('speciesTimelineLegend');
    if(!chart || !legend) return;

    chart.options.plugins.legend.display = false;

    // nicer chart style
    chart.data.datasets.forEach(ds=>{
      ds.fill = true;
      ds.backgroundColor = (ds.borderColor || '#4ad7d1') + '80';
      ds.borderWidth = 1;
      ds.tension = 0.3;
      ds.pointRadius = 0;
      ds.hidden = false;
    });

    let active = null;

    legend.innerHTML = chart.data.datasets.map((ds, idx) => `
      <button class="species-icon-pill" data-index="${idx}">
        <span class="fish-icon" style="color:${ds.borderColor}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 12c3-4 7-6 11-6 2 0 4 1 6 3-2 2-4 3-6 3-4 0-8-2-11-6Z"/>
            <path d="M14 12c0 4 2 8 6 10"/>
            <path d="M14 12c0-4 2-8 6-10"/>
          </svg>
        </span>
        <span>${ds.label}</span>
      </button>
    `).join('');

    [...legend.querySelectorAll('.species-icon-pill')].forEach(btn=>{
      btn.onclick = () => {
        const idx = Number(btn.dataset.index);

        if(active === idx){
          active = null;
          chart.data.datasets.forEach(ds => ds.hidden = false);
          legend.querySelectorAll('.species-icon-pill').forEach(b=>b.classList.remove('active','inactive'));
        } else {
          active = idx;
          chart.data.datasets.forEach((ds,i)=> ds.hidden = i !== idx);
          legend.querySelectorAll('.species-icon-pill').forEach((b,i)=>{
            b.classList.toggle('active', i===idx);
            b.classList.toggle('inactive', i!==idx);
          });
        }
        chart.update();
      };
    });

    chart.update();
  };
});


document.addEventListener('DOMContentLoaded', () => {
  const originalLegendFix = window.renderSpeciesTimeline;
  window.renderSpeciesTimeline = function() {
    if (originalLegendFix) originalLegendFix();

    if (window.__speciesTimelineChart) {
      const chart = window.__speciesTimelineChart;
      if (!chart.options.plugins) chart.options.plugins = {};
      chart.options.plugins.legend = { display: false };
      chart.update();
    }

    const builtInLegend = document.querySelector('.timeline-chart-wrap ul');
    if (builtInLegend) builtInLegend.remove();
  };
});


// Force identical chart layout padding and day-click filtering
(function(){
  const originalTimeline = window.renderSpeciesTimeline;
  window.renderSpeciesTimeline = function() {
    if (originalTimeline) originalTimeline();

    const chart = window.__speciesTimelineChart;
    if (chart) {
      chart.options.layout = {
        padding: {
          left: 34,
          right: 18,
          top: 0,
          bottom: 0
        }
      };

      chart.options.scales.x = chart.options.scales.x || {};
      chart.options.scales.x.offset = false;

      chart.update();
    }
  };

  const originalCharts = window.renderCharts;
  window.renderCharts = function() {
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
        if (typeof window.renderSpeciesTimeline === 'function') {
          window.renderSpeciesTimeline();
        }
      };
      charts.daily.update();
    }
  };
})();


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
    if(typeof renderSpeciesTimeline === 'function') renderSpeciesTimeline();
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
setInterval(() => {
  const canvas = document.getElementById('speciesTimelineChart');
  if (!canvas || typeof Chart === 'undefined') return;

  const catches = typeof getDashboardCatches === 'function'
    ? getDashboardCatches()
    : (window.state?.catches || []);

  const signature = JSON.stringify(catches.map(c => [c.id, c.species, c.timestamp]));
  if (window.__speciesSignature === signature) return;
  window.__speciesSignature = signature;

  const existing = Chart.getChart(canvas);
  if (existing) existing.destroy();

  const labels = Array.from({length:24}, (_,i)=>String(i).padStart(2,'0') + ':00');
  const defs = {
    'Barsch':'#4FC3F7',
    'Hecht':'#32D26E',
    'Zander':'#FFD54F',
    'Forelle':'#FFAA5B',
    'Dorsch':'#A98BFF',
    'Andere':'#B0BEC5'
  };

  const datasets = Object.entries(defs).map(([name,color]) => {
    const arr = new Array(24).fill(0);

    catches.forEach(c => {
      const species = c.species || 'Andere';
      if (species !== name) return;
      const d = c.timestamp || c.createdAt;
      if (!d) return;
      arr[new Date(d).getHours()]++;
    });

    return {
      label: name,
      data: arr,
      borderColor: color,
      backgroundColor: color,
      fill: false,
      borderWidth: 2,
      tension: 0.45,
      pointRadius: 0,
      pointHoverRadius: 0,
      cubicInterpolationMode: 'monotone'
    };
  });

  new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      aspectRatio: 1.9,
      animation: false,
      plugins: {
        legend: {
          labels: { color: '#d8e0e8' }
        }
      },
      scales: {
        x: {
          ticks: { color: '#aab6c4' },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#aab6c4' },
          grid: { display: false }
        }
      }
    }
  });
}, 250);


setTimeout(() => {
  const speciesCanvas = document.getElementById('speciesTimelineChart');
  const dailyCanvas = document.getElementById('dailyCatchesChart');

  if (speciesCanvas && dailyCanvas) {
    const dailyContainer = dailyCanvas.parentElement;
    const speciesContainer = speciesCanvas.parentElement;

    if (dailyContainer && speciesContainer) {
      const h = dailyContainer.getBoundingClientRect().height;
      speciesContainer.style.height = h + 'px';
      speciesCanvas.style.height = h + 'px';
    }
  }
}, 500);


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
      if (typeof renderSpeciesTimeline === 'function') renderSpeciesTimeline();
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
    if (typeof renderSpeciesTimeline === 'function') renderSpeciesTimeline();
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
    cell.innerHTML = `<strong>Zone ${zone}</strong><span>${count} Fang${count === 1 ? '' : 'e'}</span>`;

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
    if(typeof renderSpeciesTimeline === 'function') renderSpeciesTimeline();
  } finally {
    state.catches = original;
  }
});
