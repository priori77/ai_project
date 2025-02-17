# services/vector_service.py

from dotenv import load_dotenv
load_dotenv()  # .env 파일 로드

import os
import chromadb
from chromadb.config import Settings
from chromadb.utils.embedding_functions import OpenAIEmbeddingFunction

class VectorService:
    def __init__(self, collection_name: str = "my_collection", persist_path: str = None):
        """
        VectorService 초기화:
          - persist_path가 주어지지 않으면 환경변수 CHROMA_PERSIST_DIRECTORY 확인 후 기본값 ../vector_store 사용
          - 절대 경로로 변환 후, 디렉터리가 없으면 생성
          - chromadb.Client를 is_persistent=True로 설정하여 실제 디스크에 데이터가 저장되도록 함
        """
        if persist_path is None:
            persist_path = os.getenv("CHROMA_PERSIST_DIRECTORY", "../vector_store")
        
        # 절대 경로 변환
        persist_path = os.path.abspath(persist_path)

        # 디렉터리가 존재하지 않을 경우 생성
        os.makedirs(persist_path, exist_ok=True)

        # 환경변수에 persist_path 설정 (디버깅용)
        os.environ["CHROMA_PERSIST_DIRECTORY"] = persist_path

        # ChromaDB Client 생성 (퍼시스턴트 모드)
        self.client = chromadb.Client(
            Settings(
                is_persistent=True,
                persist_directory=persist_path
            )
        )

        # OpenAI 임베딩 함수 설정
        openai_api_key = os.getenv("OPENAI_API_KEY")
        if openai_api_key is None:
            raise RuntimeError("OPENAI_API_KEY is not set in environment variables")

        self.embedding_fn = OpenAIEmbeddingFunction(
            api_key=openai_api_key,
            model_name="text-embedding-ada-002"
        )

        # 컬렉션 가져오기/생성 (임베딩 함수 등록)
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            embedding_function=self.embedding_fn
        )

    def add_documents(self, documents: list[str], metadatas: list[dict] = None, ids: list[str] = None):
        """여러 개의 문서를 한 번에 추가"""
        if metadatas is None:
            metadatas = [{}] * len(documents)
        if ids is None:
            ids = [f"id_{i}" for i in range(len(documents))]
        self.collection.add(documents=documents, metadatas=metadatas, ids=ids)

    def add_document(self, doc_id: str, content: str, metadata: dict):
        """단일 문서 추가 (doc_id, content, metadata)"""
        try:
            self.add_documents([content], [metadata], [doc_id])
            return True
        except Exception as e:
            print(f"Error adding document {doc_id}: {e}")
            return False

    def query(self, query_text: str, top_k: int = 5):
        """쿼리 텍스트에 가장 유사한 문서 top_k개 반환"""
        results = self.collection.query(query_texts=[query_text], n_results=top_k)
        return results

    def reset(self):
        """컬렉션 전체 초기화"""
        self.client.reset()


# 싱글톤처럼 재사용할 수 있는 전역 인스턴스
vector_service = VectorService()