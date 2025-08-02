import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from models.user import User

def create_admin():
    app = create_app()
    with app.app_context():
        # Check if user already exists
        user = User.query.filter_by(username='aourti').first()
        if user:
            print("User 'aourti' already exists!")
            return
            
        # Create new admin user
        admin = User(
            username='aourti',
            email='aourti@admin.com',
            is_admin=True
        )
        admin.set_password('123456')
        
        # Add to database
        db.session.add(admin)
        db.session.commit()
        print("Admin user 'aourti' created successfully!")

if __name__ == '__main__':
    create_admin()
