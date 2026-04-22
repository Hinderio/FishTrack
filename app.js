// === MAP INIT ===
const map = L.map('map').setView([53.5, 10], 11);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// === WEATHER API ===

async function getWeather(lat, lon){
  try{
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    if(!res.ok) throw new Error("weather fetch failed");
    const data = await res.json();
    return data.current_weather;
  }catch(e){
    console.error(e);
    return null;
  }
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
      🌡 <b>${data.temperature}°C</b><br>
      💨 Wind: ${data.windspeed} m/s<br>
      ☁️ Wolken: ${data.current.clouds}%<br>
      💧 Feuchte: ${data.current.humidity}%<br>
    `)
    .openOn(map);
});
