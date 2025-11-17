# RusTerm - Claude AI Development Guide

## 프로젝트 개요

RusTerm은 Tauri 2 기반의 크로스 플랫폼 터미널 에뮬레이터입니다.

**기술 스택:**
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Rust (Tauri 2)
- **UI**: Shadcn/ui + Radix UI + Tailwind CSS 4
- **Terminal**: xterm.js (@xterm/xterm)
- **State Management**: Zustand
- **Theming**: next-themes
- **Package Manager**: pnpm

## IMPORTANT
- ALWAYS use Shadcn MCP to create UI
- ALWAYS ask user for permission when implementing a plan
- NEVER use emoji for design.

## 프로젝트 구조

```
rusterm/
├── src/                          # React 프론트엔드
│   ├── components/
│   │   ├── ui/                   # Shadcn/ui 컴포넌트 (📄 [상세 문서](src/components/ui/CLAUDE.md))
│   │   ├── layout/               # 레이아웃 컴포넌트
│   │   │   ├── MainLayout.tsx
│   │   │   ├── TitleBar.tsx
│   │   │   ├── TabBar.tsx
│   │   │   └── WindowControls.tsx
│   │   ├── terminal/             # 터미널 컴포넌트
│   │   │   └── Terminal.tsx
│   │   ├── settings/             # 설정 UI
│   │   │   └── SettingsDialog.tsx
│   │   ├── command/              # 커맨드 팔레트
│   │   │   └── CommandPalette.tsx
│   │   └── menu/                 # 컨텍스트 메뉴
│   │       └── TerminalContextMenu.tsx
│   ├── hooks/                    # React 훅
│   │   └── use-theme.tsx
│   ├── stores/                   # Zustand 스토어
│   ├── types/                    # TypeScript 타입 정의
│   ├── pages/                    # 페이지 컴포넌트
│   ├── lib/                      # 유틸리티
│   ├── App.tsx                   # 메인 앱 컴포넌트
│   └── main.tsx                  # 엔트리 포인트
│
└── src-tauri/                    # Rust 백엔드
    ├── src/
    │   ├── commands/             # Tauri 커맨드
    │   │   ├── mod.rs
    │   │   └── pty_commands.rs   # PTY 관련 커맨드
    │   ├── pty/                  # PTY (Pseudo-Terminal) 관리
    │   │   ├── mod.rs
    │   │   ├── manager.rs        # PTY 세션 관리자
    │   │   ├── session.rs        # PTY 세션
    │   │   └── types.rs          # 타입 정의
    │   ├── main.rs               # Rust 엔트리 포인트
    │   └── lib.rs                # 라이브러리 설정
    └── Cargo.toml                # Rust 의존성

```

## 핵심 아키텍처

### Frontend (React)

1. **상태 관리 (Zustand)**
   - 탭 관리, 터미널 세션, 테마, 설정 등
   - `src/stores/` 디렉토리에서 관리

2. **터미널 컴포넌트**
   - xterm.js를 사용한 터미널 에뮬레이션
   - `src/components/terminal/Terminal.tsx`에서 구현
   - addon-fit, addon-web-links 사용

3. **UI 컴포넌트**
   - Shadcn/ui 기반 (Radix UI + Tailwind CSS)
   - `src/components/ui/`에 위치
   - 다크모드 지원 (next-themes)
   - 📄 **[공통 컴포넌트 상세 가이드](src/components/ui/CLAUDE.md)** 참고

### Backend (Rust)

1. **PTY 관리**
   - `portable-pty` 크레이트 사용
   - `src-tauri/src/pty/` 디렉토리에서 관리
   - 세션 생성, I/O 처리, 프로세스 관리

2. **Tauri 커맨드**
   - Frontend와 Backend 간 통신
   - `src-tauri/src/commands/`에서 정의
   - PTY 생성, 입력 전송, 크기 조정 등

3. **의존성**
   - tauri: 메인 프레임워크
   - portable-pty: 터미널 에뮬레이션
   - serde/serde_json: 직렬화
   - uuid: 세션 ID 생성
   - tokio: 비동기 처리

## 개발 가이드

### 개발 환경 설정

