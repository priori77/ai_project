# scripts/index_documents.py

from dotenv import load_dotenv
load_dotenv()  # .env 파일 로드

import os
import glob
import json
import sys
import shutil
import time
import logging
from tqdm import tqdm

# 로깅 설정
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# backend 폴더를 Python 경로에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(current_dir, ".."))
sys.path.append(backend_dir)

logging.info(f"Python path: {sys.path}")  # 디버깅용 출력
logging.info(f"Current directory: {os.getcwd()}")  # 디버깅용 출력

try:
    from services.vector_service import vector_service
    logging.info("Successfully imported vector_service")
except Exception as e:
    logging.error(f"Error importing vector_service: {str(e)}")
    raise

def clean_chroma_directory(clean: bool = False):
    """
    기존 ChromaDB 데이터 디렉토리 정리.
    clean 인자가 True이면 기존 데이터를 백업하고 새로 생성.
    clean 인자가 False이면 기존 데이터를 그대로 유지.
    """
    # .env에서 설정한 persist 경로 또는 default '../vector_store'
    chroma_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "vector_store"))
    logging.info(f"ChromaDB Persist Directory: {chroma_dir}")

    if clean and os.path.exists(chroma_dir):
        backup_dir = f"{chroma_dir}_backup_{int(time.time())}"
        logging.info(f"기존 ChromaDB 데이터를 백업합니다: {backup_dir}")
        shutil.move(chroma_dir, backup_dir)
    else:
        logging.info("기존 ChromaDB 데이터를 유지합니다.")

    logging.info("새로운 ChromaDB 데이터베이스를 생성합니다 (또는 기존에 추가).")

def index_documents(data_directory, clean_data: bool = False):
    """JSON 파일들을 읽어서 ChromaDB에 인덱싱"""
    # 선택적으로 기존 데이터 정리
    clean_chroma_directory(clean=clean_data)
    
    pattern = os.path.join(data_directory, "**", "*.json")
    json_files = glob.glob(pattern, recursive=True)
    
    if not json_files:
        logging.warning(f"{data_directory} 폴더 내에서 JSON 파일을 찾을 수 없습니다.")
        return
    
    logging.info(f"{len(json_files)} 개의 JSON 파일을 찾았습니다. 인덱싱을 시작합니다...")
    
    total_docs = 0
    success_docs = 0
    
    for file_path in tqdm(json_files, desc="파일 처리 중"):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                docs = json.load(f)
        except Exception as e:
            logging.error(f"\n파일을 불러올 수 없습니다. {file_path}: {e}")
            continue
        
        total_docs += len(docs)
        
        for doc in tqdm(docs, desc=f"{os.path.basename(file_path)} 문서 처리 중", leave=False):
            try:
                doc_id = doc.get("id")
                content = doc.get("content")
                metadata = doc.get("metadata", {})

                # 유효성 검사: id와 content가 반드시 있어야 함
                if not doc_id or not content:
                    logging.warning(f"문서 건너뛰기 - id 또는 content 누락 (파일: {os.path.basename(file_path)})")
                    continue

                # keywords 리스트 -> 문자열 변환
                if "keywords" in metadata and isinstance(metadata["keywords"], list):
                    keywords_str = ", ".join(str(keyword) for keyword in metadata["keywords"])
                    metadata["keywords"] = keywords_str
                else:
                    keywords_str = metadata.get("keywords", "")
                
                # 파일 출처 정보 추가
                metadata["source_file"] = os.path.basename(file_path)
                
                # 문서 상단에 키워드를 추가 (검색 힌트)
                if keywords_str:
                    content = f"### 키워드: {keywords_str}\n\n" + content

                success = vector_service.add_document(doc_id, content, metadata)
                if success:
                    success_docs += 1
                else:
                    logging.error(f"문서 인덱싱 실패 (ID: {doc_id})")
                    
            except Exception as e:
                logging.error(f"문서 인덱싱 중 오류 발생 (ID: {doc.get('id', 'unknown')}): {e}")
    
    logging.info(f"인덱싱 완료: 총 {total_docs}개 중 {success_docs}개 성공")
    # 실제 최종 persist_directory 경로 확인
    logging.info(f"Vector DB 저장 위치: {os.environ.get('CHROMA_PERSIST_DIRECTORY')}")
    logging.info("작업을 완료했습니다.")

if __name__ == '__main__':
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_directory = os.path.join(current_dir, "..", "data")
    data_directory = os.path.abspath(data_directory)
    
    logging.info(f"데이터 폴더 경로: {data_directory}")
    # clean_data를 False로 설정하여 기존 데이터 유지 (필요 시 True로 변경)
    index_documents(data_directory, clean_data=False)