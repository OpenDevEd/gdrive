import json

# Load the provided JSON data
file_path = 'Working version [ETD] Keyword inventory - Understanding the quality of EdTech interventions and implementation for disadvantaged pupils (v1).json'
with open(file_path, 'r') as file:
    data = json.load(file)


# Function to process each term according to the specified rules
def process_term(term):
    processed = [term]  # Start with the original term

    # Handling hyphenation
    if '-' in term:
        processed.append(term.replace('-', ' '))

    # Handling plural forms
    if term.endswith('s'):
        processed.append(term[:-1])

    # Escaping characters
    processed = [t.replace('(', '\\(').replace(')', '\\)').replace("'", "\\'") for t in processed]

    return list(set(processed))  # Ensure uniqueness

# Apply the transformations to all terms in the dataset
processed_terms = {term[0]: process_term(term[0]) for term in data}

processed_terms  # Display the processed terms and their variations

# Save the processed terms in a JSON file
processed_file_path = 'Processed_Keyword_Outcomes.json'
with open(processed_file_path, 'w') as file:
    json.dump(processed_terms, file, indent=4)

processed_file_path
