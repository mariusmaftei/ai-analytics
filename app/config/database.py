import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load environment variables (silently fail if .env doesn't exist)
load_dotenv(verbose=False)

class Database:
    """MongoDB Database Configuration and Connection Handler"""
    
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one database connection"""
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize database configuration"""
        if not hasattr(self, 'initialized'):
            self.mongodb_uri = os.getenv('MONGODB_URI', 'mongodb://localhost:27017/')
            self.db_name = os.getenv('DB_NAME', 'ai_analytics')
            self._connection_failed = False
            self.initialized = True
    
    def _clean_connection_string(self, uri):
        """Remove invalid options from MongoDB connection string"""
        # Remove invalid options that pymongo doesn't recognize
        # Common invalid options: appName variations, custom options
        # Remove query parameters that might be invalid
        # Keep only standard MongoDB connection string parameters
        if '?' in uri:
            base_uri, params = uri.split('?', 1)
            # Filter out known invalid options
            valid_params = []
            for param in params.split('&'):
                key = param.split('=')[0].lower()
                # Keep standard MongoDB options
                if key in ['retrywrites', 'w', 'readpreference', 'ssl', 'tls', 
                          'tlsallowinvalidcertificates', 'tlsallowinvalidhostnames',
                          'authsource', 'authmechanism', 'replicaset', 'maxpoolsize',
                          'minpoolsize', 'maxidletimems', 'connecttimeoutms',
                          'sockettimeoutms', 'serverselectiontimeoutms']:
                    valid_params.append(param)
            if valid_params:
                return f"{base_uri}?{'&'.join(valid_params)}"
            return base_uri
        return uri
    
    def connect(self):
        """
        Establish connection to MongoDB
        Returns: MongoDB database object or None if connection fails
        """
        if self._connection_failed:
            return None
            
        if self._client is None:
            try:
                # Clean connection string to remove invalid options
                clean_uri = self._clean_connection_string(self.mongodb_uri)
                
                # Create MongoDB client with SSL/TLS options
                client_options = {
                    'serverSelectionTimeoutMS': 5000,
                    'connectTimeoutMS': 10000,
                    'socketTimeoutMS': 10000,
                }
                
                # For MongoDB Atlas (connection strings with mongodb+srv://)
                if 'mongodb+srv://' in clean_uri:
                    # MongoDB Atlas requires TLS
                    client_options['tls'] = True
                    client_options['tlsAllowInvalidCertificates'] = False
                
                self._client = MongoClient(clean_uri, **client_options)
                
                # Test the connection
                self._client.admin.command('ping')
                
                # Get database
                self._db = self._client[self.db_name]
                
                print(f"[OK] Successfully connected to MongoDB database: {self.db_name}")
                return self._db
                
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                self._connection_failed = True
                print(f"[WARN] MongoDB connection failed: {str(e)[:200]}...")
                print("[WARN] Database features will be disabled. App will continue without database.")
                self._client = None
                self._db = None
                return None
            except Exception as e:
                self._connection_failed = True
                print(f"[WARN] MongoDB connection error: {str(e)[:200]}...")
                print("[WARN] Database features will be disabled. App will continue without database.")
                self._client = None
                self._db = None
                return None
        
        return self._db
    
    def get_db(self):
        """
        Get the database instance
        Returns: MongoDB database object or None if not connected
        """
        if self._db is None and not self._connection_failed:
            return self.connect()
        return self._db
    
    def get_collection(self, collection_name):
        """
        Get a specific collection from the database
        Args:
            collection_name (str): Name of the collection
        Returns: MongoDB collection object or None if not connected
        """
        db = self.get_db()
        if db is None:
            return None
        return db[collection_name]
    
    def close(self):
        """Close the database connection"""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None
            print("[OK] MongoDB connection closed")
    
    def is_connected(self):
        """
        Check if database is connected
        Returns: bool
        """
        try:
            if self._client:
                self._client.admin.command('ping')
                return True
        except Exception:
            return False
        return False


# Initialize database instance
db = Database()

# Helper functions for easy access
def get_db():
    """Get database instance"""
    return db.get_db()

def get_collection(collection_name):
    """Get specific collection"""
    return db.get_collection(collection_name)

def close_db():
    """Close database connection"""
    db.close()

def init_db():
    """Initialize database connection"""
    return db.connect()

