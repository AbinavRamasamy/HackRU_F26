# Campus Buildings mapping to coordinates and closest bus stops
CAMPUS_BUILDINGS = {
    # Busch Campus
    "hill center": {"code": "HILL", "campus": "Busch", "stop": "Hill Center", "coords": [40.5218, -74.4626]},
    "serc": {"code": "SERC", "campus": "Busch", "stop": "Science Buildings", "coords": [40.5228, -74.4638]},
    "richard weeks hall": {"code": "WEEKS", "campus": "Busch", "stop": "Science Buildings", "coords": [40.5238, -74.4619]},
    "arc": {"code": "ARC", "campus": "Busch", "stop": "Allison Road Classroom", "coords": [40.5242, -74.4646]},
    "busch student center": {"code": "BSC", "campus": "Busch", "stop": "Busch Student Center", "coords": [40.5233, -74.4586]},
    
    # Livingston Campus
    "tillett hall": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "beck hall": {"code": "BECK", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5248, -74.4385]},
    "rutgers business school": {"code": "RBS", "campus": "Livingston", "stop": "Livingston Plaza", "coords": [40.5273, -74.4398]},
    "livingston student center": {"code": "LSC", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5241, -74.4357]},
    "tillet": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    
    # College Avenue Campus
    "academic building": {"code": "AB", "campus": "College Ave", "stop": "The Yard", "coords": [40.5015, -74.4485]},
    "murray hall": {"code": "MUR", "campus": "College Ave", "stop": "Scott Hall", "coords": [40.4996, -74.4473]},
    "scott hall": {"code": "SCOTT", "campus": "College Ave", "stop": "Scott Hall", "coords": [40.4991, -74.4478]},
    "college ave student center": {"code": "CASC", "campus": "College Ave", "stop": "Student Center", "coords": [40.5028, -74.4518]},
    "hardenbergh hall": {"code": "HARD", "campus": "College Ave", "stop": "Student Center", "coords": [40.5034, -74.4502]},

    # Cook / Douglass Campus
    "hickman hall": {"code": "HICK", "campus": "Douglass", "stop": "College Hall", "coords": [40.4851, -74.4376]},
    "loreee gym": {"code": "LOREE", "campus": "Douglass", "stop": "College Hall", "coords": [40.4842, -74.4368]},
    "cook student center": {"code": "CSC", "campus": "Cook", "stop": "Biel Road", "coords": [40.4802, -74.4312]},
    "food science building": {"code": "FOOD", "campus": "Cook", "stop": "Food Sciences Building", "coords": [40.4796, -74.4287]}
}

# Major Rutgers Bus Stops
CAMPUS_STOPS = {
    "Hill Center": {"campus": "Busch", "coords": [40.5218, -74.4626], "routes": ["A", "B", "H", "REXB", "Weekend 1", "Weekend 2"]},
    "Science Buildings": {"campus": "Busch", "coords": [40.5230, -74.4635], "routes": ["A", "B", "H", "REXB"]},
    "Allison Road Classroom": {"campus": "Busch", "coords": [40.5242, -74.4646], "routes": ["A", "B", "H", "REXB"]},
    "Busch Student Center": {"campus": "Busch", "coords": [40.5233, -74.4586], "routes": ["A", "B", "H", "REXB"]},
    
    "Livingston Student Center": {"campus": "Livingston", "coords": [40.5241, -74.4357], "routes": ["B", "LX", "REXL", "Weekend 1", "Weekend 2"]},
    "Livingston Plaza": {"campus": "Livingston", "coords": [40.5273, -74.4398], "routes": ["B", "LX", "REXL"]},
    "Quads": {"campus": "Livingston", "coords": [40.5202, -74.4389], "routes": ["B", "LX"]},

    "The Yard": {"campus": "College Ave", "coords": [40.5015, -74.4485], "routes": ["LX", "A", "H", "F", "EE"]},
    "Scott Hall": {"campus": "College Ave", "coords": [40.4991, -74.4478], "routes": ["LX", "A", "H", "F", "EE"]},
    "Student Center": {"campus": "College Ave", "coords": [40.5028, -74.4518], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},

    "College Hall": {"campus": "Douglass", "coords": [40.4851, -74.4376], "routes": ["F", "EE", "REXB", "REXL"]},
    "Red Oak Lane": {"campus": "Cook", "coords": [40.4815, -74.4348], "routes": ["F", "EE", "REXB", "REXL"]},
    "Biel Road": {"campus": "Cook", "coords": [40.4802, -74.4312], "routes": ["F", "EE", "REXB", "REXL"]}
}

# Average inter-campus transit base times in minutes (off-peak vs peak)
TRANSIT_MATRIX = {
    ("College Ave", "Livingston"): {"routes": ["LX"], "base_minutes": 10, "peak_minutes": 22},
    ("Livingston", "College Ave"): {"routes": ["LX"], "base_minutes": 10, "peak_minutes": 20},
    ("College Ave", "Busch"): {"routes": ["A", "H"], "base_minutes": 9, "peak_minutes": 18},
    ("Busch", "College Ave"): {"routes": ["A", "H"], "base_minutes": 9, "peak_minutes": 18},
    ("Busch", "Livingston"): {"routes": ["B"], "base_minutes": 7, "peak_minutes": 12},
    ("Livingston", "Busch"): {"routes": ["B"], "base_minutes": 7, "peak_minutes": 12},
    ("College Ave", "Douglass"): {"routes": ["F", "EE"], "base_minutes": 10, "peak_minutes": 20},
    ("Douglass", "College Ave"): {"routes": ["F", "EE"], "base_minutes": 10, "peak_minutes": 20},
    ("Busch", "Cook"): {"routes": ["REXB"], "base_minutes": 15, "peak_minutes": 28},
    ("Livingston", "Cook"): {"routes": ["REXL"], "base_minutes": 15, "peak_minutes": 28}
}
