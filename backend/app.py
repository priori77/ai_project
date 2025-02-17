# backend/app.py
from flask import Flask
from flask_cors import CORS
from flask_session import Session
from routes import scenario_bp, review_bp, chatbot_bp
import os
from datetime import timedelta

def create_app():
    app = Flask(__name__)
    
    # 기본 설정
    app.config.update(
        SECRET_KEY=os.getenv('SECRET_KEY', os.urandom(24)),
        SESSION_TYPE='filesystem',
        SESSION_PERMANENT=False,
        PERMANENT_SESSION_LIFETIME=timedelta(minutes=30),
        CORS_HEADERS='Content-Type'
    )
    
    # CORS 설정
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:5173"],  # Vite 개발 서버
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type"],
            "supports_credentials": True  # 쿠키/세션 지원
        }
    })
    
    # 세션 초기화
    Session(app)
    
    # Blueprint 등록
    app.register_blueprint(scenario_bp, url_prefix='/scenario')
    app.register_blueprint(review_bp, url_prefix='/review')
    app.register_blueprint(chatbot_bp, url_prefix='/chatbot')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)
