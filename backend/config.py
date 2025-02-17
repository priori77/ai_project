import os
from dotenv import load_dotenv
import secrets
from datetime import timedelta

load_dotenv()

class Config:
    # 기본 설정
    SECRET_KEY = os.getenv('SECRET_KEY', secrets.token_hex(32))
    SESSION_TYPE = 'filesystem'  # 파일시스템 기반 세션
    SESSION_PERMANENT = False    # 세션 만료 설정
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)  # 세션 유효 시간
    
    # CORS 설정
    CORS_HEADERS = 'Content-Type'
    
    # 데이터베이스 설정
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # OpenAI API 설정
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    # Steam API 설정
    STEAM_API_KEY = os.getenv('STEAM_API_KEY')

class DevelopmentConfig(Config):
    DEBUG = True

class ProductionConfig(Config):
    DEBUG = False

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///test.db'

config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 