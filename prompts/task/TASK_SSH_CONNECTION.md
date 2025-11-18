# Task List: SSH Connection Implementation

## 개요
RusTerm에 SSH 연결 기능을 추가하여 원격 서버에 접속할 수 있도록 구현합니다.
- SSH 세션 생성 및 관리
- Password 및 Private Key 인증 지원
- 터미널 UI 통합
- 연결 프로필 저장 및 관리

---

## Phase 1: Backend 기본 구조 설계

### 1.1 Rust 의존성 추가
- [x] `src-tauri/Cargo.toml` 수정
  - [x] `ssh2 = "0.9"` 크레이트 추가 (또는 `russh`)
  - [x] 기타 필요한 의존성 확인 (async-std, futures, etc.)

### 1.2 SSH 모듈 구조 생성
- [x] `src-tauri/src/ssh/` 디렉토리 생성
- [x] `src-tauri/src/ssh/mod.rs` 파일 생성
  - [x] 모듈 export 설정
- [x] `src-tauri/src/lib.rs` 또는 `main.rs`에 ssh 모듈 추가

---

## Phase 2: SSH 타입 정의 (Rust)

### 2.1 SSH 타입 정의
- [x] `src-tauri/src/ssh/types.rs` 파일 생성
  - [x] `SshConfig` 구조체 정의
    ```rust
    pub struct SshConfig {
        pub host: String,
        pub port: u16,
        pub username: String,
        pub auth_method: AuthMethod,
    }
    ```
  - [x] `AuthMethod` enum 정의
    ```rust
    pub enum AuthMethod {
        Password(String),
        PrivateKey { path: String, passphrase: Option<String> },
    }
    ```
  - [x] `SshSessionInfo` 구조체 (세션 메타데이터) - CreateSshResponse로 구현
  - [x] Serde derive 추가 (직렬화/역직렬화)

### 2.2 에러 타입 정의
- [x] `SshError` enum 정의 (thiserror 사용)
  - [x] 연결 실패, 인증 실패, I/O 에러 등

---

## Phase 3: SSH Session 구현

### 3.1 SSH Session 구조체
- [x] `src-tauri/src/ssh/session.rs` 파일 생성
  - [x] `SshSession` 구조체 정의
    ```rust
    pub struct SshSession {
        session: ssh2::Session,
        channel: ssh2::Channel,
        config: SshConfig,
        id: String,
    }
    ```
  - [x] `new()` 메서드: SSH 연결 및 인증
    - [x] TCP 연결 생성
    - [x] SSH 핸드셰이크
    - [x] 인증 (password 또는 private key)
    - [x] 채널 생성 및 PTY 요청
    - [x] 셸 시작

### 3.2 SSH Session I/O 처리
- [x] `read()` 메서드: 채널에서 데이터 읽기 - start_io_thread에서 통합 처리
- [x] `write()` 메서드: 채널로 데이터 쓰기 - mpsc 채널을 통한 명령 전송
- [x] `resize()` 메서드: PTY 크기 조정 - mpsc 채널을 통한 명령 전송
- [x] `close()` 메서드: 연결 종료 및 리소스 정리 - Drop으로 자동 처리

### 3.3 비동기 I/O 처리
- [x] 백그라운드 스레드에서 SSH 출력 읽기 - mpsc 채널로 개선 완료
- [x] Tauri event로 프론트엔드에 데이터 전송
  - [x] `ssh://output/{session_id}` 이벤트
- [x] SshCommand enum으로 Write/Resize 명령 처리
- [x] start_io_thread에서 동일 채널로 읽기/쓰기 통합 처리

---

## Phase 4: SSH Manager 구현

### 4.1 SSH Manager 구조체
- [x] `src-tauri/src/ssh/manager.rs` 파일 생성
  - [x] `SshManager` 구조체 정의
    ```rust
    pub struct SshManager {
        sessions: Arc<Mutex<HashMap<String, SshSession>>>,
    }
    ```
  - [x] `create_session()`: 새 SSH 세션 생성
  - [ ] `get_session()`: 세션 ID로 조회 - write_to_session 등에서 내부적으로 사용 중
  - [x] `remove_session()`: 세션 제거 - close_session으로 구현
  - [ ] `list_sessions()`: 모든 세션 목록

### 4.2 전역 SSH Manager
- [x] Tauri State로 SshManager 등록
- [x] 앱 시작 시 초기화

---

## Phase 5: Tauri Commands 구현

### 5.1 SSH 커맨드 파일 생성
- [x] `src-tauri/src/commands/ssh_commands.rs` 파일 생성
- [x] `src-tauri/src/commands/mod.rs`에 ssh_commands 추가

