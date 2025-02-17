# routes/scenario_routes.py

from flask import Blueprint, request, jsonify
from flask_cors import cross_origin

from services.vector_service import vector_service
from services.chat_service import ChatService

bp = Blueprint('scenario', __name__)
chat_service = ChatService()

@bp.route('/', methods=['GET'])
def get_scenarios():
    """시나리오 목록 조회"""
    return jsonify({'scenarios': []})

@bp.route('/', methods=['POST'])
def create_scenario():
    """새로운 시나리오 생성"""
    data = request.get_json()
    return jsonify({'message': 'Scenario created successfully'}), 201

@bp.route('/<int:scenario_id>', methods=['GET'])
def get_scenario(scenario_id):
    """특정 시나리오 조회"""
    return jsonify({'scenario': {'id': scenario_id}})

@bp.route('/<int:scenario_id>/analyze', methods=['POST'])
def analyze_scenario(scenario_id):
    """시나리오 분석 (LAG + GPT)"""
    return jsonify({'analysis': 'Analysis result'})

@bp.route('/chat', methods=['POST'])
@cross_origin(supports_credentials=True)
def scenario_chat():
    """
    사용자로부터 '게임 내 스토리, 인물, 설정' 관련 질문을 받고,
    vector_service를 통해 연관 문서(컨텍스트)를 검색한 뒤,
    새로 추가된 '시나리오 디자이너' 역할을 사용해 GPT 응답 생성.
    """
    try:
        data = request.get_json()
        question = data.get('message', '').strip()
        if not question:
            return jsonify({"success": False, "error": "메시지가 제공되지 않았습니다."}), 400

        # 1. 관련 문서 검색
        docs = vector_service.query(question, top_k=3)
        context_snippets = docs.get("documents", [[]])[0]
        context_text = "\n\n".join(context_snippets)

        # 2. user 메시지 생성
        user_message = (
            f"스토리/설정 관련 질문:\n\n"
            f"{question}\n\n"
            f"검색된 문맥:\n{context_text}\n\n"
            f"사용자의 질문 혹은 요청사항에 대해 상세하게 답변해줘."
        )

        # 3. ChatService 호출: 시나리오 디자이너 모드
        gpt_response = chat_service.create_chat_completion(
            messages=[{"role": "user", "content": user_message}],
            designer_type="시나리오 디자이너"
        )

        # 4. 처리 결과 반환
        if gpt_response["success"]:
            return jsonify({"success": True, "message": gpt_response["message"]})
        else:
            return jsonify({"success": False, "error": gpt_response.get("error", "알 수 없는 오류")}), 500

    except Exception as e:
        print(f"[ERROR in scenario_chat]: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500