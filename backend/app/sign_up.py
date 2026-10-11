#This file helps the user sign up with a username and password and sets their prefrences.
import json;
import os;
import hashlib;
from app.schedule_parser import parse_schedule_with_gemini
from app.ics_parser import parse_ics_schedule
from app.user_store import load_users, save_users
from app.constants import SPEED_OPTIONS, DISTANCE_OPTIONS

#creates user, password, and prefrences
def sign_up(users):
    username = input("Create a Username:").strip().lower()
    if username == "":
        print("Username can't be empty, please make a real username:")
        sign_up(users)
        return
    if len(username) < 3:
        print("Username is too short, please make a username longer than 2 elements:")
        sign_up(users)
        return
    if username in users:
        print("Username already in use, please make another username:")
        sign_up(users)
        return
    while True:
        password = input("Create a Password:").strip()
        password_check = input("Retype the same Password:").strip()
        if password != password_check:
            print("Password does not match, please make sure they match:")
        if password == password_check:
            print("Valid Passowrd")
            break

    Hashed_password = hashlib.sha256(password.encode()).hexdigest()
    speed_options = list(SPEED_OPTIONS)
    while True:
        print("Choose a walking speed:")
        for i in range(len(speed_options)):
            print(i + 1, "-", speed_options[i])
        choice = input("Enter a number (1-5): ")
        if choice.isdigit() and  1 <= int(choice) <= len(speed_options):
            break
        print("Please enter a value from 1-5: ")
    walking_speed = speed_options[int(choice) - 1]

    while(True):
        prefer_walking = input("Do you prefer to walk? (yes/no): ").strip().lower()
        if prefer_walking == "yes" or prefer_walking == "no":
            break
        else:
            print("Please enter yes or no:")

    distance_options = list(DISTANCE_OPTIONS)
    while(True):
        print("How far are you willing to walk: ")
        for i in range(len(distance_options)):
            print(i + 1, "-", distance_options[i])
        choice = input("Enter a number (1-4): ")
        if choice.isdigit() and 1 <= int(choice) <= len(distance_options):
            break
        print("Please enter a value from 1-4: ")
    max_walking_distance = distance_options[int(choice) - 1]

    while(True):
        avoid_bad_weather = input("Do you want to avoid bad weather(rain,snow, etc.)? (yes/no): ").strip().lower()
        if avoid_bad_weather == "yes" or avoid_bad_weather == "no":
            break
        else:
            print("Please enter yes or no:")
    avoid_rain = avoid_snow = False
    if avoid_bad_weather == "yes":
        while True:
            avoid_rain = input("Avoid rain? (yes/no): ").strip().lower()
            if avoid_rain in ("yes", "no"):
                break
            print("Please enter yes or no:")
        while True:
            avoid_snow = input("Avoid snow? (yes/no): ").strip().lower()
            if avoid_snow in ("yes", "no"):
                break
            print("Please enter yes or no:")
        avoid_rain = avoid_rain == "yes"
        avoid_snow = avoid_snow == "yes"

    while True:
        further = input("Would you walk to a farther stop to catch a faster bus? (yes/no): ").strip().lower()
        if further in ("yes", "no"):
            break
        print("Please enter yes or no:")

    while True:
        print("What matters more to you?")
        print("1 - Fastest arrival")
        print("2 - Least walking")
        pchoice = input("Enter a number (1-2): ").strip()
        if pchoice in ("1", "2"):
            break
        print("Please enter 1 or 2:")
    priority = "fastest_arrival" if pchoice == "1" else "least_walking"

    calendar_url = input("Paste your calendar feed URL (or press Enter to skip): ").strip()
    if calendar_url.startswith("webcal://"):
        calendar_url = "https://" + calendar_url[9:]
    users[username] = {}
    users[username]["walking_speed"] = walking_speed
    users[username]["prefer_walking"] = prefer_walking == "yes"
    users[username]["max_walking_distance"] = max_walking_distance
    users[username]["avoid_bad_weather"] = avoid_bad_weather == "yes"
    users[username]["password"] = Hashed_password
    users[username]["calendar_url"] = calendar_url or None
    users[username]["willing_to_walk_further"] = further == "yes"
    users[username]["priority"] = priority
    users[username]["avoid_rain"] = avoid_rain
    users[username]["avoid_snow"] = avoid_snow

    save_users(users)
    print("New account created! Welcome,", username)

#calander data save


# Runs CLI program only when executed directly
if __name__ == "__main__":
    users = load_users()
    sign_up(users)
