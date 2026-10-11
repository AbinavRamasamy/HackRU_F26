import os
import httpx
from fastapi import HTTPException
from dotenv import load_dotenv, find_dotenv

# Load secret environment variables
load_dotenv(find_dotenv())

api_key = os.getenv("WEATHER_API")

COLD_F = 35  # feels-like temp at or below this counts as "cold"; tune as you like
SNOW_WORDS = ["snow", "sleet", "blizzard", "ice pellets"]

<<<<<<< HEAD

=======
>>>>>>> 709dff6e6028bfc6e90a8fc2e0fa725c3abebdcb
async def get_current_weather(lat: float = 40.501986, lon: float = -74.4474) -> dict:
    if not api_key:
        raise RuntimeError("WEATHER_API is not set in .env")

    url = "https://api.weatherapi.com/v1/current.json"
    params = {"key": api_key, "q": f"{lat},{lon}"}

<<<<<<< HEAD
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Weather API error: {response.text}"
                )
            data = response.json()
            current = data["current"]

        condition = current["condition"]["text"]
        is_snowing = any(w in condition.lower() for w in SNOW_WORDS)
        return {
            "temp": current["temp_f"],
            "feels_like": current["feelslike_f"],
            "condition": condition,
            "is_snowing": is_snowing,
            "is_raining": current["precip_in"] > 0 and not is_snowing,
        }
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to reach Weather API service: {str(exc)}"
        )

=======
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        current = response.json()["current"]

    condition = current["condition"]["text"]
    is_snowing = any(w in condition.lower() for w in SNOW_WORDS)
    return {
        "temp": current["temp_f"],
        "feels_like": current["feelslike_f"],
        "condition": condition,
        "is_snowing": is_snowing,
        "is_raining": current["precip_in"] > 0 and not is_snowing,
    }
>>>>>>> 709dff6e6028bfc6e90a8fc2e0fa725c3abebdcb

def evaluate_weather(weather: dict, avoid_rain: bool = True, avoid_snow: bool = True) -> tuple[bool, str]:
    """Returns (is_bad_for_this_user, reason). Step 8 uses this to override walking preference."""
    if weather.get("is_snowing") and avoid_snow:
        return True, "It's snowing."
    if weather.get("is_raining") and avoid_rain:
        return True, "It's raining."
    if weather.get("feels_like", 99) <= COLD_F:
        return True, f"It's cold ({round(weather['feels_like'])}°F feels-like)."
    return False, ""


async def get_forecast(lat: float = 40.501986, lon: float = -74.4474, hours: int = 3) -> list:
    """Short-term forecast: the next few hours."""
    if not api_key:
        raise RuntimeError("WEATHER_API is not set in .env")

    url = "https://api.weatherapi.com/v1/forecast.json"
    params = {"key": api_key, "q": f"{lat},{lon}", "days": 2}

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()

        now_epoch = data["location"]["localtime_epoch"]
        all_hours = [h for day in data["forecast"]["forecastday"] for h in day["hour"]]
        upcoming = [h for h in all_hours if h["time_epoch"] >= now_epoch][:hours]

        return [
            {
                "time": h["time"],
                "temp": h["temp_f"],
                "condition": h["condition"]["text"],
                "rain_chance": h["chance_of_rain"],
                "snow_chance": h["chance_of_snow"],
            }
            for h in upcoming
        ]
    except httpx.RequestError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Unable to reach Weather API service: {str(exc)}"
        )


def make_advice(weather: dict) -> dict:
    temp = weather["temp"]
    is_raining = weather["is_raining"]
    is_snowing = weather.get("is_snowing", False)

    # 1. Clothing advice based on temperature and rain
    if is_snowing:
        clothing = "Snowing. Wear a warm coat, boots, and gloves."
    elif is_raining:
        clothing = "Bring an umbrella and wear a rain jacket."
    elif temp < 45:
        clothing = "It's cold outside. Wear a warm coat and layers."
    elif temp > 80:
        clothing = "Warm day. Wear light breathable clothes and stay hydrated."
    else:
        clothing = "Pleasant weather. Normal campus clothes are fine."

    # 2. Transit advice and delay buffer for Rutgers buses
    if is_snowing:
        commute = "Snow slows buses and sidewalks may be slick. Take the closest stop and leave 10 minutes early."
        delay_buffer = 10
    elif is_raining:
        commute = "Buses get crowded and roads slow down when it rains. Head to the stop 5 minutes earlier."
        delay_buffer = 5
    elif temp < 32:
        commute = "Freezing temperatures: sidewalks may be icy, take the bus instead of walking."
        delay_buffer = 3
    elif temp > 80:
        commute = "It is very hot outside, stay hydrated and drink water while walking to the bus stop."
        delay_buffer = 0
    else:
        commute = "Good commute conditions today."
        delay_buffer = 0

    return {
        "clothing_advice": clothing,
        "commute_advice": commute,
        "delay_buffer_mins": delay_buffer,
    }


# =====================================================================
# STEP 3: COMBINED COMMUTE WEATHER GUIDANCE (ENDPOINT HANDLER)
# =====================================================================
async def get_commute_weather_guidance(lat: float = 40.501986, lon: float = -74.4474) -> dict:
    weather = await get_current_weather(lat, lon)
    advice = make_advice(weather)
    return {
        "status": "success",
        "data": {
            "temperature": weather["temp"],
            "feels_like": weather["feels_like"],
            "condition": weather["condition"],
            "summary": f"{weather['condition']} • {round(weather['temp'])}°F",
            "clothing_advice": advice["clothing_advice"],
            "commute_advice": advice["commute_advice"],
            "delay_buffer_mins": advice["delay_buffer_mins"],
            "is_raining": weather["is_raining"],
            "is_snowing": weather["is_snowing"],
        }
    }
