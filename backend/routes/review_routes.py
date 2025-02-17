# backend/routes/review_routes.py
import requests
import os
from flask import Blueprint, request, jsonify
import numpy as np
from wordcloud import WordCloud
import matplotlib.pyplot as plt
from io import BytesIO
import base64
from collections import Counter
import re
import matplotlib
import openai
from datetime import datetime, timedelta
import pandas as pd
import sys
from pathlib import Path
import json
import time
from konlpy.tag import Okt  # 한글 형태소 분석
import nltk  # 영어 토큰화
from langdetect import detect  # 언어 감지
import io

# 프로젝트 루트 디렉토리 찾기
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from services.gpt_service import GPTService

matplotlib.use('Agg')  # GUI 없는 환경

bp = Blueprint('review', __name__)

CACHE_DIR = Path("cache/reviews")
CACHE_DURATION = timedelta(hours=24)  # 캐시 유효 기간

# 토큰화 도구 초기화
okt = Okt()
nltk.download('punkt', quiet=True)
nltk.download('stopwords', quiet=True)
english_stopwords = set(nltk.corpus.stopwords.words('english'))

def detect_language(text):
    """텍스트의 언어를 감지 (한글/영어)"""
    if not isinstance(text, str):
        return 'etc'
        
    # 한글, 영어 각각의 문자 수 계산
    korean_chars = len(re.findall(r'[가-힣]', text))
    english_chars = len(re.findall(r'[a-zA-Z]', text))
    total_chars = korean_chars + english_chars
    
    if total_chars == 0:
        return 'etc'
    
    # 비율 계산
    korean_ratio = korean_chars / total_chars if total_chars > 0 else 0
    english_ratio = english_chars / total_chars if total_chars > 0 else 0
    
    # 임계값 (60%)으로 언어 판단
    if korean_ratio > 0.6:
        return 'ko'
    elif english_ratio > 0.6:
        return 'en'
    return 'etc'

# 한국어 불용어
KOREAN_STOP_WORDS = {
    # 기본 불용어
    '게임', '겜', '중', '것', '등', '듯', '때', '나', '좀', '네', '예', 
    '더', '수', '말', '개', '달', '전', '분', '시간', '이번', '그냥',
    '정도', '처음', '다음', '이후', '진짜', '계속', '많이', '이거',
    '저거', '근데', '그리고', '하나', '이제', '그때', '이런', '그런',
    '무슨', '어떤', '같은', '요즘', '매우', '약간', '조금', '보고',
    # 조사/어미/접속사
    '가', '이', '을', '를', '에', '의', '로', '와', '과', '은', '는',
    '께서', '에서', '으로', '처럼', '만큼', '까지', '부터', '이나', '나',
    '고', '라고', '하고', '하면', '하니', '하지만', '하더라도', '하여',
    '이고', '이면', '이니', '이지만', '이더라도', '이며', '이야', '랑',
    # 대명사
    '나', '너', '우리', '저희', '당신', '그', '그녀', '그들', '저', '이',
    '저것', '이것', '그것', '여기', '저기', '거기', '어디', '누구',
    # 부사
    '매우', '정말', '너무', '아주', '잘', '더', '덜', '많이', '조금',
    '그냥', '바로', '자주', '이미', '아직', '드디어', '마침내', '결국',
    # 형용사/동사 기본형
    '좋다', '나쁘다', '크다', '작다', '많다', '적다', '되다', '하다',
    '이다', '있다', '없다', '가다', '오다', '주다', '받다', '보다',
    # 게임 관련 기본 용어
    '플레이', '스팀', '유저', '버전', '패치', '업데이트', '출시', '평가',
    '리뷰', '추천', '비추천', '가격', '원', '시작', '설치', '실행', '구매',
    '환불', '시즌', '다운로드', '접속', '로딩', '버그', '오류', '생각',
    '느낌', '때문', '이유', '경우', '관련', '현재', '계정', '시스템',
    # 시간 관련
    '년', '월', '일', '시', '분', '초', '전', '후', '동안', '오늘',
    '어제', '내일', '모레', '언제', '이번', '저번', '다음', '이후',
    # 수량 관련
    '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉',
    '열', '백', '천', '만', '억', '조', '몇', '얼마', '많은', '적은',
    # 접속/연결어
    '그리고', '하지만', '또는', '또한', '그러나', '그래서', '따라서',
    '그러므로', '그런데', '그리하여', '하여', '또', '혹은', '및'
}

