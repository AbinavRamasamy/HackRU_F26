#This file helps the user sign up with a username and password and sets their prefrences.
import json;
import os;
import hashlib;
from app.schedule_parser import parse_schedule_with_gemini
from app.ics_parser import parse_ics_schedule
from app.user_store import load_users, save_users

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
    speed_options = ["Mosey", "Wander", "Stroll", "Dash", "Zoom"]
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

    distance_options = [ "Less Than 1/4 A Mile", "1/2 A Mile", "3/4 A Mile", "A Mile or More"]
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

    users[username] = {}
    users[username]["walking_speed"] = walking_speed
    users[username]["prefer_walking"] = prefer_walking == "yes"
    users[username]["max_walking_distance"] = max_walking_distance
    users[username]["avoid_bad_weather"] = avoid_bad_weather == "yes"
    users[username]["password"] = Hashed_password

    save_users(users)
    print("New account created! Welcome,", username)

#calander data save


# Runs CLI program only when executed directly
if __name__ == "__main__":
    users = load_users()
    sign_up(users)
