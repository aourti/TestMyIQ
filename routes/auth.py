from flask import Blueprint, render_template, request, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user
from extensions import db
from models.user import User

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        age = request.form.get('age')
        
        # Validate age
        if not age or age.strip() == '':
            flash('Age is required')
            return redirect(url_for('auth.register'))
            
        try:
            age = int(age)
            if age < 13 or age > 120:
                flash('Please enter a valid age between 13 and 120')
                return redirect(url_for('auth.register'))
        except (ValueError, TypeError):
            flash('Please enter a valid age')
            return redirect(url_for('auth.register'))
        
        if User.query.filter_by(username=username).first():
            flash('Username already exists')
            return redirect(url_for('auth.register'))
            
        if User.query.filter_by(email=email).first():
            flash('Email already registered')
            return redirect(url_for('auth.register'))
            
        user = User(username=username, email=email, age=age)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        
        login_user(user)
        flash('Welcome! Your account has been created successfully.')
        return redirect(url_for('home'))  # Redirect to home instead of test
        
    return render_template('auth/register.html')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username).first()
        
        if user and user.check_password(password):
            login_user(user)
            next_page = request.args.get('next')
            if next_page:
                return redirect(next_page)
            else:
                # Redirect to home/profile instead of immediately starting test
                return redirect(url_for('home'))
            
        flash('Invalid username or password')
        
    return render_template('auth/login.html')

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('home'))