# 영어 불용어
ENGLISH_STOP_WORDS = {
    'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
    'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
    'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her',
    'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there',
    'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
    'which', 'go', 'me', 'game', 'play', 'games', 'playing', 'played',
    'steam', 'user', 'version', 'patch', 'update', 'release', 'also', 'etc'
}

def simple_tokenize_ko(text):
    """한글 텍스트 토큰화"""
    try:
        # 명사, 형용사, 동사만 추출
        tokens = okt.pos(text, norm=True, stem=True)
        words = [word for word, pos in tokens if pos in ['Noun', 'Adjective', 'Verb']]
        # 2글자 이상이고 불용어가 아닌 단어만 선택
        return [w for w in words if len(w) > 1 and w not in KOREAN_STOP_WORDS]
    except Exception as e:
        print(f"[ERROR] 한글 토큰화 실패: {str(e)}")
        return []

def simple_tokenize_en(text):
    """영어 텍스트 토큰화"""
    try:
        # 단어 토큰화 및 소문자 변환
        words = nltk.word_tokenize(text.lower())
        # 불용어 및 특수문자 제거, 2글자 이상 단어만 선택
        return [w for w in words if w.isalnum() and len(w) > 2 and w not in english_stopwords]
    except Exception as e:
        print(f"[ERROR] 영어 토큰화 실패: {str(e)}")
        return []

def generate_wordcloud(word_freq, width=400, height=200):
    """워드클라우드 이미지 생성 및 base64 인코딩"""
    try:
        if not word_freq:
            return None

        # 워드클라우드 생성
        wc = WordCloud(
            width=width, 
            height=height,
            background_color='white',
            font_path='C:/Windows/Fonts/malgun.ttf',  # Windows 맑은 고딕 폰트
            min_font_size=10,
            max_font_size=100
        )
        
        # 워드클라우드 생성
        wc.generate_from_frequencies(word_freq)
        
        # 이미지를 버퍼에 저장
        buf = io.BytesIO()
        plt.figure(figsize=(10, 5))
        plt.imshow(wc, interpolation='bilinear')
        plt.axis('off')
        plt.savefig(buf, format='png', bbox_inches='tight', pad_inches=0)
        plt.close()
        
        # base64 인코딩
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode()
        buf.close()
        
        return image_base64
    
    except Exception as e:
        print(f"[ERROR] 워드클라우드 생성 실패: {str(e)}")
        return None

def analyze_review_trends(reviews):
    """리뷰 트렌드 분석"""
    try:
        if not reviews:
            return {'daily': [], 'monthly': []}

        df = pd.DataFrame(reviews)
        if df.empty:
            return {'daily': [], 'monthly': []}

        df['timestamp'] = pd.to_datetime(df['timestamp_created'], unit='s')
        df['date'] = df['timestamp'].dt.date
        df['month'] = df['timestamp'].dt.strftime('%Y-%m')

        # 그룹 집계 시 컬럼명을 review_count로 통일
        daily_stats = df.groupby('date').agg(
             review_count=('review', 'count'),
             voted_up=('voted_up', 'sum')
        ).reset_index()
        
        daily_stats['positive_ratio'] = (daily_stats['voted_up'] / daily_stats['review_count'] * 100).round(2)
        daily_stats['date'] = daily_stats['date'].astype(str)
        
        monthly_stats = df.groupby('month').agg(
             review_count=('review', 'count'),
             voted_up=('voted_up', 'sum')
        ).reset_index()
        
        monthly_stats['positive_ratio'] = (monthly_stats['voted_up'] / monthly_stats['review_count'] * 100).round(2)

        return {
            'daily': daily_stats.to_dict('records'),
            'monthly': monthly_stats.to_dict('records')
        }
    except Exception as e:
        print(f"[ERROR] 트렌드 분석 오류: {str(e)}")
        return {'daily': [], 'monthly': []}

