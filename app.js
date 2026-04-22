// === MAP INIT ===
const map = L.map('map').setView([53.5, 10], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// === WEATHER API (Open-Meteo, no API key needed) ===
async function getWeather(lat, lon){
  try{
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if(!res.ok){
      throw new Error(`Weather ${res.status}`);
    }
    const data = await res.json();
    return data.current_weather || null;
  }catch(e){
    console.error("Weather fetch failed:", e);
    return null;
  }
}

// === WEATHER CONTROL BUTTON ===
let weatherEnabled = false;

const WeatherControl = L.Control.extend({
  onAdd: function () {
    const div = L.DomUtil.create('div', 'leaflet-bar weather-control');
    div.innerHTML = "🌡️";

    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.on(div, 'click', (e) => {
      L.DomEvent.stop(e);
      weatherEnabled = !weatherEnabled;
      div.classList.toggle("active", weatherEnabled);
    });

    return div;
  }
});

L.control.weather = function(opts){
  return new WeatherControl(opts);
};

L.control.weather({ position: 'topright' }).addTo(map);

// === MAP CLICK ===
map.on("click", async (e) => {
  if(!weatherEnabled) return;

  const { lat, lng } = e.latlng;
  const data = await getWeather(lat, lng);

  if(!data) return;

  L.popup()
    .setLatLng(e.latlng)
    .setContent(`
      <div class="weather-popup">
        🌡 <b>${Math.round(data.temperature)}°C</b><br>
        💨 Wind: ${Math.round(data.windspeed)} km/h<br>
        🧭 Richtung: ${Math.round(data.winddirection)}°
      </div>
    `)
    .openOn(map);
});
