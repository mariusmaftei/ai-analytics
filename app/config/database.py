import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
            self.initialized = True
    
    def connect(self):
        """
        Establish connection to MongoDB
        Returns: MongoDB database object
        """
        if self._client is None:
            try:
                # Create MongoDB client
                self._client = MongoClient(
                    self.mongodb_uri,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=10000,
                    socketTimeoutMS=10000
                )
                
                # Test the connection
                self._client.admin.command('ping')
                
                # Get database
                self._db = self._client[self.db_name]
                
                print(f"[OK] Successfully connected to MongoDB database: {self.db_name}")
                return self._db
                
            except ConnectionFailure as e:
                print(f"[ERROR] Failed to connect to MongoDB: {e}")
                raise
            except ServerSelectionTimeoutError as e:
                print(f"[ERROR] MongoDB server selection timeout: {e}")
                raise
            except Exception as e:
                print(f"[ERROR] Unexpected error connecting to MongoDB: {e}")
                raise
        
        return self._db
    
    def get_db(self):
        """
        Get the database instance
        Returns: MongoDB database object
        """
        if self._db is None:
            return self.connect()
        return self._db
    
    def get_collection(self, collection_name):
        """
        Get a specific collection from the database
        Args:
            collection_name (str): Name of the collection
        Returns: MongoDB collection object
        """
        db = self.get_db()
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

