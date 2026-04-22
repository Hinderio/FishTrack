// === MAP INIT ===
const map = L.map('map').setView([53.5, 10], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// === WEATHER API ===
const WEATHER_API_KEY = "4c5a729e0897dca74d57292846be41ab";

async function getWeather(lat, lon){
  try{
    const res = await fetch(`https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`);
    return await res.json();
  }catch(e){
    console.error(e);
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

    div.onclick = () => {
      weatherEnabled = !weatherEnabled;
      div.classList.toggle("active", weatherEnabled);
    };

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

  if(!data || !data.current) return;

  L.popup()
    .setLatLng(e.latlng)
    .setContent(`
      🌡 <b>${data.current.temp}°C</b><br>
      💨 Wind: ${data.current.wind_speed} m/s<br>
      ☁️ Wolken: ${data.current.clouds}%<br>
      💧 Feuchte: ${data.current.humidity}%<br>
    `)
    .openOn(map);
});
