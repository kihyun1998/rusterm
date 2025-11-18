# Task List: Command Palette Connection Mode

## 개요
새 탭 생성 시 다양한 연결 타입을 선택할 수 있도록 Command Palette를 확장합니다.
- `+` 버튼 클릭 시 연결 선택 커맨드 팔레트 오픈
- `Ctrl+Shift+T`는 기존처럼 로컬 터미널 즉시 생성 유지

---

## Phase 1: 기본 구조 설계 및 타입 정의

### 1.1 타입 정의
- [x] `src/types/connection.ts` 파일 생성
  - [x] `ConnectionType` 타입 정의 (`'local' | 'ssh' | 'telnet' | 'rdp' | 'sftp'`)
  - [x] `ConnectionConfig` 유니온 타입 정의
  - [x] `ConnectionProfile` 타입 정의 (id, name, icon, type, config, favorite, lastUsed)
  - [x] 각 연결 타입별 Config 인터페이스 정의 (LocalConfig, SSHConfig, etc.)

### 1.2 탭 스토어 확장
- [x] `src/stores/use-tab-store.ts` 수정
  - [x] Tab 타입에 `connectionType` 필드 추가
  - [x] Tab 타입에 `connectionConfig` 필드 추가 (optional)
  - [x] 기존 PTY 관련 필드와 호환성 유지

---

## Phase 2: Connection Profile Store 구현

### 2.1 프로필 스토어 생성
- [ ] `src/stores/use-connection-profile-store.ts` 파일 생성
  - [ ] 상태 정의
    - [ ] `profiles: ConnectionProfile[]`
    - [ ] `recentConnections: string[]` (profile IDs)
  - [ ] Actions 정의
    - [ ] `addProfile(profile: ConnectionProfile)`
    - [ ] `updateProfile(id: string, profile: Partial<ConnectionProfile>)`
    - [ ] `deleteProfile(id: string)`
    - [ ] `toggleFavorite(id: string)`
    - [ ] `addToRecent(id: string)`
    - [ ] `getRecentProfiles(limit?: number)`
    - [ ] `getFavoriteProfiles()`

### 2.2 로컬 스토리지 연동
- [ ] Zustand persist middleware 설정
  - [ ] 프로필 데이터 localStorage에 저장
  - [ ] 앱 시작 시 자동 로드

---

## Phase 3: Command Palette 확장

### 3.1 Command Palette 모드 추가
- [ ] `src/components/command/CommandPalette.tsx` 수정
  - [ ] `mode` prop 추가: `'command' | 'connection'`
  - [ ] Connection 모드용 아이템 렌더링 로직 추가
  - [ ] 그룹화 지원 (Recent, Favorites, New Connection)

### 3.2 Connection 아이템 컴포넌트
- [ ] Connection 아이템 UI 디자인
  - [ ] 아이콘 + 이름 + 타입 표시
  - [ ] 최근 사용 시간 표시 (optional)
  - [ ] 즐겨찾기 아이콘 표시

### 3.3 검색 기능
- [ ] Connection 모드 검색 로직 구현
  - [ ] 프로필 이름으로 필터링
  - [ ] 연결 타입으로 필터링
  - [ ] 호스트 주소로 필터링 (SSH 등)

---

## Phase 4: 새 탭 버튼 동작 변경

### 4.1 TabBar 컴포넌트 수정
- [ ] `src/components/layout/TabBar.tsx` 수정
  - [ ] `+` 버튼 클릭 핸들러 변경
  - [ ] Connection mode Command Palette 오픈 로직 추가

### 4.2 Command Palette 상태 관리
- [ ] Command Palette open 상태를 전역 관리
  - [ ] `use-command-palette-store.ts` 생성 (optional)
  - [ ] 또는 기존 App.tsx 상태 확장
  - [ ] `openConnectionPalette()` 함수 구현

---

## Phase 5: 연결 타입별 처리 로직

### 5.1 로컬 터미널 생성
- [ ] 로컬 터미널 선택 시 기존 PTY 생성 로직 호출
- [ ] 즉시 탭 생성 및 터미널 시작

