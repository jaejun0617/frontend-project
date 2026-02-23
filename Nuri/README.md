# 🌈 NURI

## 반려동물을 사랑한 보호자를 위한 디지털 기억 플랫폼

> 기억은 사라지지 않습니다.  
> 우리는 아이를 잊지 않습니다.

---

# 1. 서비스 개요

NURI는  
반려동물을 떠나보낸 보호자이자,  
아이의 추억을 체계적으로 기록하고 싶은 보호자를 위한  
디지털 메모리얼 & 감정 기록 플랫폼입니다.

이 서비스는  
단순한 추모 공간이 아니라,  
기억을 구조화하고 감정을 정리하며  
아이와의 시간을 계속 이어가는 디지털 공간입니다.

사진을 저장하는 앱이 아니라,  
아이의 삶을 기록하는 플랫폼입니다.

---

# 2. 문제 정의 (Problem)

- 반려동물 장례 이후 장기적인 기억 관리 공간 부족
- 감정을 지속적으로 정리할 수 있는 구조화된 시스템 부재
- 사진은 많지만 체계적인 타임라인 기록 부족
- 기일, 추억, 감정 데이터를 관리할 공간 없음
- 모바일 중심의 디지털 메모리얼 서비스 부족

---

# 3. 핵심 가치 (Core Value)

- 보호자 중심 설계
- 감정 기반 AI 위로 시스템
- 추억 타임라인 구조화
- 자동 기일 관리 시스템
- 기억을 데이터로 보존

---

# 4. 타겟 사용자

- 반려동물을 떠나보낸 보호자
- 아이의 추억을 체계적으로 기록하고 싶은 보호자
- 감정 회복이 필요한 사용자
- 사진과 이야기를 정리하고 싶은 사람

---

# 5. 주요 기능 구성

## 5.1 회원가입 시 수집 정보

- 보호자 이름
- 아이 이름
- 대표 사진
- 생년월일
- 기일
- 아이의 성격
- 좋아했던 것
- 싫어했던 것
- 자주 하던 행동
- 보호자와의 추억
- 아이의 일생 스토리

→ Supabase (Auth + PostgreSQL + Storage)

---

## 5.2 홈 화면

- 아이 대표 사진
- 보호자 이름 + 아이 이름
- 오늘의 AI 메시지
- 오늘의 랜덤 추억 사진

---

# 6. 핵심 기능 상세

---

## 6.1 감정 분석 기반 위로 시스템

- 사용자 입력 텍스트 감정 분석
- 감정 점수 저장
- 점수 기반 AI 응답 톤 조절
- 감정 히스토리 누적 기록

---

## 6.2 오늘의 사진 랜덤 회상 기능

- 업로드된 사진 중 랜덤 노출
- 촬영 날짜 표시
- 해당 날짜 기록 자동 연결
- 감정 태그 기반 필터 가능

---

## 6.3 기일 자동 추모 메시지

자동 트리거:

- 7일
- 30일
- 100일
- 1주기
- 매년 기일

기능:

- 푸시 알림
- AI 추모 메시지 자동 생성
- 과거 추억 자동 회상

---

## 6.4 AI 대화 기능 (2단계)

- 아이 성격 기반 프롬프트 구성
- 감정 반응형 응답
- 대화 히스토리 저장

---

## 6.5 AR 기능 (장기 확장)

- 카메라 기반 3D 펫 모델 배치
- 사진 촬영 기능
- 기일 특별 연출 모드

---

# 7. 요금제 구조

| 단계  | 가격    | 기능                       |
| ----- | ------- | -------------------------- |
| 1단계 | 3,300원 | 방명록 + 타임라인          |
| 2단계 | 5,500원 | AI 대화 + 감정 분석        |
| 3단계 | 9,900원 | AR + 음성 생성 + 고급 기능 |

---

# 8. 데이터 구조 초안

## users

- id
- owner_name
- created_at

## pets

- id
- user_id
- pet_name
- birth_date
- memorial_date
- personality
- story
- profile_image

## memories

- id
- pet_id
- content
- image_url
- emotion_tag
- created_at

## guestbooks

- id
- pet_id
- user_message
- emotion_score
- ai_reply
- created_at

## chats

- id
- pet_id
- role
- message
- created_at

## subscriptions

- id
- user_id
- tier
- started_at
- expires_at

---