### 5.2 커맨드 함수 구현
- [x] `create_ssh_session` 커맨드
  ```rust
  #[tauri::command]
  async fn create_ssh_session(
      manager: State<'_, SshManager>,
      config: SshConfig,
  ) -> Result<String, String>
  ```
  - [x] SSH 세션 생성
  - [x] 세션 ID 반환

- [x] `write_to_ssh` 커맨드 (send_ssh_input 대신)
  ```rust
  #[tauri::command]
  async fn write_to_ssh(
      manager: State<'_, SshManager>,
      session_id: String,
      data: String,
  ) -> Result<(), String>
  ```

- [x] `resize_ssh_session` 커맨드
  ```rust
  #[tauri::command]
  async fn resize_ssh_session(
      manager: State<'_, SshManager>,
      session_id: String,
      cols: u16,
      rows: u16,
  ) -> Result<(), String>
  ```

- [x] `close_ssh_session` 커맨드
  ```rust
  #[tauri::command]
  async fn close_ssh_session(
      manager: State<'_, SshManager>,
      session_id: String,
  ) -> Result<(), String>
  ```

### 5.3 커맨드 등록
- [x] `src-tauri/src/lib.rs`에서 커맨드 등록
  ```rust
  .invoke_handler(tauri::generate_handler![
      create_ssh_session,
      write_to_ssh,
      resize_ssh_session,
      close_ssh_session,
  ])
  ```

---

## Phase 6: Frontend 타입 정의

### 6.1 SSH 타입 정의 (TypeScript)
- [x] `src/types/ssh.ts` 파일 생성 (178줄, 4.6KB)
  - [x] `SshConfig` 인터페이스 (Backend 일치)
    ```typescript
    export interface SshConfig {
      host: string;
      port: number;
      username: string;
      authMethod: AuthMethod;
    }
    ```
  - [x] `AuthMethod` 타입 (Tagged union, Backend 일치)
    ```typescript
    export type AuthMethod =
      | { type: 'password'; password: string }
      | { type: 'privateKey'; path: string; passphrase?: string };
    ```
  - [x] `SshConnectionState` 타입 정의
  - [x] `SshSessionMetadata` 인터페이스 (Frontend 상태 관리용)
  - [x] `SshOutputEvent`, `SshExitEvent` 인터페이스 (Backend 이벤트)
  - [x] Type guards: `isPasswordAuth()`, `isPrivateKeyAuth()`
  - [x] 변환 유틸리티: `toBackendSshConfig()`, `toUiSshConfig()`

### 6.2 Connection 타입 확장
- [x] `src/types/connection.ts` - 변경 없음 (이미 SSHConfig 존재)
  - [x] `SSHConfig` - UI/Profile 저장용 (Flat structure)
  - [x] `ConnectionConfig` 유니온 타입에 포함됨

---

## Phase 7: SSH Connection Dialog 구현

### 7.1 SSH 연결 다이얼로그 컴포넌트
- [x] `src/components/ssh/` 디렉토리 생성
- [x] `src/components/ssh/SSHConnectionDialog.tsx` 파일 생성 (455줄, 14KB)
  - [x] Dialog UI (Shadcn dialog 사용)
  - [x] 입력 필드:
    - [x] Host (input) - 필수 필드
    - [x] Port (input, default: 22) - 숫자 타입, 1-65535 범위
    - [x] Username (input) - 필수 필드
    - [x] Authentication Method (select: Password / Private Key)
    - [x] Password (password input, 조건부 표시) - authMethod === 'password'
    - [x] Private Key Path (input, 조건부 표시) - authMethod === 'privateKey'
    - [x] Private Key Passphrase (password input, optional) - authMethod === 'privateKey'
  - [x] 연결 버튼 - Loading 상태 표시 ("Connecting...")
  - [x] 취소 버튼

### 7.2 폼 유효성 검사
- [x] 필수 필드 검증 (host, username, password/privateKeyPath)
- [x] Port 범위 검증 (1-65535)
- [x] Auth method별 필수 필드 검증
- [x] Profile name 검증 (saveAsProfile === true)
- [x] 에러 메시지 표시 (각 필드 하단 빨간색 텍스트)

### 7.3 프로필 저장 옵션
- [x] "Save as profile" 체크박스
- [x] Profile name 입력 필드 (조건부 표시)
- [x] 저장 시 ConnectionProfileStore.addProfile() 호출
- [x] Keyring에 민감 정보 자동 저장 (password, privateKey, passphrase)
- [x] Toast 알림 (연결 성공, 프로필 저장, 에러)

---

## Phase 8: SSH Hook 구현

