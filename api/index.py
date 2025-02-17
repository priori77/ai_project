import sys
from flask import Flask
from flask_cors import CORS
from flask_session import Session
from backend.routes import scenario_bp, review_bp, chatbot_bp
import os
from datetime import timedelta

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


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

# Vercel 배포를 위해 글로벌 변수로 Flask 앱 인스턴스 생성
app = create_app()