```bash
# 의존성 설치
pnpm install

# 개발 서버 실행
pnpm tauri dev

# 프로덕션 빌드
pnpm tauri build
```

### 코드 스타일

**TypeScript/React:**
- 함수형 컴포넌트 우선
- TypeScript strict 모드 사용
- 명확한 타입 정의
- 컴포넌트는 `src/components/` 하위 적절한 디렉토리에 배치

**Rust:**
- Rust 2021 edition
- 에러 처리는 `thiserror` 사용
- 비동기 처리는 `tokio` 사용
- 명확한 타입 정의 및 문서화

### 주요 파일 설명

**Frontend:**
- `src/App.tsx`: 메인 애플리케이션 컴포넌트, 탭 초기화 및 전역 단축키
- `src/components/terminal/Terminal.tsx`: xterm.js 터미널 래퍼
- `src/components/layout/MainLayout.tsx`: 메인 레이아웃 (타이틀바, 탭바, 터미널)
- `src/components/command/CommandPalette.tsx`: 커맨드 팔레트 (Cmd/Ctrl+K)
- `src/components/settings/SettingsDialog.tsx`: 설정 다이얼로그 (Cmd/Ctrl+,)

**Backend:**
- `src-tauri/src/main.rs`: Tauri 애플리케이션 엔트리 포인트
- `src-tauri/src/commands/pty_commands.rs`: PTY 관련 Tauri 커맨드
- `src-tauri/src/pty/manager.rs`: PTY 세션 관리자
- `src-tauri/src/pty/session.rs`: 개별 PTY 세션 구현

### 기능 추가 시 주의사항

1. **새 Tauri 커맨드 추가:**
   - `src-tauri/src/commands/`에 함수 정의
   - `src-tauri/src/main.rs`에 커맨드 등록
   - TypeScript에서 `@tauri-apps/api`로 호출

2. **새 UI 컴포넌트 추가:**
   - Shadcn/ui 사용 가능한지 확인
   - 없으면 Radix UI 기반으로 새로 생성
   - `src/components/ui/`에 배치
   - 다크모드 지원 확인

3. **상태 관리:**
   - 전역 상태는 Zustand 스토어 사용
   - `src/stores/`에 스토어 정의
   - 로컬 상태는 React hooks 사용

4. **타입 안정성:**
   - Frontend/Backend 간 데이터 구조는 양쪽에서 정의
   - TypeScript 타입은 `src/types/`에 정의
   - Rust 타입은 `src-tauri/src/pty/types.rs` 등에 정의

### 테스트 및 빌드

```bash
# TypeScript 타입 체크
pnpm run build

# Tauri 개발 모드
pnpm tauri dev

# 프로덕션 빌드
pnpm tauri build
```

### 디버깅

**Frontend:**
- 브라우저 개발자 도구 사용 가능 (Tauri dev 모드)
- React DevTools 사용 가능

**Backend:**
- `println!`, `dbg!` 매크로 사용 (stdout으로 출력)
- `RUST_LOG=debug` 환경 변수로 로그 레벨 조정

## 중요 설정 파일

- `package.json`: npm 의존성 및 스크립트
- `src-tauri/Cargo.toml`: Rust 의존성
- `src-tauri/tauri.conf.json`: Tauri 앱 설정
- `tsconfig.json`: TypeScript 설정
- `components.json`: Shadcn/ui 설정
- `tailwind.config.js`: Tailwind CSS 설정

## 유용한 명령어

```bash
# Shadcn/ui 컴포넌트 추가
pnpm dlx shadcn@latest add <component-name>

# 의존성 업데이트
pnpm update
cargo update

# 린트 (설정 시)
pnpm run lint
cargo clippy
```

## 개발 모드 기능

`isDevelopment` 플래그가 활성화되면:
- ComponentDemo 페이지 접근 가능
- 개발자 도구 활성화
- 추가 디버그 정보 출력

설정: `src/config.ts`

## 참고 문서

- [Tauri Documentation](https://tauri.app/)
- [React Documentation](https://react.dev/)
- [xterm.js Documentation](https://xtermjs.org/)
- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/)
- [portable-pty Crate](https://docs.rs/portable-pty/)

---

**작성일**: 2025-11-17
**버전**: 0.1.0
