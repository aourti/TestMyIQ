from flask import Flask, render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from flask_migrate import Migrate
from config import Config
from extensions import db, login_manager, migrate

def create_app():
    app = Flask(__name__, static_url_path='', static_folder='static')
    app.config.from_object(Config)

    # Initialize Flask extensions
    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    # Initialize migrations
    global migrate
    migrate = Migrate(app, db)

    # Import models after db is initialized
    from models.user import User

    @login_manager.user_loader
    def load_user(id):
        return User.query.get(int(id))

    # Register blueprints
    from routes.auth import auth_bp
    from routes.test import test_bp
    from routes.admin import admin_bp
    from routes.profile import profile_bp
    app.register_blueprint(auth_bp)
    app.register_blueprint(test_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(profile_bp)

    @app.route('/')
    def home():
        return render_template('index.html')

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