# GPT 서비스 인스턴스 생성
gpt_service = GPTService()

def get_steam_reviews(app_id, language='all', review_type='all', day_range=30):
    """Steam 리뷰 수집 함수"""
    try:
        # day_range 타입 변환
        try:
            day_range = int(day_range)
        except (ValueError, TypeError):
            day_range = 30
            print(f"[WARNING] Invalid day_range value, using default: {day_range}")

        print(f"[DEBUG] Collecting reviews for app_id={app_id}, language={language}, type={review_type}, days={day_range}")
        
        params = {
            'json': 1,
            'filter': 'updated',
            'language': language if language != 'all' else None,
            'review_type': review_type if review_type != 'all' else None,
            'day_range': day_range,
            'cursor': '*',
            'num_per_page': 100,
            'purchase_type': 'all'
        }

        all_reviews = []
        total_pages = 0
        cutoff_date = int(time.time()) - (day_range * 24 * 60 * 60)

        while True:
            try:
                response = requests.get(
                    f'https://store.steampowered.com/appreviews/{app_id}',
                    params=params,
                    timeout=30
                )
                response.raise_for_status()  # HTTP 에러 체크
                data = response.json()

                if not data.get('success'):
                    return {
                        'success': 0,
                        'error': 'Steam API 응답 실패',
                        'details': data.get('error', 'Unknown error')
                    }

                if not data.get('reviews'):
                    # 더 이상 리뷰가 없는 경우 (정상)
                    break

                new_reviews = []
                for review in data['reviews']:
                    if review.get('timestamp_created', 0) < cutoff_date:
                        continue
                    
                    if language != 'all' and review.get('language') != language:
                        continue
                        
                    if review_type != 'all':
                        is_positive = review.get('voted_up', False)
                        if (review_type == 'positive' and not is_positive) or \
                           (review_type == 'negative' and is_positive):
                            continue
                    
                    new_reviews.append(review)

                all_reviews.extend(new_reviews)
                print(f"[DEBUG] Collected {len(new_reviews)} reviews (total: {len(all_reviews)})")

                cursor = data.get('cursor')
                if not cursor or cursor == params['cursor'] or len(all_reviews) >= 1000:
                    break

                params['cursor'] = cursor
                total_pages += 1
                time.sleep(1)  # API rate limit

            except requests.RequestException as e:
                print(f"[ERROR] Steam API request failed: {str(e)}")
                return {
                    'success': 0, 
                    'error': 'Steam API 요청 실패',
                    'details': str(e)
                }

        print(f"[DEBUG] Review collection completed - {len(all_reviews)} reviews from {total_pages} pages")

        # 수집된 리뷰가 없는 경우
        if not all_reviews:
            return {
                'success': 1,
                'reviews': [],
                'message': '조건에 맞는 리뷰가 없습니다.'
            }

        return {'success': 1, 'reviews': all_reviews}

    except Exception as e:
        print(f"[ERROR] Review collection failed: {str(e)}")
        return {
            'success': 0,
            'error': '리뷰 수집 중 오류 발생',
            'details': str(e)
        }

def analyze_summary_stats(reviews):
    """리뷰 요약 통계 분석"""
    total = len(reviews)
    if total == 0:
        return {
            'total_reviews': 0,
            'positive_count': 0,
            'negative_count': 0,
            'positive_ratio': 0
        }
    
    positive = sum(1 for r in reviews if r.get('voted_up', False))
    return {
        'total_reviews': total,
        'positive_count': positive,
        'negative_count': total - positive,
        'positive_ratio': (positive / total * 100) if total > 0 else 0
    }

def filter_word_frequencies(word_freq, min_freq=2):
    """단어 빈도수 필터링"""
    return {word: freq for word, freq in word_freq.items() 
            if freq >= min_freq}

