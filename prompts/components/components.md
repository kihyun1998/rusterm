# 터미널 앱 컴포넌트 구현 Task List

## Phase 1: 핵심 터미널 기능 (MVP)

### 1.1 기본 환경 설정
- [x] xterm.js 관련 패키지 설치
  - `xterm`, `@xterm/addon-fit`, `@xterm/addon-web-links`
- [x] Rust PTY 의존성 추가
  - `portable-pty` crate 추가 (Cargo.toml)
- [x] 타입 정의 파일 생성
  - `src/types/terminal.ts`: 기본 터미널 타입
  - `src/types/pty.ts`: PTY 통신 인터페이스

### 1.2 백엔드 PTY 구현 (Rust)
- [x] `src-tauri/src/pty/mod.rs` 생성
  - PTY 세션 생성/종료
  - 입력/출력 스트림 처리
- [x] Tauri 커맨드 추가 (`src-tauri/src/lib.rs`)
  - `create_pty`: 새 PTY 세션 생성
  - `write_to_pty`: 입력 전달
  - `close_pty`: PTY 종료
- [x] PTY 출력 이벤트 발행
  - `pty-output` 이벤트로 터미널 출력 전달

### 1.3 프론트엔드 터미널 컴포넌트
- [x] `src/components/terminal/Terminal.tsx` 생성
  - xterm.js Terminal 인스턴스 초기화
  - PTY와 연결 (invoke + listen)
  - 리사이즈 처리 (addon-fit 사용)
- [x] `src/hooks/use-pty.ts` 훅 생성
  - PTY 생성/종료 로직
  - 입력 전송 함수
  - 출력 이벤트 리스닝
- [x] 기본 xterm 설정
  - `src/lib/xterm-config.ts`: 폰트, 색상, 스크롤 설정

### 1.4 기본 레이아웃
- [ ] `src/App.tsx` 수정
  - Terminal 컴포넌트 렌더링
  - 전체 화면 레이아웃 구성
- [ ] CSS 스타일링
  - 터미널이 부모 크기에 맞게 조정

---

## Phase 2: 탭 및 분할 패널

### 2.1 탭 관리
- [ ] 탭 상태 관리 (Context API 사용)
  - `src/stores/tab-context.tsx`: TabProvider 생성
  - 탭 추가/제거/선택 함수
- [ ] `src/components/layout/TabBar.tsx` 생성
  - 탭 리스트 렌더링
  - 새 탭 버튼
  - 탭 닫기 버튼
- [ ] 탭별 터미널 인스턴스 관리
  - 각 탭마다 독립적인 PTY 세션

### 2.2 분할 패널
- [ ] `react-resizable-panels` 설치
- [ ] `src/components/layout/SplitPane.tsx` 생성
  - Horizontal/Vertical 분할 지원
  - 리사이즈 핸들
- [ ] 분할 상태 관리
  - 분할 트리 구조 (간단한 배열 또는 재귀 구조)

---

## Phase 3: 타이틀바 및 윈도우 컨트롤

### 3.1 커스텀 타이틀바
- [ ] Tauri 설정 수정
  - `tauri.conf.json`: decorations false 설정
- [ ] `src/components/layout/TitleBar.tsx` 생성
  - `data-tauri-drag-region` 추가
  - 최소화/최대화/닫기 버튼
- [ ] 윈도우 컨트롤 함수
  - `@tauri-apps/api/window` 사용
  - minimize, maximize/unmaximize, close

---

## Phase 4: 메뉴 및 단축키

### 4.1 컨텍스트 메뉴
- [ ] shadcn/ui `ContextMenu` 컴포넌트 추가
- [ ] `src/components/menu/TerminalContextMenu.tsx`
  - 복사/붙여넣기
  - 선택 전체/지우기
- [ ] 클립보드 접근
  - `src/hooks/use-clipboard.ts`: Tauri clipboard API