### 5.2 SSH 연결 플로우 (추후 구현과 연동)
- [ ] SSH 선택 시 `SSHConnectionDialog` 오픈
- [ ] 저장된 SSH 프로필 선택 시 바로 연결 시도

### 5.3 기타 연결 타입 플레이스홀더
- [ ] Telnet, RDP, SFTP 선택 시 "Coming Soon" 메시지
- [ ] 또는 각 타입별 설정 다이얼로그 오픈 (추후 구현)

---

## Phase 6: 아이콘 및 UI 개선

### 6.1 연결 타입별 아이콘 정의
- [ ] `src/constants/connection-icons.ts` 파일 생성
  - [ ] 각 ConnectionType별 아이콘 매핑
  - [ ] Lucide React 아이콘 사용

### 6.2 탭에 연결 타입 표시
- [ ] 탭 타이틀 옆에 작은 뱃지/아이콘 추가
  - [ ] SSH 탭: 🔒 또는 별도 아이콘
  - [ ] 로컬 탭: 💻 또는 아이콘 없음

---

## Phase 7: 단축키 유지 및 테스트

### 7.1 단축키 동작 확인
- [ ] `Ctrl+Shift+T` → 로컬 터미널 즉시 생성 (기존 동작 유지)
- [ ] `Cmd/Ctrl+K` → 기존 커맨드 팔레트 (일반 모드)
- [ ] `+` 버튼 → 연결 선택 커맨드 팔레트 (connection 모드)

### 7.2 통합 테스트
- [ ] 로컬 터미널 생성 테스트
- [ ] Command Palette 오픈/닫기 테스트
- [ ] 프로필 추가/삭제 테스트
- [ ] 최근 연결 목록 테스트
- [ ] 즐겨찾기 토글 테스트

---

## Phase 8: 문서 업데이트

### 8.1 CLAUDE.md 업데이트
- [ ] 새로운 연결 관리 기능 설명 추가
- [ ] 프로필 스토어 구조 문서화
- [ ] 커맨드 팔레트 모드 설명 추가

### 8.2 사용자 가이드 (선택)
- [ ] 연결 프로필 생성 방법
- [ ] 즐겨찾기 사용 방법
- [ ] 단축키 안내

---

## 우선순위

**High Priority (반드시 구현):**
- Phase 1: 타입 정의
- Phase 3: Command Palette 확장
- Phase 4: 새 탭 버튼 동작 변경
- Phase 5.1: 로컬 터미널 생성

**Medium Priority (핵심 기능):**
- Phase 2: Connection Profile Store
- Phase 6: 아이콘 및 UI 개선
- Phase 7: 단축키 및 테스트

**Low Priority (추후 개선):**
- Phase 8: 문서 업데이트
- 고급 검색 기능
- 프로필 Import/Export

---

## 예상 결과물

### 사용자 플로우
1. 사용자가 `+` 버튼 클릭
2. Connection 모드 Command Palette 오픈
3. 그룹화된 목록 표시:
   - Recent Connections (최근 연결)
   - Favorites (즐겨찾기)
   - New Connection (새 연결: Local, SSH, Telnet, etc.)
4. 사용자가 항목 선택
   - 로컬 터미널 → 즉시 생성
   - 저장된 프로필 → 즉시 연결
   - 새 SSH → 설정 다이얼로그 오픈

### UI 예시
```
┌─ New Connection ─────────────────────┐
│ 🔍 Search connections...             │
├──────────────────────────────────────┤
│ ⚡ Recent Connections                │
│   🔒  my-server (SSH)                │
│   🔒  production-db (SSH)            │
│   📡  legacy-system (Telnet)         │
├──────────────────────────────────────┤
│ ⭐ Favorites                         │
│   🔒  dev-environment (SSH)          │
├──────────────────────────────────────┤
│ 🔌 New Connection                    │
│   💻  Local Terminal                 │
│   🔒  SSH                            │
│   📡  Telnet                         │
│   📁  SFTP                           │
│   🖥️  RDP                            │
└──────────────────────────────────────┘
```

---

**작성일**: 2025-11-18
**관련 Task**: TASK_SSH_CONNECTION.md
