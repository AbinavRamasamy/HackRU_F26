import json;
import os;

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
USERS_NAME = os.path.join(BACKEND_DIR, "users.json")

#checks if the user file area exists or not, (account exists or not)
def load_users():
    if os.path.exists(USERS_NAME):
        with open(USERS_NAME, "r") as f:
            return json.load(f) 
    return{}

#saves user data that is written into username file
def save_users(users):
  with open(USERS_NAME, "w") as f:
        json.dump(users, f, indent=4)