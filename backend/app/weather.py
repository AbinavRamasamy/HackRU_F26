import asynchat
import os
import httpx
from dotenv import load_dotenv, find_dotenv

# Load secret environment variables
load_dotenv(find_dotenv())

api_key = os.getenv("WEATHER_API")
async def get_current_weather(lat: float = 40.501986, lon: float = -74.4474) -> dict:
    url = "https://api.weatherapi.com/v1/current.json"
    params = {
        "key": api_key,
        "q": f"{lat},{lon}"
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        data = response.json()
        # Pull out only the fields you need
        return {
            "temp": data["current"]["temp_f"],
            "feels_like": data["current"]["feelslike_f"],
            "condition": data["current"]["condition"]["text"],
            "is_raining": data["current"]["precip_in"] > 0,
        }
def make_advice(weather: dict) -> dict:
    temp = weather["temp"]
    is_raining = weather["is_raining"]

    # 1. Clothing advice based on temperature and rain
    if is_raining:
        clothing = "Bring an umbrella and wear a rain jacket."
    elif temp < 45:
        clothing = "It's cold outside. Wear a warm coat and layers."
    elif temp > 80:
        clothing = "Warm day. Wear light breathable clothes and stay hydrated."
    else:
        clothing = "Pleasant weather. Normal campus clothes are fine."

    # 2. Transit advice and delay buffer for Rutgers buses
    if is_raining:
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
        }
    }

