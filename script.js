const cityInput = document.getElementById('city-input');
const cityName = document.getElementById('city-name');
const dateText = document.getElementById('date-text');
const tempEl = document.getElementById('current-temp');
const conditionEl = document.getElementById('condition-text');
const windEl = document.getElementById('wind-speed');
const humidityEl = document.getElementById('humidity');
const canvas = document.getElementById('tempChart');
const ctx = canvas.getContext('2d');

// 1. Search Logic (Geocoding API)
async function searchCity() {
    const query = cityInput.value;
    if (!query) return;

    // Use Open-Meteo Geocoding API to find Lat/Lon
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=1&language=en&format=json`;

    try {
        const response = await fetch(geoUrl);
        const data = await response.json();

        if (data.results && data.results.length > 0) {
            const result = data.results[0];
            const name = result.name;
            const country = result.country;
            const lat = result.latitude;
            const lon = result.longitude;

            cityName.innerText = `${name}, ${country}`;
            fetchWeather(lat, lon); // Pass coords to weather function
        } else {
            alert("City not found!");
        }
    } catch (err) {
        console.error(err);
        alert("Error searching city.");
    }
}

// Allow pressing "Enter" key
function handleEnter(e) {
    if (e.key === 'Enter') searchCity();
}

// 2. Get User Location (GPS)
function getLocation() {
    if (navigator.geolocation) {
        cityName.innerText = "Locating...";
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        alert("Geolocation not supported");
    }
}

function success(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    cityName.innerText = "My Location";
    fetchWeather(lat, lon);
}

function error() {
    alert("Could not retrieve location. Please search manually.");
}

// 3. Fetch Weather Data (Forecast API)
async function fetchWeather(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,weathercode&timezone=auto`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        
        updateUI(data);
        drawChart(data.hourly.temperature_2m.slice(0, 24)); 
    } catch (err) {
        console.error(err);
        cityName.innerText = "Error loading weather";
    }
}

// 4. Update UI
function updateUI(data) {
    const current = data.current_weather;
    
    tempEl.innerText = Math.round(current.temperature);
    windEl.innerText = `${current.windspeed} km/h`;
    
    const code = current.weathercode;
    conditionEl.innerText = getWeatherText(code);
    updateIcon(code);

    // Humidity (Get current hour's humidity)
    const currentHourIndex = new Date().getHours();
    humidityEl.innerText = `${data.hourly.relativehumidity_2m[currentHourIndex]}%`;
    
    // Date
    const now = new Date();
    dateText.innerText = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// 5. Draw Custom Graph
function drawChart(temps) {
    // High-DPI Canvas Scaling
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    
    ctx.clearRect(0, 0, w, h);
    
    const maxTemp = Math.max(...temps) + 2;
    const minTemp = Math.min(...temps) - 2;
    const padding = 20;
    const stepX = (w - padding * 2) / (temps.length - 1);
    
    const getY = (temp) => h - padding - ((temp - minTemp) / (maxTemp - minTemp)) * (h - padding * 2);

    // Draw Line
    ctx.beginPath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    temps.forEach((temp, i) => {
        const x = padding + i * stepX;
        const y = getY(temp);
        if(i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw Fill
    ctx.lineTo(w - padding, h);
    ctx.lineTo(padding, h);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, "rgba(255, 255, 255, 0.3)");
    gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw Points
    ctx.fillStyle = "white";
    temps.forEach((temp, i) => {
        if(i % 4 === 0) { // Every 4th point
            const x = padding + i * stepX;
            const y = getY(temp);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
            
            // Text
            ctx.font = "bold 12px Arial";
            ctx.fillText(`${Math.round(temp)}°`, x - 10, y - 10);
        }
    });
}

// Helpers
function getWeatherText(code) {
    const codes = { 0: "Clear Sky", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast", 45: "Fog", 51: "Drizzle", 61: "Rain", 71: "Snow", 95: "Thunderstorm" };
    return codes[code] || "Variable";
}

function updateIcon(code) {
    const icon = document.getElementById('weather-icon');
    icon.className = 'fas'; // Reset
    if(code === 0) icon.classList.add('fa-sun');
    else if(code < 3) icon.classList.add('fa-cloud-sun');
    else if(code < 50) icon.classList.add('fa-cloud');
    else if(code < 70) icon.classList.add('fa-cloud-rain');
    else if(code < 80) icon.classList.add('fa-snowflake');
    else icon.classList.add('fa-bolt');
}

// Initial Load (Default City)
searchCity('New York');
