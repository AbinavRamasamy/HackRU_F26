# Campus Buildings mapping to coordinates and closest bus stops
CAMPUS_BUILDINGS = {
    # Busch Campus
    "hill center": {"code": "HILL", "campus": "Busch", "stop": "Hill Center", "coords": [40.5218, -74.4626]},
    "hll": {"code": "HLL", "campus": "Busch", "stop": "Hill Center", "coords": [40.5218, -74.4626]},
    "hil": {"code": "HIL", "campus": "Busch", "stop": "Hill Center", "coords": [40.5218, -74.4626]},
    "serc": {"code": "SERC", "campus": "Busch", "stop": "Science Building", "coords": [40.5228, -74.4638]},
    "sec": {"code": "SEC", "campus": "Busch", "stop": "Science Building", "coords": [40.5228, -74.4638]},
    "science building": {"code": "SEC", "campus": "Busch", "stop": "Science Building", "coords": [40.5230, -74.4635]},
    "richard weeks hall": {"code": "WEEKS", "campus": "Busch", "stop": "Science Building", "coords": [40.5238, -74.4619]},
    "arc": {"code": "ARC", "campus": "Busch", "stop": "Allison Road Classrooms", "coords": [40.5242, -74.4646]},
    "allison road classrooms": {"code": "ARC", "campus": "Busch", "stop": "Allison Road Classrooms", "coords": [40.5242, -74.4646]},
    "busch student center": {"code": "BSC", "campus": "Busch", "stop": "Busch Student Center", "coords": [40.5233, -74.4586]},
    "wright": {"code": "WSH", "campus": "Busch", "stop": "Science Building", "coords": [40.5235, -74.4630]},
    "ccb": {"code": "CCB", "campus": "Busch", "stop": "Science Building", "coords": [40.5238, -74.4619]},
    "pharmacy": {"code": "PH", "campus": "Busch", "stop": "Allison Road Classrooms", "coords": [40.5240, -74.4650]},
    
    # Livingston Campus
    "tillett hall": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "til": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "beck hall": {"code": "BECK", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5248, -74.4385]},
    "rutgers business school": {"code": "RBS", "campus": "Livingston", "stop": "Livingston Plaza", "coords": [40.5273, -74.4398]},
    "livingston plaza": {"code": "PLAZA", "campus": "Livingston", "stop": "Livingston Plaza", "coords": [40.5273, -74.4398]},
    "livingston student center": {"code": "LSC", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5241, -74.4357]},
    "lucy stone hall": {"code": "LSH", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5238, -74.4365]},
    "lsh": {"code": "LSH", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5238, -74.4365]},
    "tillet": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "quads": {"code": "QUADS", "campus": "Livingston", "stop": "Quads", "coords": [40.5214, -74.4348]},
    "quad 3": {"code": "QUAD3", "campus": "Livingston", "stop": "Quads", "coords": [40.5214, -74.4348]},
    "quad three": {"code": "QUAD3", "campus": "Livingston", "stop": "Quads", "coords": [40.5214, -74.4348]},
    
    # College Avenue Campus
    "academic building": {"code": "AB", "campus": "College Ave", "stop": "The Yard", "coords": [40.5015, -74.4485]},
    "ab": {"code": "AB", "campus": "College Ave", "stop": "The Yard", "coords": [40.5015, -74.4485]},
    "ci": {"code": "CI", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5045, -74.4505]},
    "sc&i": {"code": "CI", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5045, -74.4505]},
    "murray hall": {"code": "MUR", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4996, -74.4473]},
    "scott hall": {"code": "SCOTT", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4991, -74.4478]},
    "college avenue student center": {"code": "CASC", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5028, -74.4518]},
    "college ave student center": {"code": "CASC", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5028, -74.4518]},
    "student activities center": {"code": "SAC", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4990, -74.4445]},
    "sac": {"code": "SAC", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4990, -74.4445]},
    "socam apts": {"code": "SOCAM", "campus": "College Ave", "stop": "SoCam Apts", "coords": [40.4918, -74.4436]},
    "socam": {"code": "SOCAM", "campus": "College Ave", "stop": "SoCam Apts", "coords": [40.4918, -74.4436]},
    "hardenbergh hall": {"code": "HARD", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5034, -74.4502]},
    "voorhees hall": {"code": "VWH", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4998, -74.4468]},
    "van dyck hall": {"code": "VD", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.5002, -74.4462]},
    "the yard": {"code": "YARD", "campus": "College Ave", "stop": "The Yard", "coords": [40.5015, -74.4485]},

    # Cook / Douglass Campus
    "college hall": {"code": "CH", "campus": "Douglass", "stop": "College Hall", "coords": [40.4851, -74.4376]},
    "hickman hall": {"code": "HICK", "campus": "Douglass", "stop": "College Hall", "coords": [40.4851, -74.4376]},
    "hick": {"code": "HICK", "campus": "Douglass", "stop": "College Hall", "coords": [40.4851, -74.4376]},
    "loreee gym": {"code": "LOREE", "campus": "Douglass", "stop": "College Hall", "coords": [40.4842, -74.4368]},
    "loree": {"code": "LOREE", "campus": "Douglass", "stop": "College Hall", "coords": [40.4842, -74.4368]},
    "cook student center": {"code": "CSC", "campus": "Cook", "stop": "Biel Road", "coords": [40.4802, -74.4312]},
    "red oak lane": {"code": "RO", "campus": "Cook", "stop": "Red Oak Lane", "coords": [40.4815, -74.4348]},
    "lipman hall": {"code": "LIP", "campus": "Cook", "stop": "Lipman Hall", "coords": [40.4835, -74.4365]},
    "biel road": {"code": "BIEL", "campus": "Cook", "stop": "Biel Road", "coords": [40.4802, -74.4312]},
    "henderson": {"code": "HEND", "campus": "Cook", "stop": "Henderson", "coords": [40.4780, -74.4360]},
    "gibbons": {"code": "GIBB", "campus": "Douglass", "stop": "Gibbons", "coords": [40.4770, -74.4370]},
    "food science building": {"code": "FOOD", "campus": "Cook", "stop": "Biel Road", "coords": [40.4796, -74.4287]}
}

