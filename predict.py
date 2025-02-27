# predict.py
import sys
import subprocess

# Get user input from command-line arguments
user_input = sys.argv[1]

# Call model.py using subprocess
try:
    result = subprocess.run(
        ["python", "model.py", user_input],  # Command to run model.py
        capture_output=True,  # Capture stdout and stderr
        text=True  # Return output as string
    )

    # Print the response (to be captured by Node.js)
    if result.returncode == 0:
        print(result.stdout.strip())  # Success: Print the AI response
    else:
        print(f"Error: {result.stderr.strip()}")  # Error: Print the error message

except Exception as e:
    print(f"Unexpected error: {str(e)}")