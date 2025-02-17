from flask import Blueprint, request, jsonify
from services.vector_service import vector_service

bp = Blueprint('vector', __name__)

@bp.route('/add', methods=['POST'])
def add_document():
    """문서 추가 API : {doc_id, content, metadata} JSON Payload 필요"""
    data = request.get_json()
    doc_id = data.get("doc_id")
    content = data.get("content")
    metadata = data.get("metadata", {})
    try:
        vector_service.add_document(doc_id, content, metadata)
        return jsonify({"message": "Document added successfully"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@bp.route('/query', methods=['GET'])
def query_documents():
    """문서 검색 API : query 파라미터를 사용하여 상위 K개 결과 검색. 예: /query?query=...&top_k=3"""
    query = request.args.get("query")
    top_k = int(request.args.get("top_k", 5))
    try:
        results = vector_service.query(query, top_k)
        return jsonify({"results": results})
    except Exception as e:
        return jsonify({"error": str(e)}), 500