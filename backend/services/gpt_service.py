import openai
import sys
from pathlib import Path
import time
from openai import OpenAI, APIError, BadRequestError

# 프로젝트 루트 디렉토리 찾기
root_dir = Path(__file__).resolve().parent.parent
sys.path.append(str(root_dir))

from config.openai_config import ReviewAnalysisConfig

class GPTService:
    def __init__(self):
        ReviewAnalysisConfig.validate()
        self.client = OpenAI(api_key=ReviewAnalysisConfig.API_KEY)

    def summarize_reviews(self, positive_texts, negative_texts):
        """리뷰 요약 서비스"""
        try:
            # 리뷰 선별 및 전처리
            selected_pos = self._select_quality_reviews(positive_texts)
            selected_neg = self._select_quality_reviews(negative_texts)
            
            # 직접 프롬프트 생성 및 GPT 호출
            pos_summary = self._analyze_positive_reviews(selected_pos)
            neg_summary = self._analyze_negative_reviews(selected_neg)

            return {
                "positive_summary": self._format_summary(pos_summary),
                "negative_summary": self._format_summary(neg_summary)
            }
        except Exception as e:
            print(f"[ERROR] GPT 요약 오류: {str(e)}")
            return {"error": f"GPT Error: {str(e)}"}

    def _select_quality_reviews(self, reviews, max_reviews=20):
        """품질 기반 리뷰 선별"""
        if not reviews:
            return []
        
        # 리뷰 품질 점수 계산 및 정렬
        scored_reviews = []
        for review in reviews:
            if not isinstance(review, dict):
                continue
            
            score = 0
            # 1. 투표 수 (votes_up)
            score += review.get('votes_up', 0) * 2
            
            # 2. 리뷰 길이 (너무 짧거나 긴 것은 제외)
            text_length = len(review.get('review', ''))
            if 50 <= text_length <= 1000:
                score += 1
            
            # 3. 플레이 시간
            playtime = review.get('author', {}).get('playtime_forever', 0)
            if playtime > 10:  # 10시간 이상 플레이
                score += 3
            
            # 4. 최신성 (최근 3개월 내 리뷰 우대)
            timestamp = review.get('timestamp_created', 0)
            if timestamp > time.time() - (90 * 24 * 60 * 60):
                score += 2
            
            scored_reviews.append((score, review))
        
        # 점수 기반 정렬 및 선택
        selected = sorted(scored_reviews, key=lambda x: x[0], reverse=True)
        
        # 선택된 리뷰의 텍스트만 추출
        return [r[1]['review'] for r in selected[:max_reviews]]

    def _get_completion(self, prompt, developer_msg=None):
        """GPT API 호출 (o3-mini는 system 프롬프트 대신 developer 프롬프트 사용)"""
        try:
            messages = []
            if developer_msg:
                messages.append({"role": "developer", "content": developer_msg})
            messages.append({"role": "user", "content": prompt})
            
            response = self.client.chat.completions.create(
                model=ReviewAnalysisConfig.MODEL,
                messages=messages,
                reasoning_effort=ReviewAnalysisConfig.REASONING_EFFORT,  # 예: "low", "medium", "high"
                max_completion_tokens=ReviewAnalysisConfig.MAX_COMPLETION_TOKENS
            )
            return response.choices[0].message.content.strip()
            
        except BadRequestError as e:
            print(f"[ERROR] Invalid request to OpenAI API: {str(e)}")
            raise
        except APIError as e:
            print(f"[ERROR] OpenAI API error: {str(e)}")
            raise
        except Exception as e:
            print(f"[ERROR] Unexpected error in GPT completion: {str(e)}")
            raise

    def _analyze_positive_reviews(self, texts):
        """긍정 리뷰 분석"""
        developer_msg = (
            "당신은 게임 개발사를 위한 시장조사 전문가입니다. "
            "사용자가 제공하는 긍정 리뷰를 분석하여, "
            "게임 디자인, 밸런스, 마케팅 측면에서 도움이 되는 인사이트를 정리해 주십시오."
        )
        
        prompt = f"""
다음은 게임의 긍정적인 리뷰들입니다. 아래 형식으로 분석해 주세요:

# 주요 장점
- 가장 자주 언급되는 긍정적인 특징들을 나열해주세요
- 각 장점별로 구체적인 예시나 인용구를 포함해주세요

# 게임의 강점 (개발사 관점)
1. 가장 중요한 강점
2. 두 번째 강점
3. 세 번째 강점

# 플레이어 만족 요소
- 플레이어들이 특히 만족하는 게임 요소들
- 플레이어 경험 관점에서 성공적인 부분

# 전반적인 평가
300자 이내로 전체적인 긍정적 평가를 요약해주세요

리뷰 목록:
{" | ".join(texts[:20]) if texts else "없음"}
"""
        return self._get_completion(prompt, developer_msg)

    def _analyze_negative_reviews(self, texts):
        """부정 리뷰 분석"""
        developer_msg = (
            "당신은 게임 개발사를 위한 시장조사 전문가입니다. "
            "사용자가 제공하는 부정 리뷰를 분석하여, "
            "게임의 개선점과 사용자 불만사항에 대한 인사이트를 정리해 주십시오."
        )
        
        prompt = f"""
다음은 게임의 부정적인 리뷰들입니다. 아래 형식으로 분석해 주세요:

# 주요 단점
- 가장 자주 언급되는 문제점들을 나열해주세요
- 각 문제점의 구체적인 예시나 인용구를 포함해주세요

# 우선순위별 개선사항
1. 가장 시급한 개선사항
2. 두 번째 우선순위
3. 세 번째 우선순위

# 주요 불만사항
- 플레이어들이 가장 불만족스러워하는 요소들
- 게임 경험을 저해하는 주요 요인들

# 개선 제안
300자 이내로 구체적인 개선 방안을 제시해주세요

리뷰 목록:
{" | ".join(texts[:20]) if texts else "없음"}
"""
        return self._get_completion(prompt, developer_msg)

    def _format_summary(self, text):
        """GPT 응답 포맷팅"""
        if not text:
            return "분석 결과를 생성할 수 없습니다."
        
        # 마크다운 형식 정리
        sections = text.split('#')
        formatted = []
        for section in sections:
            if not section.strip():
                continue
            lines = section.strip().split('\n')
            if lines:
                title = lines[0].strip()
                content = '\n'.join(lines[1:]).strip()
                formatted.append(f"## {title}\n{content}\n")
        
        return '\n'.join(formatted)

    def analyze_reviews(self, reviews, game_title):
        """리뷰 분석을 수행하는 메서드"""
        try:
            # 분석 프롬프트 구성
            prompt = self._create_analysis_prompt(reviews, game_title)
            
            response = self.client.chat.completions.create(
                model=ReviewAnalysisConfig.MODEL,
                messages=[{"role": "user", "content": prompt}],
                reasoning_effort=ReviewAnalysisConfig.REASONING_EFFORT,
                max_completion_tokens=ReviewAnalysisConfig.MAX_COMPLETION_TOKENS,
            )
            
            return {
                "success": True,
                "analysis": response.choices[0].message.content
            }
            
        except Exception as e:
            print(f"Review analysis error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    def _create_analysis_prompt(self, reviews, game_title):
        """분석을 위한 프롬프트를 생성하는 private 메서드"""
        return f"""다음은 '{game_title}' 게임의 리뷰들입니다. 이 리뷰들을 분석하여 다음 정보를 제공해주세요:

1. 전반적인 감성 분석 (긍정/부정 비율)
2. 주요 장점들
3. 주요 단점들
4. 가장 자주 언급되는 키워드나 주제
5. 개선이 필요한 부분들

리뷰 목록:
{reviews}

JSON 형식으로 응답해주세요."""