# Major Rutgers Bus Stops (Authoritative 17 stops)
CAMPUS_STOPS = {
    # Busch
    "Busch Student Center": {"campus": "Busch", "coords": [40.5233, -74.4586], "routes": ["A", "B", "H", "REXB", "Weekend 1", "Weekend 2"]},
    "Hill Center": {"campus": "Busch", "coords": [40.5218, -74.4626], "routes": ["A", "B", "H", "REXB", "Weekend 1", "Weekend 2"]},
    "Science Building": {"campus": "Busch", "coords": [40.5230, -74.4635], "routes": ["A", "B", "H", "REXB"]},
    "Allison Road Classrooms": {"campus": "Busch", "coords": [40.5242, -74.4646], "routes": ["A", "B", "H", "REXB", "Weekend 1", "Weekend 2"]},

    # Livingston
    "Livingston Plaza": {"campus": "Livingston", "coords": [40.5273, -74.4398], "routes": ["B", "LX", "REXL", "Weekend 1", "Weekend 2"]},
    "Livingston Student Center": {"campus": "Livingston", "coords": [40.5241, -74.4357], "routes": ["B", "LX", "REXL", "Weekend 1", "Weekend 2"]},
    "Quads": {"campus": "Livingston", "coords": [40.5214, -74.4348], "routes": ["B", "LX"]},

    # College Avenue
    "College Avenue Student Center": {"campus": "College Ave", "coords": [40.5028, -74.4518], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},
    "The Yard": {"campus": "College Ave", "coords": [40.5015, -74.4485], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},
    "Student Activities Center": {"campus": "College Ave", "coords": [40.4990, -74.4445], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},
    "SoCam Apts": {"campus": "College Ave", "coords": [40.4918, -74.4436], "routes": ["F", "EE"]},

    # Cook / Douglass
    "College Hall": {"campus": "Douglass", "coords": [40.4851, -74.4376], "routes": ["F", "EE", "REXB", "REXL", "Weekend 1", "Weekend 2"]},
    "Red Oak Lane": {"campus": "Cook", "coords": [40.4815, -74.4348], "routes": ["F", "EE", "REXB", "REXL", "Weekend 1", "Weekend 2"]},
    "Lipman Hall": {"campus": "Cook", "coords": [40.4835, -74.4365], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
    "Biel Road": {"campus": "Cook", "coords": [40.4802, -74.4312], "routes": ["F", "EE", "REXB", "REXL", "Weekend 1", "Weekend 2"]},
    "Henderson": {"campus": "Cook", "coords": [40.4780, -74.4360], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
    "Gibbons": {"campus": "Douglass", "coords": [40.4770, -74.4370], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
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
