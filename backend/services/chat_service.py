# services/chat_service.py

import os
from openai import OpenAI

from config.chat_config import ChatConfig
from config.openai_config import DesignerConfigs

class ChatService:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    def create_chat_completion(self, messages, designer_type="범용", conversation_id=None):
        try:
            # 1. 시스템 프롬프트 가져오기
            system_prompt = ChatConfig.get_system_prompt(designer_type)

            # 2. 모델 설정 (openai_config.py)
            gpt_config = DesignerConfigs.get_config(designer_type)

            # 3. messages 준비: system_prompt -> developer 역할, 그 뒤 user/assistant
            full_messages = [{"role": "developer", "content": system_prompt}] + messages

            # 4. API 호출
            response = self.client.chat.completions.create(
                model=gpt_config["model"],
                messages=full_messages,
                reasoning_effort=gpt_config["reasoning_effort"],
                max_completion_tokens=gpt_config["max_completion_tokens"]
            )

            raw_answer = response.choices[0].message.content
            formatted_answer = self._format_markdown_response(raw_answer)

            return {
                "success": True,
                "message": formatted_answer,
                "designer_type": designer_type
            }

        except Exception as e:
            print(f"[ChatService] Chat completion error: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "designer_type": designer_type
            }

    def _format_markdown_response(self, text):
        """
        GPT 응답에 포함된 <markpage> 태그를 제거하고, 
        사용자에게 표시할 최종 문자열 형태로 리턴
        """
        if not text:
            return "답변이 없습니다."

        cleaned = text.replace("<markpage>", "").replace("</markpage>", "").strip()
        return cleaned