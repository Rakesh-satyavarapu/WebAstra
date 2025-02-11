import sys
import pickle
from sklearn.feature_extraction.text import CountVectorizer

# Load the saved model and vectorizer
with open('spam_classifier.pkl', 'rb') as model_file:
    model = pickle.load(model_file)

with open('vectorizer.pkl', 'rb') as vectorizer_file:
    vectorizer = pickle.load(vectorizer_file)

# Get the email text from the command line argument
email_text = sys.argv[1]

# Convert the email text to the same format the model was trained on
email_vectorized = vectorizer.transform([email_text])

# Make the prediction
prediction = model.predict(email_vectorized)

# Debugging: Check the prediction output and the class labels
print(f"Predicted as: {prediction[0]}")  # Print predicted label (0 for ham, 1 for spam)

# Return the prediction result
# if prediction[0] == 1:
#     print('spam')
# else:
#     print('ham')
