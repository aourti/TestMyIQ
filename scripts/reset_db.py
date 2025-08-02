import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from extensions import db
import os

def reset_db():
    app = create_app()
    
    with app.app_context():
        # Drop all tables
        db.drop_all()
        print("Dropped all tables!")
        
        # Create all tables
        db.create_all()
        print("Created new tables!")
        
        # Remove the database file (optional)
        try:
            os.remove("instance/iq_test.db")
            print("Removed old database file!")
        except FileNotFoundError:
            pass

if __name__ == "__main__":
    reset_db()