### 8.1 use-ssh 훅 생성
- [x] `src/hooks/use-ssh.ts` 파일 생성 (210줄, 6.5KB)
  - [x] `useSsh()` 훅 구현
    ```typescript
    export function useSsh(options: UseSshOptions): UseSshReturn {
      const [sessionId, setSessionId] = useState<string | null>(null);
      const [status, setStatus] = useState<SshConnectionState>('disconnected');
      // ...
    }
    ```
  - [x] `connect()` 함수: SSH 세션 생성 및 이벤트 리스너 등록
  - [x] `sendInput()` 함수: 사용자 입력 전송 (`write_to_ssh` 호출)
  - [x] `resize()` 함수: 터미널 크기 조정 (`resize_ssh_session` 호출)
  - [x] `disconnect()` 함수: 연결 종료 및 cleanup (`close_ssh_session` 호출)

### 8.2 SSH 이벤트 리스너
- [x] `ssh://output/{session_id}` 이벤트 구독 (connect() 함수 내)
- [x] `ssh://exit/{session_id}` 이벤트 구독 (connect() 함수 내)
- [x] onOutput 콜백을 통해 xterm에 출력 데이터 전달
- [x] onStateChange 콜백을 통해 연결 상태 변경 처리
- [x] Cleanup 로직 (unmount 시 이벤트 리스너 해제)

---

## Phase 9: Terminal 컴포넌트 통합

### 9.1 Terminal.tsx 수정
- [ ] `src/components/terminal/Terminal.tsx` 수정
  - [ ] connectionType prop 추가
  - [ ] connectionType에 따라 PTY 또는 SSH 훅 사용
    ```typescript
    const isPty = connectionType === 'local';
    const sshHook = isPty ? null : useSSH(tabId, config);
    ```
  - [ ] 입력 처리 분기 (PTY vs SSH)
  - [ ] 크기 조정 분기

### 9.2 조건부 렌더링
- [ ] SSH 연결 중 로딩 표시
- [ ] 연결 실패 시 에러 메시지
- [ ] 재연결 버튼 (선택적)

---

## Phase 10: 탭 관리 통합

### 10.1 탭 생성 로직 수정
- [ ] `src/stores/use-tab-store.ts` 업데이트
  - [ ] `addTab()` 함수에 connectionType 및 config 파라미터 추가
  - [ ] SSH 탭 생성 시 적절한 메타데이터 설정

### 10.2 탭 닫기 로직
- [ ] SSH 탭 닫기 시 `close_ssh_session` 호출
- [ ] 리소스 정리 확인

---

## Phase 11: UI/UX 개선

### 11.1 탭 표시
- [ ] 탭에 SSH 아이콘 또는 뱃지 추가
- [ ] 연결 상태 표시 (연결 중, 연결됨, 오류)
- [ ] 호스트 정보 표시 (user@host:port)

### 11.2 컨텍스트 메뉴
- [ ] SSH 탭 우클릭 메뉴
  - [ ] "재연결" 옵션
  - [ ] "프로필로 저장" 옵션
  - [ ] "연결 정보" 옵션

### 11.3 연결 상태 인디케이터
- [ ] 연결 중: 스피너 또는 애니메이션
- [ ] 연결됨: 녹색 점
- [ ] 연결 실패: 빨간색 점 + 에러 메시지

---

## Phase 12: 보안 구현

### 12.1 비밀번호/키 보안 저장
- [ ] Tauri Secure Storage 플러그인 검토
- [ ] 민감한 정보 메모리 관리
  - [ ] 사용 후 비밀번호 메모리 클리어
  - [ ] Private key passphrase 보안 처리

### 12.2 에러 메시지 보안
- [ ] 사용자에게 상세 에러 표시 (개발 모드)
- [ ] 프로덕션에서는 일반적인 에러 메시지
- [ ] 로그에는 상세 정보 기록

---

## Phase 13: 프로필 관리

### 13.1 프로필 저장
- [ ] SSH 연결 성공 시 자동으로 프로필 생성 (선택적)
- [ ] 수동 프로필 생성 옵션
- [ ] 프로필에 이름, 아이콘 설정

### 13.2 프로필 편집/삭제
- [ ] 설정 페이지에서 SSH 프로필 관리
- [ ] 프로필 편집 다이얼로그
- [ ] 프로필 삭제 확인 다이얼로그

### 13.3 즐겨찾기 및 최근 연결
- [ ] ConnectionProfileStore와 통합
- [ ] 프로필 사용 시 최근 목록에 추가
- [ ] 즐겨찾기 토글 기능

---

## Phase 14: 추가 기능 (선택적)

### 14.1 자동 재연결
- [ ] 연결 끊김 감지
- [ ] 자동 재연결 시도 (재시도 횟수 제한)
- [ ] 재연결 중 UI 표시

### 14.2 SSH 터널링
- [ ] 로컬 포트 포워딩
- [ ] 리모트 포트 포워딩
- [ ] 다이나믹 포트 포워딩 (SOCKS proxy)

