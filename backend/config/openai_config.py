# openai_config.py

import os
from dotenv import load_dotenv

load_dotenv()

class BaseConfig:
    """기본 설정값을 제공하는 베이스 클래스"""
    API_KEY = os.getenv("OPENAI_API_KEY")
    MODEL = "o3-mini"
    REASONING_EFFORT = "high"
    MAX_COMPLETION_TOKENS = 4000

    @classmethod
    def validate(cls):
        if not cls.API_KEY:
            raise ValueError("OpenAI API key is not set in environment variables")
        return True

class DesignerConfigs:
    """각 디자이너 역할별 GPT 설정값"""

    WORLD_DESIGNER = {
        "model": "o3-mini",
        "reasoning_effort": "medium",
        "max_completion_tokens": 4000
    }
    SYSTEM_DESIGNER = {
        "model": "o3-mini",
        "reasoning_effort": "medium",
        "max_completion_tokens": 4000
    }
    QUEST_DESIGNER = {
        "model": "o3-mini",
        "reasoning_effort": "medium",
        "max_completion_tokens": 4000
    }
    NARRATIVE_DESIGNER = {
        "model": "o3-mini",
        "reasoning_effort": "high",
        "max_completion_tokens": 4000
    }
    SCENARIO_DESIGNER = {
        "model": "o3-mini",           # 원하는 모델 이름
        "reasoning_effort": "high",   # 시나리오 검토에 높은 reasoning 사용
        "max_completion_tokens": 4000
    }
    GENERAL = {
        "model": "o3-mini",
        "reasoning_effort": "medium",
        "max_completion_tokens": 4000
    }

    @classmethod
    def get_config(cls, designer_type):
        """
        디자이너 타입(한글)을 입력받아 해당 설정을 반환
        """
        mapping = {
            "레벨 디자이너": cls.WORLD_DESIGNER,
            "시스템 디자이너": cls.SYSTEM_DESIGNER,
            "퀘스트 디자이너": cls.QUEST_DESIGNER,
            "내러티브 디자이너": cls.NARRATIVE_DESIGNER,
            "시나리오 디자이너": cls.SCENARIO_DESIGNER,
            "범용": cls.GENERAL
        }
        return mapping.get(designer_type, cls.GENERAL)


class ChatbotConfig(BaseConfig):
    """
    범용 챗봇 설정 (기존 코드와의 호환성 위해 유지)
    """
    MODEL = "o3-mini"
    REASONING_EFFORT = "medium"
    MAX_COMPLETION_TOKENS = 4000


class ReviewAnalysisConfig(BaseConfig):
    """
    리뷰 분석을 위한 최적화된 설정
    """
    MODEL = "o3-mini"
    REASONING_EFFORT = "high"
    MAX_COMPLETION_TOKENS = 4000