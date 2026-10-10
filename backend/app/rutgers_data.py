# Campus Buildings mapping to coordinates and closest bus stops
CAMPUS_BUILDINGS = {
    # Busch Campus
    "hill center": {"code": "HILL", "campus": "Busch", "stop": "Hill Center", "coords": [40.52192, -74.4633]},
    "hll": {"code": "HLL", "campus": "Busch", "stop": "Hill Center", "coords": [40.52192, -74.4633]},
    "hil": {"code": "HIL", "campus": "Busch", "stop": "Hill Center", "coords": [40.52192, -74.4633]},
    "serc": {"code": "SERC", "campus": "Busch", "stop": "Science Building", "coords": [40.5228, -74.4638]},
    "sec": {"code": "SEC", "campus": "Busch", "stop": "Science Building", "coords": [40.52394, -74.46422]},
    "science building": {"code": "SEC", "campus": "Busch", "stop": "Science Building", "coords": [40.52394, -74.46422]},
    "richard weeks hall": {"code": "WEEKS", "campus": "Busch", "stop": "Science Building", "coords": [40.5238, -74.4619]},
    "arc": {"code": "ARC", "campus": "Busch", "stop": "Allison Road Classrooms", "coords": [40.52356, -74.46519]},
    "allison road classrooms": {"code": "ARC", "campus": "Busch", "stop": "Allison Road Classrooms", "coords": [40.52356, -74.46519]},
    "busch student center": {"code": "BSC", "campus": "Busch", "stop": "Busch Student Center", "coords": [40.5238, -74.45826]},
    "wright": {"code": "WSH", "campus": "Busch", "stop": "Science Building", "coords": [40.5235, -74.4630]},
    "ccb": {"code": "CCB", "campus": "Busch", "stop": "Science Building", "coords": [40.5238, -74.4619]},
    "pharmacy": {"code": "PH", "campus": "Busch", "stop": "Allison Road Classrooms", "coords": [40.5240, -74.4650]},
    
    # Livingston Campus
    "tillett hall": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "til": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "beck hall": {"code": "BECK", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5248, -74.4385]},
    "rutgers business school": {"code": "RBS", "campus": "Livingston", "stop": "Livingston Plaza", "coords": [40.52511, -74.43858]},
    "livingston plaza": {"code": "PLAZA", "campus": "Livingston", "stop": "Livingston Plaza", "coords": [40.52511, -74.43858]},
    "livingston student center": {"code": "LSC", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.524, -74.43663]},
    "lucy stone hall": {"code": "LSH", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5238, -74.4365]},
    "lsh": {"code": "LSH", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5238, -74.4365]},
    "tillet": {"code": "TIL", "campus": "Livingston", "stop": "Livingston Student Center", "coords": [40.5255, -74.4371]},
    "quads": {"code": "QUADS", "campus": "Livingston", "stop": "Quads", "coords": [40.51986, -74.43357]},
    "quad 3": {"code": "QUAD3", "campus": "Livingston", "stop": "Quads", "coords": [40.51986, -74.43357]},
    "quad three": {"code": "QUAD3", "campus": "Livingston", "stop": "Quads", "coords": [40.51986, -74.43357]},
    
    # College Avenue Campus
    "academic building": {"code": "AB", "campus": "College Ave", "stop": "The Yard", "coords": [40.49957, -74.44824]},
    "ab": {"code": "AB", "campus": "College Ave", "stop": "The Yard", "coords": [40.49957, -74.44824]},
    "ci": {"code": "CI", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5045, -74.4505]},
    "sc&i": {"code": "CI", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5045, -74.4505]},
    "murray hall": {"code": "MUR", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4996, -74.4473]},
    "scott hall": {"code": "SCOTT", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4991, -74.4478]},
    "college avenue student center": {"code": "CASC", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.50366, -74.4524]},
    "college ave student center": {"code": "CASC", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.50366, -74.4524]},
    "student activities center": {"code": "SAC", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.50391, -74.44882]},
    "sac": {"code": "SAC", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.50391, -74.44882]},
    "socam apts": {"code": "SOCAM", "campus": "College Ave", "stop": "SoCam Apts", "coords": [40.49186, -74.44309]},
    "socam": {"code": "SOCAM", "campus": "College Ave", "stop": "SoCam Apts", "coords": [40.49186, -74.44309]},
    "hardenbergh hall": {"code": "HARD", "campus": "College Ave", "stop": "College Avenue Student Center", "coords": [40.5034, -74.4502]},
    "voorhees hall": {"code": "VWH", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.4998, -74.4468]},
    "van dyck hall": {"code": "VD", "campus": "College Ave", "stop": "Student Activities Center", "coords": [40.5002, -74.4462]},
    "the yard": {"code": "YARD", "campus": "College Ave", "stop": "The Yard", "coords": [40.49957, -74.44824]},

    # Cook / Douglass Campus
    "college hall": {"code": "CH", "campus": "Douglass", "stop": "College Hall", "coords": [40.48551, -74.4372]},
    "hickman hall": {"code": "HICK", "campus": "Douglass", "stop": "College Hall", "coords": [40.48551, -74.4372]},
    "hick": {"code": "HICK", "campus": "Douglass", "stop": "College Hall", "coords": [40.48551, -74.4372]},
    "loreee gym": {"code": "LOREE", "campus": "Douglass", "stop": "College Hall", "coords": [40.4842, -74.4368]},
    "loree": {"code": "LOREE", "campus": "Douglass", "stop": "College Hall", "coords": [40.4842, -74.4368]},
    "cook student center": {"code": "CSC", "campus": "Cook", "stop": "Biel Road", "coords": [40.48, -74.43252]},
    "red oak lane": {"code": "RO", "campus": "Cook", "stop": "Red Oak Lane", "coords": [40.48299, -74.43753]},
    "lipman hall": {"code": "LIP", "campus": "Cook", "stop": "Lipman Hall", "coords": [40.48129, -74.43627]},
    "biel road": {"code": "BIEL", "campus": "Cook", "stop": "Biel Road", "coords": [40.48, -74.43252]},
    "henderson": {"code": "HEND", "campus": "Cook", "stop": "Henderson", "coords": [40.48095, -74.42872]},
    "gibbons": {"code": "GIBB", "campus": "Douglass", "stop": "Gibbons", "coords": [40.48523, -74.43194]},
    "food science building": {"code": "FOOD", "campus": "Cook", "stop": "Biel Road", "coords": [40.4796, -74.4287]}
}

