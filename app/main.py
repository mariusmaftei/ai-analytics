from flask import Flask
from flask_cors import CORS

port = 8080

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

@app.route('/')
def home():
    return {'message': 'Welcome to the API!', 'status': 'running'}

@app.route('/api/health')
def health():
    return {'status': 'healthy'}

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=port, debug=True,)
print(f"Server is running on port {port}")