### 4.2 커맨드 팔레트
- [ ] shadcn/ui `Command` 컴포넌트 추가
- [ ] `src/components/menu/CommandPalette.tsx`
  - Ctrl+Shift+P로 토글
  - 기본 명령 리스트 (새 탭, 분할, 설정 등)

### 4.3 키보드 단축키
- [ ] `src/hooks/use-shortcuts.ts` 훅
  - Ctrl+T: 새 탭
  - Ctrl+W: 탭 닫기
  - Ctrl+Shift+F: 검색
- [ ] 전역 단축키 등록

---

## Phase 5: 설정 시스템

### 5.1 설정 저장/로드
- [ ] 설정 타입 정의
  - `src/types/settings.ts`: 테마, 폰트, 키바인딩 등
- [ ] 백엔드 설정 관리
  - `src-tauri/src/commands/settings.rs`
  - JSON 파일로 저장 (앱 데이터 디렉토리)
- [ ] 프론트엔드 훅
  - `src/hooks/use-settings.ts`: 설정 로드/저장

### 5.2 설정 UI
- [ ] shadcn/ui `Dialog` 컴포넌트 추가
- [ ] `src/components/settings/SettingsDialog.tsx`
  - 탭 형식 (Appearance, Profiles, Keybindings)
- [ ] `src/components/settings/AppearanceSettings.tsx`
  - 폰트 크기/패밀리
  - 테마 선택 (드롭다운)
  - 테마 프리뷰 (작은 터미널 샘플)

### 5.3 프로필 관리
- [ ] 프로필 타입 정의
  - `src/types/profile.ts`: shell 경로, 환경변수, 시작 디렉토리
- [ ] `src/components/settings/ProfileSettings.tsx`
  - 프로필 리스트
  - 추가/수정/삭제
- [ ] 기본 프로필
  - PowerShell, CMD, Git Bash (Windows)

---

## Phase 6: 부가 기능

### 6.1 터미널 검색
- [ ] `@xterm/addon-search` 설치
- [ ] `src/components/terminal/TerminalSearch.tsx`
  - 검색 입력창
  - 이전/다음 버튼
  - 정규식 옵션

### 6.2 상태바
- [ ] `src/components/layout/StatusBar.tsx`
  - 현재 디렉토리 표시
  - 활성 쉘 정보
  - 터미널 크기 (행x열)

### 6.3 테마 시스템
- [ ] 기본 테마 정의
  - `src/constants/themes.ts`: Dark, Light, Dracula 등
- [ ] xterm 테마 적용
  - `src/lib/theme-manager.ts`
  - 동적 테마 전환

---

## Phase 7: 최적화 및 개선

### 7.1 성능 최적화
- [ ] 터미널 출력 버퍼링
  - 대량 출력 시 배칭 처리
- [ ] 스크롤백 제한
  - 기본 1000줄로 제한
- [ ] 메모리 관리
  - 탭 닫을 때 PTY 정리

### 7.2 사용자 경험
- [ ] 로딩 상태
  - PTY 초기화 중 스피너
- [ ] 에러 처리
  - PTY 연결 실패 시 메시지
- [ ] 알림
  - shadcn/ui `Toast` 사용
  - 프로세스 완료 알림 (옵션)

---

## 구현 우선순위

**반드시 필요 (Phase 1-2):**
- PTY 연결 및 기본 터미널
- 탭 관리

**권장 (Phase 3-4):**
- 타이틀바
- 컨텍스트 메뉴
- 커맨드 팔레트

**선택적 (Phase 5-7):**
- 설정 시스템
- 검색 기능
- 상태바
- 테마 커스터마이징

---

## 기술 스택 요약

### 필수 의존성
- `xterm` + `@xterm/addon-fit`
- `portable-pty` (Rust)
- `react-resizable-panels`

### 선택적 의존성
- `@xterm/addon-search` (검색)
- `@xterm/addon-web-links` (링크 클릭)
- `zustand` (복잡한 상태 관리 필요 시)

### 이미 있는 것
- shadcn/ui 컴포넌트
- Tauri 설정
- React + TypeScript
