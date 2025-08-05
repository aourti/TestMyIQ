#!/usr/bin/env python3
"""
Check if users with age are being created properly
"""
import sqlite3
import os

def check_recent_users():
    """Check recently created users and their ages"""
    
    db_path = os.path.join('instance', 'iq_test.db')
    
    if not os.path.exists(db_path):
        print(f"Database not found at {db_path}")
        return
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get recent users (last 10)
        cursor.execute("""
            SELECT id, username, email, age, created_at 
            FROM user 
            ORDER BY created_at DESC 
            LIMIT 10
        """)
        
        users = cursor.fetchall()
        
        print("Recent users in database:")
        print("-" * 80)
        print(f"{'ID':<5} {'Username':<20} {'Email':<30} {'Age':<5} {'Created'}")
        print("-" * 80)
        
        for user in users:
            user_id, username, email, age, created_at = user
            age_str = str(age) if age is not None else "NULL"
            created_str = str(created_at) if created_at is not None else "NULL"
            print(f"{user_id:<5} {username:<20} {email:<30} {age_str:<5} {created_str}")
        
        # Check for any users with invalid ages
        cursor.execute("SELECT COUNT(*) FROM user WHERE age < 13 OR age > 120")
        invalid_count = cursor.fetchone()[0]
        
        print(f"\nUsers with invalid ages (< 13 or > 120): {invalid_count}")
        
        if invalid_count > 0:
            cursor.execute("SELECT username, age FROM user WHERE age < 13 OR age > 120")
            invalid_users = cursor.fetchall()
            print("Invalid age users:")
            for username, age in invalid_users:
                print(f"  {username}: {age}")
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == "__main__":
    print("Checking users in database...")
    check_recent_users()