### 14.3 SFTP 지원
- [ ] SSH 세션에서 SFTP 채널 생성
- [ ] 파일 업로드/다운로드 UI
- [ ] 파일 브라우저 컴포넌트

### 14.4 Known Hosts 관리
- [ ] 서버 fingerprint 검증
- [ ] Known hosts 파일 관리
- [ ] Host key 변경 경고

---

## Phase 15: 테스트

### 15.1 단위 테스트 (Rust)
- [ ] SSH 세션 생성 테스트 (모의 서버)
- [ ] 인증 메서드 테스트
- [ ] I/O 처리 테스트
- [ ] 에러 처리 테스트

### 15.2 통합 테스트 (Frontend + Backend)
- [ ] SSH 연결 플로우 테스트
- [ ] 데이터 송수신 테스트
- [ ] 탭 관리 테스트
- [ ] 프로필 저장/불러오기 테스트

### 15.3 수동 테스트 시나리오
- [ ] 로컬 SSH 서버에 연결
- [ ] 원격 서버에 연결
- [ ] Password 인증 테스트
- [ ] Private Key 인증 테스트
- [ ] 여러 SSH 탭 동시 실행
- [ ] 탭 닫기 및 재연결
- [ ] 프로필 관리 테스트
- [ ] 에러 상황 테스트 (잘못된 비밀번호, 네트워크 끊김 등)

---

## Phase 16: 문서 업데이트

### 16.1 CLAUDE.md 업데이트
- [ ] SSH 모듈 구조 설명 추가
- [ ] SSH 커맨드 문서화
- [ ] 사용자 가이드 추가

### 16.2 README.md 업데이트
- [ ] SSH 기능 추가 명시
- [ ] 지원하는 인증 방법 설명

### 16.3 코드 주석
- [ ] 복잡한 로직에 주석 추가
- [ ] Public API 문서화

---

## 우선순위

### High Priority (핵심 기능)
- Phase 1-5: Backend SSH 세션 구현
- Phase 6-8: Frontend 기본 UI
- Phase 9-10: 터미널 통합
- Phase 15: 기본 테스트

### Medium Priority (사용성)
- Phase 11: UI/UX 개선
- Phase 13: 프로필 관리
- Phase 12: 보안 구현

### Low Priority (향후 개선)
- Phase 14: 추가 기능 (터널링, SFTP, Known Hosts)
- Phase 16: 문서화

---

## 의존성

- **TASK_COMMAND_PALETTE_CONNECTION.md 완료 필요**
  - Connection 타입 정의
  - ConnectionProfileStore 구현
  - Command Palette 통합

---

## 예상 결과물

### 사용자 플로우
1. 사용자가 `+` 버튼 클릭 또는 Command Palette에서 "SSH" 선택
2. SSH Connection Dialog 오픈
3. 호스트, 포트, 사용자명, 인증 정보 입력
4. "Connect" 버튼 클릭
5. 연결 중 로딩 표시
6. 연결 성공 시 터미널 표시
7. 터미널에서 SSH 서버와 상호작용

### UI 스크린샷 (예시)
```
┌─ SSH Connection ──────────────────────┐
│ Host:       example.com               │
│ Port:       22                        │
│ Username:   user                      │
│                                       │
│ Authentication:                       │
│ ○ Password                            │
│ ● Private Key                         │
│                                       │
│ Key Path:   /home/user/.ssh/id_rsa    │
│ Passphrase: ••••••••                  │
│                                       │
│ □ Save as profile: "Production Server"│
│                                       │
│ [Cancel]              [Connect]       │
└───────────────────────────────────────┘
```

### 탭 표시 예시
```
[💻 Local] [🔒 user@server:22] [🔒 prod-db] [+]
                ↑ SSH 연결 탭
```

---

## 기술적 고려사항

### SSH2 크레이트 vs Russh
- **ssh2**: 더 성숙하고 안정적, libssh2 바인딩
- **russh**: Pure Rust, 비동기 네이티브, 더 현대적

**권장**: ssh2 (안정성 우선), 추후 russh로 마이그레이션 고려

### 비동기 처리
- SSH I/O는 블로킹 작업
- 별도 스레드 또는 Tokio 비동기 런타임 활용
- Tauri event로 프론트엔드 통신

### 보안 고려사항
- 비밀번호는 메모리에서 즉시 제거
- Private key는 안전한 저장소에 보관
- HTTPS/WSS 통신 (Tauri는 기본 지원)

---

**작성일**: 2025-11-18
**관련 Task**: TASK_COMMAND_PALETTE_CONNECTION.md
**의존성**: Connection 타입 및 프로필 시스템 구현 필요