# 9. 장기 확장

- 보호자 커뮤니티
- 디지털 추억 앨범 PDF 제작
- AI 합성 추억 이미지
- 감정 변화 리포트
- 반려동물 굿즈 스토어

---

# 10. 서비스 철학

이 플랫폼은  
슬픔을 자극하지 않는다.  
기억을 구조화한다.

아이를 잊지 않기 위해  
기록한다.

---

# 11. 기술 스택 (Web → App 단계별 로드맵)

NURI는 **대표 웹 사이트(웹 서비스) → 이후 앱** 순서로 진행합니다.  
초기에는 빠르게 MVP를 만들고, 운영하면서 앱으로 확장합니다.

---

## 11.1 1단계: 대표 웹 사이트 / Web MVP (권장 스택)

### ✅ Frontend / Fullstack

- **Next.js (App Router)**
   - 랜딩/마케팅 사이트 + 서비스 화면 + 서버 API를 한 프로젝트에서 운영
- **React**
- **TypeScript (권장)**
   - 데이터 모델(감정/구독/기록)이 커지면 TS가 유지보수 비용을 크게 줄임

### ✅ Styling

- **Tailwind CSS** (생산성/일관성)
- (선택) shadcn/ui (컴포넌트 속도 향상)

### ✅ Backend / DB / Auth / Storage

- **Supabase**
   - **Auth**: 이메일/소셜 로그인
   - **PostgreSQL**: 관계형 데이터(펫/메모리/구독 등) 저장
   - **Storage**: 이미지/영상 업로드

### ✅ 배포 / 운영

- **Vercel**: Next.js 배포 최적
- (선택) Sentry: 프론트 오류 추적
- (선택) PostHog/GA: 이벤트 분석

### ✅ AI 기능(서버에서 호출)

- Next.js 서버(Route Handlers)에서 AI API 호출
- 감정 분석/위로 메시지/대화 응답 생성

### ✅ 결제/구독(도입 시)

- **Stripe** (Webhook + DB 동기화)

---

## 11.2 2단계: 앱 확장 (Web 기반 → Native)

### 선택지 A) **PWA (우선 추천)**

- 웹을 “설치형 앱처럼” 제공
- 개발비용/학습 부담 최소
- 푸시 알림은 환경 제약이 있어 운영 방식 설계 필요

### 선택지 B) **React Native (스토어 앱)**

- JS/React 경험을 그대로 활용 가능
- 로그인/데이터/AI 로직은 기존 Supabase/서버 API 재사용

### 선택지 C) Flutter

- 가능하지만 JS 기반에서 전환 비용이 큼

---

# 12. 개발 우선순위 (MVP 기준)

## 12.1 Web MVP 필수 기능

1. 랜딩(대표 사이트) + 서비스 소개 + 가격표
2. 회원가입/로그인 (Supabase Auth)
3. 펫 프로필 생성(대표사진/생일/기일/성격/스토리)
4. 추억 등록(CRUD) + 이미지 업로드(Storage)
5. 홈: 오늘의 랜덤 추억 + 오늘의 메시지(초기엔 고정/규칙 기반 → AI로 확장)
6. 타임라인(날짜 기반 리스트)
7. 방명록(기본 텍스트 + 감정 점수 저장)

## 12.2 Web MVP 이후 확장 기능

- 감정 히스토리 차트/리포트
- 감정 태그 기반 필터/검색
- 기일 자동 메시지(스케줄링)
- AI 대화(2단계)
- 구독 결제/플랜 차등 적용
- 관리자 도구(운영/CS)

---

# 13. 추천 폴더 구조 (Next.js App Router 기준)

```txt
src/
  app/
    (marketing)/
      page.tsx                 # 대표 웹(랜딩)
      pricing/page.tsx
    (auth)/
      login/page.tsx
      signup/page.tsx
    (service)/
      dashboard/page.tsx       # 홈 (랜덤 추억/오늘 메시지)
      pets/[petId]/page.tsx
      pets/[petId]/memories/page.tsx
      pets/[petId]/guestbook/page.tsx
      pets/[petId]/chat/page.tsx
    api/
      ai/route.ts              # AI 호출 (서버)
      memories/route.ts        # CRUD
      guestbook/route.ts
  components/
    common/
    pets/
    memories/
  lib/
    supabase/
    auth/
    validators/
  styles/
  types/
```
