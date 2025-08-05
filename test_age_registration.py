#!/usr/bin/env python3
"""
Test script to verify age field is working in registration
"""
import requests
import sys

def test_age_registration():
    """Test that age field is properly submitted and processed"""
    
    # Test data
    test_data = {
        'username': 'testuser_age_' + str(int(__import__('time').time())),
        'email': f'test_age_{int(__import__("time").time())}@example.com',
        'age': '25',
        'password': 'testpassword123'
    }
    
    try:
        # Submit registration form
        response = requests.post('http://localhost:5000/auth/register', data=test_data, allow_redirects=False)
        
        print(f"Registration response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 302:  # Redirect after successful registration
            print("✅ Registration successful - redirected as expected")
            return True
        elif response.status_code == 200:
            print("❌ Registration returned 200 - might indicate validation error")
            print("Response content snippet:", response.text[:500])
            return False
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Flask app at localhost:5000")
        print("Make sure the Flask app is running")
        return False
    except Exception as e:
        print(f"❌ Error during test: {e}")
        return False

def test_age_validation():
    """Test age field validation"""
    
    test_cases = [
        {'age': '12', 'should_fail': True, 'reason': 'too young'},
        {'age': '121', 'should_fail': True, 'reason': 'too old'},  
        {'age': 'abc', 'should_fail': True, 'reason': 'not a number'},
        {'age': '25', 'should_fail': False, 'reason': 'valid age'},
    ]
    
    for i, case in enumerate(test_cases):
        print(f"\nTest case {i+1}: age='{case['age']}' ({case['reason']})")
        
        test_data = {
            'username': f'testuser_val_{i}_{int(__import__("time").time())}',
            'email': f'test_val_{i}_{int(__import__("time").time())}@example.com',
            'age': case['age'],
            'password': 'testpassword123'
        }
        
        try:
            response = requests.post('http://localhost:5000/auth/register', data=test_data, allow_redirects=False)
            
            if case['should_fail']:
                if response.status_code == 302:
                    print(f"❌ Expected validation to fail but got redirect")
                else:
                    print(f"✅ Validation correctly failed")
            else:
                if response.status_code == 302:
                    print(f"✅ Valid age accepted")
                else:
                    print(f"❌ Valid age was rejected")
                    
        except Exception as e:
            print(f"❌ Error during validation test: {e}")

if __name__ == "__main__":
    print("Testing age field in registration form...")
    print("=" * 50)
    
    print("\n1. Testing basic registration with age field...")
    test_age_registration()
    
    print("\n2. Testing age validation...")
    test_age_validation()
    
    print("\n" + "=" * 50)
    print("Tests completed!")