def generate_wordclouds(reviews):
    """긍정/부정 리뷰 워드클라우드 생성"""
    try:
        if not reviews:
            return None

        # 긍정/부정 리뷰 분리
        positive_reviews = [r['review'] for r in reviews if r.get('voted_up')]
        negative_reviews = [r['review'] for r in reviews if not r.get('voted_up')]

        # 긍정 리뷰 워드클라우드
        pos_tokens = []
        pos_freq = {}
        for review in positive_reviews:
            lang = detect_language(review)
            if lang == 'ko':
                pos_tokens.extend(simple_tokenize_ko(review))
            elif lang == 'en':
                pos_tokens.extend(simple_tokenize_en(review))

        if pos_tokens:
            pos_freq = dict(Counter(pos_tokens))
            pos_freq = filter_word_frequencies(pos_freq)  # 빈도수 필터링 추가

        # 부정 리뷰 워드클라우드
        neg_tokens = []
        neg_freq = {}
        for review in negative_reviews:
            lang = detect_language(review)
            if lang == 'ko':
                neg_tokens.extend(simple_tokenize_ko(review))
            elif lang == 'en':
                neg_tokens.extend(simple_tokenize_en(review))

        if neg_tokens:
            neg_freq = dict(Counter(neg_tokens))
            neg_freq = filter_word_frequencies(neg_freq)  # 빈도수 필터링 추가

        # 워드클라우드 이미지 생성
        return {
            'pos_wc_base64': generate_wordcloud(pos_freq),
            'neg_wc_base64': generate_wordcloud(neg_freq),
            'pos_freq': pos_freq,
            'neg_freq': neg_freq
        }

    except Exception as e:
        print(f"[ERROR] 워드클라우드 생성 실패: {str(e)}")
        return None

