# Git 세팅 히스토리 정리 (remind-app)

> **archive — 운영 문서 아님.** 특정 시점(과거 대화)에 로컬 Git/remote 상태를 1회성으로 점검한 기록입니다. 계속 갱신되지 않으며, 현재 상태를 알고 싶다면 `git remote -v` / `git status`를 직접 실행하세요. 전체 문서 지도는 [../README.md](../README.md) 참고.

이 문서는 `remind-app`의 Git 관련 상태를 "무엇이 사실로 확인되었는지" 기준으로 정리한 기록입니다.

## 핵심 요약

- `remind-app`은 대화 시작 시점부터 이미 **로컬 Git 저장소** 상태였습니다.
- 로컬 Git 저장소라는 뜻은 폴더 안에 `.git`이 있어 커밋/이력 추적이 가능한 상태를 말합니다.
- 로컬 Git 저장소와 GitHub 업로드(`push`)는 별개입니다.  
  즉, 로컬이 git이어도 원격에는 아무 것도 안 올라가 있을 수 있습니다.
- 이 대화에서 assistant는 remote/상태를 **조회만** 했고, push/remote 변경/새 repo 생성은 하지 않았습니다.

## 확인된 사실 (이 대화에서 점검)

### 1) 로컬 Git 저장소 상태

- `.git/config` 존재
- `git log` 기준 커밋 2개 존재
  - `Initial commit from Create Next App`
  - `Connect record save flow to feed`

### 2) remote 설정

- `origin`이 이미 아래 URL로 설정되어 있었음:
  - `https://github.com/congjang/remind.git`

### 3) 원격 업로드 여부

- 원격 저장소 페이지는 empty 상태로 확인됨.
- 따라서 "현재까지 로컬 작업이 자동 업로드되었다"는 정황은 없음.

## "내가 git 세팅한 적이 없는데 왜 git repo?"에 대한 해석

가능성이 높은 순서:

1. 프로젝트 생성 과정에서 도구가 자동으로 `git init` 수행  
   (Next 생성 흐름에서 자주 발생)
2. 이후 어느 시점에 `origin` remote가 추가됨
3. 다만 push는 아직 수행되지 않아 원격이 비어 있는 상태

즉, "로컬은 git인데 GitHub는 비어 있음"은 모순이 아니라 정상 케이스입니다.

## 이 대화에서 assistant가 한 일 / 하지 않은 일

### assistant가 한 일

- `git status`, `git remote -v`, `git log`, `git reflog`, `.git/config` 조회
- 조회 결과를 설명

### assistant가 하지 않은 일

- `git push`
- `git remote add/set-url/remove`
- GitHub repo 생성
- git config 변경

## 이후 운영 가이드 (안전)

원치 않는 업로드를 막고 싶으면:

1. remote 연결 확인
   ```bash
   git remote -v
   ```
2. 임시 차단(선택): remote 제거
   ```bash
   git remote remove origin
   ```
3. 원하는 저장소로 재연결(필요할 때만)
   ```bash
   git remote add origin <원하는-repo-url>
   ```

## 용어 빠른 정리

- **로컬 Git 저장소**: `.git` 폴더가 있는 상태 (이력 관리 가능)
- **원격(remote)**: GitHub 등 외부 저장소 연결 정보
- **push**: 로컬 커밋을 원격으로 업로드하는 동작

---

필요하면 이 문서 아래에 "실제 push 시작 날짜/브랜치 전략(main/develop/feature)" 운영 규칙도 이어서 추가합니다.