# Authoritative Rutgers New Brunswick Bus Stops from transitstat.us/rutgers
CAMPUS_STOPS = {
    # Busch Campus
    "Busch Student Center": {"id": "10052", "campus": "Busch", "coords": [40.5238, -74.45826], "routes": ["A", "B", "H", "REXB", "C", "Weekend 1", "Weekend 2"]},
    "Hill Center": {"id": "10034", "campus": "Busch", "coords": [40.52192, -74.4633], "routes": ["A", "B", "H", "REXB", "C", "Weekend 1", "Weekend 2"]},
    "Hill Center (NB)": {"id": "10034", "campus": "Busch", "coords": [40.52192, -74.4633], "routes": ["A", "B", "H", "REXB", "Weekend 1"]},
    "Hill Center (SB)": {"id": "21050", "campus": "Busch", "coords": [40.52193, -74.46331], "routes": ["Weekend 2"]},
    "Science Building": {"id": "10041", "campus": "Busch", "coords": [40.52394, -74.46422], "routes": ["A", "B", "H", "REXB", "Weekend 1"]},
    "Allison Road Classrooms": {"id": "10039", "campus": "Busch", "coords": [40.52356, -74.46519], "routes": ["A", "B", "H", "REXB", "C", "Weekend 2"]},
    "Stadium West Lot": {"id": "10060", "campus": "Busch", "coords": [40.51456, -74.46615], "routes": ["C", "A", "H"]},
    "Werblin Recreation Center": {"id": "10089", "campus": "Busch", "coords": [40.51864, -74.45985], "routes": ["C"]},

    # Livingston Campus
    "Livingston Student Center": {"id": "10029", "campus": "Livingston", "coords": [40.524, -74.43663], "routes": ["B", "LX", "REXL", "Weekend 1", "Weekend 2"]},
    "Livingston Plaza": {"id": "10071", "campus": "Livingston", "coords": [40.52511, -74.43858], "routes": ["B", "LX", "REXL", "Weekend 1", "Weekend 2"]},
    "Quads": {"id": "10065", "campus": "Livingston", "coords": [40.51986, -74.43357], "routes": ["B", "LX", "Weekend 1", "Weekend 2"]},
    "Jersey Mike's Arena": {"id": "153546", "campus": "Livingston", "coords": [40.52435, -74.44064], "routes": ["B", "LX"]},

    # College Avenue Campus
    "College Avenue Student Center": {"id": "10035", "campus": "College Ave", "coords": [40.50366, -74.4524], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},
    "The Yard": {"id": "27767", "campus": "College Ave", "coords": [40.49957, -74.44824], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},
    "Student Activities Center": {"id": "10038", "campus": "College Ave", "coords": [40.50391, -74.44882], "routes": ["LX", "A", "H", "F", "EE", "Weekend 1", "Weekend 2"]},
    "Student Activities Center (NB)": {"id": "10038", "campus": "College Ave", "coords": [40.50391, -74.44882], "routes": ["Weekend 1", "Weekend 2"]},
    "Student Activities Center (SB)": {"id": "12913", "campus": "College Ave", "coords": [40.50425, -74.44974], "routes": ["Weekend 1"]},
    "SoCam Apts": {"id": "10075", "campus": "College Ave", "coords": [40.49186, -74.44309], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
    "SoCam Apts (NB)": {"id": "62662", "campus": "College Ave", "coords": [40.49224, -74.44267], "routes": ["Weekend 1"]},
    "SoCam Apts (SB)": {"id": "10075", "campus": "College Ave", "coords": [40.49186, -74.44309], "routes": ["Weekend 2"]},

    # Cook / Douglass Campus
    "College Hall": {"id": "10036", "campus": "Douglass", "coords": [40.48551, -74.4372], "routes": ["F", "EE", "REXB", "REXL", "Weekend 1", "Weekend 2"]},
    "Red Oak Lane": {"id": "10037", "campus": "Cook", "coords": [40.48299, -74.43753], "routes": ["F", "EE", "REXB", "REXL", "Weekend 1", "Weekend 2"]},
    "Lipman Hall": {"id": "10059", "campus": "Cook", "coords": [40.48129, -74.43627], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
    "Biel Road": {"id": "10042", "campus": "Cook", "coords": [40.48, -74.43252], "routes": ["F", "EE", "REXB", "REXL", "Weekend 1", "Weekend 2"]},
    "Henderson": {"id": "10026", "campus": "Cook", "coords": [40.48095, -74.42872], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
    "Gibbons": {"id": "10061", "campus": "Douglass", "coords": [40.48523, -74.43194], "routes": ["F", "EE", "Weekend 1", "Weekend 2"]},
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