@bp.route('/analyze', methods=['POST'])
def analyze_reviews():
    """리뷰 분석 엔드포인트"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': 0, 'error': 'Invalid request data'}), 400

        app_id = data.get('app_id')
        if not app_id:
            return jsonify({'success': 0, 'error': 'Game ID is required'}), 400

        settings = data.get('settings', {})
        use_gpt = data.get('use_gpt', False)

        # 리뷰 수집
        reviews_result = get_steam_reviews(
            app_id=app_id,
            language=settings.get('language', 'all'),
            review_type=settings.get('review_type', 'all'),
            day_range=settings.get('day_range', 30)
        )

        if not reviews_result.get('success'):
            return jsonify(reviews_result), 500

        reviews = reviews_result['reviews']
        
        # 리뷰가 없는 경우 - 정상 응답으로 처리
        if not reviews:
            return jsonify({
                'success': 1,
                'reviews': [],
                'summary_stats': {
                    'total_reviews': 0,
                    'positive_count': 0,
                    'negative_count': 0,
                    'positive_ratio': 0
                },
                'trends': {
                    'daily': [],
                    'monthly': []
                },
                'wordcloud': {
                    'pos_wc_base64': None,
                    'neg_wc_base64': None,
                    'pos_freq': {},
                    'neg_freq': {}
                },
                'message': f"최근 {settings.get('day_range', 30)}일 동안 {settings.get('language', '모든')} 언어의 리뷰가 없습니다."
            }), 200

        # 분석 결과
        result = {
            'success': 1,
            'reviews': reviews,
            'summary_stats': analyze_summary_stats(reviews),
            'trends': analyze_review_trends(reviews),
            'wordcloud': generate_wordclouds(reviews)
        }

        # GPT 분석 (선택적)
        if use_gpt and reviews:
            try:
                # 리뷰 객체 전체를 전달하여 품질 기반 선별 가능하도록
                positive_reviews = [r for r in reviews if r.get('voted_up')]
                negative_reviews = [r for r in reviews if not r.get('voted_up')]
                
                if positive_reviews or negative_reviews:
                    gpt_result = gpt_service.summarize_reviews(positive_reviews, negative_reviews)
                    result['gpt_summary'] = gpt_result
            except Exception as e:
                print(f"[ERROR] GPT analysis failed: {str(e)}")
                result['gpt_error'] = str(e)

        return jsonify(result), 200

    except Exception as e:
        print(f"[ERROR] Analysis failed: {str(e)}")
        return jsonify({'success': 0, 'error': str(e)}), 500

@bp.route('/search/games', methods=['GET'])
def search_games():
    """Steam Store API를 통해 게임 검색"""
    query = request.args.get('q', '')
    if not query:
        return jsonify({'success': 0, 'error': 'No search query provided'}), 400

    try:
        print(f"[DEBUG] 게임 검색 요청: {query}")
        
        # Steam Store Search API URL
        url = 'https://store.steampowered.com/api/storesearch'
        
        # 검색 파라미터 설정
        params = {
            'term': query,
            'l': 'korean',
            'cc': 'KR',
            'category1': 998,  # 게임 카테고리
            'supportedlang': 'koreana',  # 한국어 지원
            'infinite': 1,  # 더 많은 결과
            'start': 0,
            'count': 50
        }
        
        print(f"[DEBUG] Steam API 요청 URL: {url}")
        print(f"[DEBUG] 요청 파라미터: {params}")
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(
            url, 
            params=params, 
            headers=headers,
            timeout=10
        )
        
        print(f"[DEBUG] Steam API 응답 상태: {response.status_code}")
        print(f"[DEBUG] 응답 헤더: {dict(response.headers)}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"[DEBUG] Steam API 응답 데이터: {data}")
                
                if not data.get('items'):
                    print("[DEBUG] 검색 결과 없음")
                    return jsonify({
                        'success': 1,
                        'games': [],
                        'message': '검색 결과가 없습니다.'
                    }), 200
                
                games = []
                for item in data.get('items', []):
                    # 가격 정보 처리
                    price_info = item.get('price', {})
                    if price_info:
                        # Steam API는 가격을 최소 단위로 제공 (예: 29900 = 29,900원)
                        price = price_info.get('final', 0)
                        # 이미 포맷팅된 가격이 있다면 사용
                        formatted_price = price_info.get('final_formatted')
                    else:
                        price = 0
                        formatted_price = None

                    game = {
                        'appid': item.get('id'),
                        'name': item.get('name'),
                        'image': item.get('tiny_image'),
                        'price': price,
                        'formatted_price': formatted_price,
                        'is_free': item.get('is_free', False)
                    }
                    # 필수 필드 중 appid와 name만 있으면 추가
                    if game['appid'] and game['name']:
                        games.append(game)
                
                print(f"[DEBUG] 처리된 게임 수: {len(games)}")
                return jsonify({
                    'success': 1,
                    'games': games
                }), 200
            except json.JSONDecodeError as e:
                print(f"[DEBUG] JSON 파싱 오류: {str(e)}")
                print(f"[DEBUG] 응답 내용: {response.text}")
                return jsonify({
                    'success': 0,
                    'error': 'Steam API 응답을 처리할 수 없습니다.'
                }), 500
        else:
            error_msg = f'Steam API Error: Status {response.status_code}'
            print(f"[DEBUG] {error_msg}")
            print(f"[DEBUG] 응답 내용: {response.text}")
            return jsonify({'success': 0, 'error': error_msg}), response.status_code

    except requests.exceptions.Timeout:
        print("[DEBUG] Steam API 요청 시간 초과")
        return jsonify({
            'success': 0,
            'error': 'Steam API 요청 시간이 초과되었습니다.'
        }), 504
    except requests.exceptions.RequestException as e:
        print(f"[DEBUG] Steam API 요청 오류: {str(e)}")
        return jsonify({
            'success': 0,
            'error': f'Steam API 요청 실패: {str(e)}'
        }), 500
    except Exception as e:
        print(f"[DEBUG] 예상치 못한 오류: {str(e)}")
        return jsonify({
            'success': 0,
            'error': f'서버 오류가 발생했습니다: {str(e)}'
        }), 500

@bp.route('/steam/<app_id>', methods=['GET'])
def get_steam_reviews_route(app_id):
    """Steam 리뷰 수집 라우트"""
    try:
        language = request.args.get('language', 'all')
        review_type = request.args.get('review_type', 'all')
        day_range = request.args.get('day_range', 30)

        result = get_steam_reviews(
            app_id=app_id,
            language=language,
            review_type=review_type,
            day_range=day_range
        )

        if not result.get('success'):
            return jsonify(result), 500

        return jsonify(result), 200

    except Exception as e:
        print(f"[ERROR] Route handling failed: {str(e)}")
        return jsonify({'success': 0, 'error': str(e)}), 500
