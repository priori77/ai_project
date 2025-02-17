from flask import Blueprint, request, jsonify, session
from flask_cors import cross_origin
from services.chat_service import ChatService
from config.chat_config import ChatConfig

bp = Blueprint('chatbot', __name__)
chat_service = ChatService()

@bp.before_request
def check_session():
    if 'chat_history' not in session:
        session['chat_history'] = []

@bp.route('/chat', methods=['POST'])
@cross_origin(supports_credentials=True)
def chat():
    try:
        data = request.json
        message = data.get('message')
        designer_type = data.get('designerType', "범용")
        
        # 세션 크기 제한 확인
        if len(str(session.get('chat_history', []))) > 4000:  # 4KB 제한 가정
            # 오래된 메시지 제거
            session['chat_history'] = session['chat_history'][-ChatConfig.MAX_HISTORY:]
        
        messages = session.get('chat_history', [])
        messages.append({"role": "user", "content": message})
        
        # GPT 응답 (designer_type 전달)
        response = chat_service.create_chat_completion(messages, designer_type)
        
        if response["success"]:
            # 응답 메시지 추가
            messages.append({"role": "assistant", "content": response["message"]})
            
            # 대화 기록 길이 제한
            if len(messages) > ChatConfig.MAX_HISTORY * 2:  # user/assistant 쌍 기준
                messages = messages[-ChatConfig.MAX_HISTORY * 2:]
            
            # 세션에 대화 기록 저장
            session['chat_history'] = messages
            
            return jsonify({
                "success": True,
                "message": response["message"],
                "history": messages
            })
        else:
            return jsonify({
                "success": False,
                "error": response.get("error", "Unknown error")
            }), 500

    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@bp.route('/history', methods=['GET'])
def get_chat_history():
    """대화 기록 조회"""
    return jsonify({
        "success": True,
        "history": session.get('chat_history', [])
    })

@bp.route('/clear', methods=['POST'])
def clear_chat():
    """대화 기록 초기화"""
    session.pop('chat_history', None)
    return jsonify({"success": True})
