# RusTerm IPC 구현 Task List

**Version**: 1.0
**Date**: 2025-11-19
**Reference**: [IPC_DESIGN.md](./IPC_DESIGN.md)

---

## Phase 1: IPC 인프라 구축

### Task 1.1: IPC 모듈 기본 구조 생성

**구현 내용:**
- `src-tauri/src/ipc/` 디렉토리 생성
- 모듈 파일 구조 생성
  - `mod.rs` - Public exports
  - `protocol.rs` - Request/Response 타입 정의
  - `server.rs` - IPC 서버 기본 골격
  - `handler.rs` - 요청 핸들러
  - `lifecycle.rs` - Shutdown 관리
  - `platform/mod.rs` - 플랫폼별 구현 진입점

**완료 조건:**
- [x] 모든 파일 생성 완료
- [x] `mod.rs`에서 public API export
- [x] 컴파일 에러 없음 (`cargo check` 통과)

**테스트 방법:**
```bash
# 1. 디렉토리 구조 확인
ls -la src-tauri/src/ipc/
ls -la src-tauri/src/ipc/platform/

# 2. 컴파일 확인
cd src-tauri
cargo check

# 3. 모듈이 정상적으로 인식되는지 확인
cargo tree | grep rusterm
```

---

### Task 1.2: IPC 프로토콜 타입 정의

**구현 내용:**
- `protocol.rs`에 Request/Response 구조체 정의
  - `IpcRequest`
  - `IpcResponse`
  - `IpcCommand` enum
  - `AddSshTabParams`
  - `AddLocalTabParams`
  - `CloseTabParams`
  - `PingResponse`
  - `IpcError` enum

**완료 조건:**
- [x] 모든 타입 정의 완료
- [x] Serde derive 적용 (Serialize/Deserialize)
- [x] 기존 `SshConfig` 타입과 호환
- [x] 컴파일 에러 없음

**테스트 방법:**
```bash
# 1. 컴파일 확인
cargo check

# 2. JSON 직렬화/역직렬화 테스트 (단위 테스트 작성)
cargo test protocol

# 3. 테스트 코드 예시가 protocol.rs에 있어야 함:
# #[cfg(test)]
# mod tests {
#     #[test]
#     fn test_serialize_ping_request() { ... }
#     #[test]
#     fn test_deserialize_add_ssh_tab() { ... }
# }
```

**수동 테스트:**
```rust
// src-tauri/src/ipc/protocol.rs 하단에 추가
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ping_serialization() {
        let req = IpcRequest {
            token: None,
            command: "ping".to_string(),
            params: None,
        };
        let json = serde_json::to_string(&req).unwrap();
        println!("{}", json);
        assert!(json.contains("ping"));
    }
}
```

---

### Task 1.3: Unix Domain Socket 구현 (Linux/macOS)

**구현 내용:**
- `platform/unix.rs` 파일 생성
- Unix Domain Socket 리스너 구현
  - Socket 경로: `/tmp/rusterm-{uid}.sock`
  - 권한 설정: 0600
  - 비동기 accept 처리
- 연결 핸들링 기본 구조

**완료 조건:**
- [x] `UnixListener` 생성 함수 구현
- [x] Socket 파일 권한 0600 설정
- [x] 기존 socket 파일 정리 로직
- [x] 비동기 연결 수락 구현
- [x] Linux/macOS에서 컴파일 성공

**테스트 방법:**
```bash
# 1. Linux/macOS에서 빌드
cargo build

# 2. Socket 파일 생성 확인 (앱 실행 후)
ls -la /tmp/rusterm-*.sock

# 3. 권한 확인 (0600 = rw-------)
stat -c "%a %n" /tmp/rusterm-*.sock  # Linux
stat -f "%Sp %N" /tmp/rusterm-*.sock # macOS

# 4. netcat으로 연결 테스트
echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock

# 5. 여러 연결 동시 테스트
for i in {1..5}; do
  echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock &
done
wait
```

**예상 결과:**
- Socket 파일이 `/tmp/`에 생성됨
- 권한이 `rw-------` (600)
- netcat 연결이 성공함

---

### Task 1.4: Named Pipes 구현 (Windows)

**구현 내용:**
- `platform/windows.rs` 파일 생성
- Named Pipe 리스너 구현
  - Pipe 이름: `\\.\pipe\rusterm-{username}`
  - ACL 설정 (현재 사용자만 접근)
  - 비동기 연결 처리
- `interprocess` crate 활용

**완료 조건:**
- [x] Named Pipe 생성 함수 구현
- [x] ACL 보안 설정
- [x] 비동기 연결 수락 구현
- [x] Windows에서 컴파일 성공

**테스트 방법:**
```powershell
# 1. Windows에서 빌드
cargo build

# 2. Named Pipe 목록 확인
Get-ChildItem \\.\pipe\ | Where-Object { $_.Name -like "rusterm-*" }

# 3. PowerShell로 연결 테스트
$pipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", "rusterm-$env:USERNAME", [System.IO.Pipes.PipeDirection]::InOut)
$pipe.Connect(1000)
$writer = New-Object System.IO.StreamWriter($pipe)
$writer.WriteLine('{"command":"ping"}')
$writer.Flush()
$reader = New-Object System.IO.StreamReader($pipe)
$response = $reader.ReadLine()
Write-Host $response
$pipe.Close()

# 4. 다른 사용자 계정으로 접근 시도 (실패해야 함)
# - 별도 계정에서 위 스크립트 실행 → Access Denied 확인
```

**예상 결과:**
- Named Pipe가 생성됨
- 같은 사용자만 연결 가능
- 다른 사용자는 Access Denied

---

### Task 1.5: 기본 요청 핸들러 구현 (ping)

**구현 내용:**
- `handler.rs`에 요청 처리 로직 구현
- `ping` 커맨드 핸들러 작성
  - 현재 버전 반환
  - 프로세스 PID 반환
- JSON 파싱 및 응답 직렬화

**완료 조건:**
- [x] `handle_request()` 함수 구현
- [x] `ping` 커맨드 처리
- [x] JSON 에러 핸들링
- [x] 단위 테스트 작성

**테스트 방법:**
```bash
# 1. 단위 테스트 실행
cargo test handler::tests

# 2. 통합 테스트 (앱 실행 후)
# Linux/macOS
echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock

# Windows (PowerShell)
# (Task 1.4의 PowerShell 스크립트 사용)

# 3. 잘못된 JSON 전송
echo 'invalid json' | nc -U /tmp/rusterm-$(id -u).sock

# 4. 알 수 없는 커맨드
echo '{"command":"unknown"}' | nc -U /tmp/rusterm-$(id -u).sock
```

**예상 응답:**
```json
// ping 성공
{"success":true,"data":{"version":"0.1.0","pid":12345}}

// JSON 파싱 에러
{"success":false,"error":"Invalid JSON format"}

// 알 수 없는 커맨드
{"success":false,"error":"Unknown command: unknown"}
```

---

### Task 1.6: 백그라운드 스레드 실행 구조

**구현 내용:**
- `server.rs`에 IPC 서버 구조체 구현
- Tokio async runtime에서 실행
- `tokio::spawn()`으로 백그라운드 태스크 생성
- `oneshot` 채널로 종료 신호 전달

**완료 조건:**
- [x] `IpcServer` 구조체 정의
- [x] `start()` async 함수 구현
- [x] `shutdown()` 함수 구현
- [x] `Drop` trait 구현
- [x] GUI 스레드 블로킹하지 않음

**테스트 방법:**
```bash
# 1. 앱 실행 후 IPC 서버가 백그라운드에서 동작하는지 확인
# Linux/macOS
pgrep -f rusterm  # 프로세스 확인
ss -lx | grep rusterm  # Unix socket listening 확인

# Windows
Get-Process | Where-Object { $_.ProcessName -like "*rusterm*" }
Get-ChildItem \\.\pipe\ | Where-Object { $_.Name -like "rusterm-*" }

# 2. GUI 반응성 확인
# - 앱 실행 후 탭 생성/닫기 등이 정상 동작하는지 확인
# - IPC 서버가 GUI를 블로킹하지 않는지 확인

# 3. 동시 연결 테스트
for i in {1..10}; do
  echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock &
done
wait
# 모든 요청이 응답되어야 함
```

**예상 결과:**
- IPC 서버가 백그라운드에서 실행됨
- GUI가 정상적으로 반응함
- 동시 연결이 모두 처리됨

---

### Task 1.7: Graceful Shutdown 구현

**구현 내용:**
- `lifecycle.rs`에 종료 관리 로직 구현
- `tokio::select!`로 종료 신호 감지
- 활성 연결 정리
- Socket 파일 삭제 (Unix)
- Tauri `on_window_event`에서 shutdown 호출

**완료 조건:**
- [x] 종료 신호 처리 구현
- [x] 활성 연결 우아한 종료
- [x] 리소스 정리 (socket 파일 등)
- [x] `lib.rs`에서 Tauri 통합

**테스트 방법:**
```bash
# 1. 정상 종료 테스트
# - 앱 실행
# - 창 닫기 버튼 클릭
# - Socket 파일이 삭제되었는지 확인
ls -la /tmp/rusterm-*.sock  # 파일이 없어야 함

# 2. 활성 연결 중 종료 테스트
# Terminal 1: 연결 유지
nc -U /tmp/rusterm-$(id -u).sock
# (입력 대기 상태)

# Terminal 2: 앱 종료
# - RusTerm 창 닫기

# Terminal 1에서 연결이 정상적으로 종료되는지 확인

# 3. 강제 종료 테스트 (SIGTERM)
# - 앱 실행
# - PID 확인
pgrep -f rusterm
# - SIGTERM 전송
kill -TERM <pid>
# - Socket 파일 확인
ls -la /tmp/rusterm-*.sock  # 파일이 없어야 함 (또는 다음 실행 시 자동 삭제)

# 4. 비정상 종료 테스트 (SIGKILL)
# - 앱 실행
# - SIGKILL 전송
kill -9 <pid>
# - Socket 파일 확인 (남아있을 수 있음)
ls -la /tmp/rusterm-*.sock
# - 앱 재시작
# - 기존 socket 파일이 자동 정리되고 새로 생성되는지 확인
```

**예상 결과:**
- 정상 종료: Socket 파일 자동 삭제
- SIGTERM: Socket 파일 자동 삭제
- SIGKILL: 다음 실행 시 기존 socket 자동 정리

---

### Task 1.8: Tauri 앱 통합

**구현 내용:**
- `lib.rs`의 `run()` 함수에 IPC 서버 통합
- `setup` 훅에서 IPC 서버 시작
- `on_window_event`에서 IPC 서버 종료
- AppHandle을 IPC 핸들러에서 사용 가능하도록 전달

**완료 조건:**
- [x] IPC 서버가 앱 시작 시 자동 실행
- [x] AppHandle 전달 구조 구현
- [x] 앱 종료 시 IPC 서버 자동 종료
- [x] 컴파일 및 실행 성공

**테스트 방법:**
```bash
# 1. 앱 실행
pnpm tauri dev

# 2. 로그 확인 (콘솔 출력)
# "IPC server started" 메시지 확인

# 3. Socket/Pipe 생성 확인
# Linux/macOS
ls -la /tmp/rusterm-*.sock

# Windows
Get-ChildItem \\.\pipe\ | Where-Object { $_.Name -like "rusterm-*" }

# 4. ping 요청 테스트
echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock

# 5. 앱 종료 후 확인
# - 창 닫기
# - "IPC server stopped" 메시지 확인
# - Socket 파일 삭제 확인

# 6. 여러 번 재시작 테스트
for i in {1..3}; do
  # 앱 실행
  # ping 요청
  # 앱 종료
done
```

**예상 결과:**
- 앱 시작 시 IPC 서버 자동 시작
- ping 요청에 정상 응답
- 앱 종료 시 IPC 서버 자동 종료
- 재시작 시 정상 동작

---

## Phase 2: 핵심 Tab 관리 API

### Task 2.1: Frontend Tab Store 분석

**구현 내용:**
- `src/stores/use-tab-store.ts` 분석
- Tab 추가/제거 함수 파악
- Tauri 이벤트 리스너 구조 파악
- IPC → Tab Store 연동 방법 설계

**완료 조건:**
- [x] Tab Store API 문서화
- [x] 필요한 Tauri 이벤트 정의
- [x] 연동 방법 설계 완료

**테스트 방법:**
```bash
# 1. 코드 리뷰
cat src/stores/use-tab-store.ts

# 2. 기존 Tab 생성 플로우 확인
# - 앱 실행
# - 새 탭 버튼 클릭
# - 개발자 도구에서 네트워크/이벤트 확인

# 3. Tauri 이벤트 확인
# src/App.tsx 또는 Terminal.tsx에서 listen/emit 사용 확인
grep -r "listen\|emit" src/
```

**문서화 예시:**
```markdown
## Tab Store API

### addTab()
- 파라미터: { id, type, title, sessionId }
- 동작: 새 탭 추가, 활성화

### removeTab()
- 파라미터: tabId
- 동작: 탭 제거, 세션 종료

### Tauri Events
- `tab-created`: Frontend로 탭 생성 알림
- `tab-closed`: Frontend로 탭 제거 알림
```

---

### Task 2.2: `add_local_tab` 구현

**구현 내용:**
- `handler.rs`에 `add_local_tab` 핸들러 추가
- 기존 `create_pty` 로직 재사용
- Tauri 이벤트로 Frontend에 알림
- Tab ID 생성 및 반환

**완료 조건:**
- [x] IPC 요청 처리 구현
- [x] PTY 세션 생성
- [x] Tab Store 업데이트 이벤트 emit
- [x] 응답 반환

**테스트 방법:**
```bash
# 1. IPC로 로컬 탭 생성 요청
cat > /tmp/test_add_local.json << 'EOF'
{
  "command": "add_local_tab",
  "params": {
    "cols": 80,
    "rows": 24
  }
}
EOF

cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {
#   "success": true,
#   "data": {
#     "tabId": "tab-uuid-xxx",
#     "sessionId": "pty-session-uuid-yyy"
#   }
# }

# 2. GUI에서 탭이 생성되었는지 확인
# - RusTerm 창에 새 탭이 나타나야 함
# - 터미널이 정상 동작해야 함

# 3. 여러 탭 생성 테스트
for i in {1..5}; do
  cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock
done

# 4. cwd 옵션 테스트
cat > /tmp/test_add_local_cwd.json << 'EOF'
{
  "command": "add_local_tab",
  "params": {
    "cols": 80,
    "rows": 24,
    "cwd": "/home/user"
  }
}
EOF

cat /tmp/test_add_local_cwd.json | nc -U /tmp/rusterm-$(id -u).sock

# GUI에서 생성된 탭의 작업 디렉토리 확인
# pwd 명령어 입력 시 /home/user 출력되어야 함
```

---

### Task 2.3: `add_ssh_tab` 구현

**구현 내용:**
- `handler.rs`에 `add_ssh_tab` 핸들러 추가
- 기존 `create_ssh_session` 로직 재사용
- SSH 인증 정보 처리
- Tauri 이벤트로 Frontend에 알림

**완료 조건:**
- [x] IPC 요청 처리 구현
- [x] SSH 세션 생성
- [x] Password/PrivateKey 인증 지원
- [x] Tab Store 업데이트 이벤트 emit

**테스트 방법:**
```bash
# 1. Password 인증 테스트
cat > /tmp/test_add_ssh_password.json << 'EOF'
{
  "command": "add_ssh_tab",
  "params": {
    "host": "test.example.com",
    "port": 22,
    "username": "testuser",
    "authMethod": {
      "type": "password",
      "password": "testpassword"
    },
    "cols": 80,
    "rows": 24
  }
}
EOF

cat /tmp/test_add_ssh_password.json | nc -U /tmp/rusterm-$(id -u).sock

# 2. PrivateKey 인증 테스트
cat > /tmp/test_add_ssh_key.json << 'EOF'
{
  "command": "add_ssh_tab",
  "params": {
    "host": "test.example.com",
    "port": 22,
    "username": "testuser",
    "authMethod": {
      "type": "privateKey",
      "path": "/home/user/.ssh/id_rsa",
      "passphrase": null
    },
    "cols": 80,
    "rows": 24
  }
}
EOF

cat /tmp/test_add_ssh_key.json | nc -U /tmp/rusterm-$(id -u).sock

# 3. GUI에서 SSH 탭 확인
# - 새 SSH 탭이 생성되어야 함
# - 연결이 성공하면 프롬프트가 나타나야 함
# - 연결 실패 시 에러 메시지 확인

# 4. 잘못된 인증 정보 테스트
cat > /tmp/test_add_ssh_invalid.json << 'EOF'
{
  "command": "add_ssh_tab",
  "params": {
    "host": "invalid.host.com",
    "port": 22,
    "username": "invalid",
    "authMethod": {
      "type": "password",
      "password": "wrongpassword"
    },
    "cols": 80,
    "rows": 24
  }
}
EOF

cat /tmp/test_add_ssh_invalid.json | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {
#   "success": false,
#   "error": "Authentication failed: ..."
# }
```

---

### Task 2.4: `close_tab` 구현

**구현 내용:**
- `handler.rs`에 `close_tab` 핸들러 추가
- Tab Store에서 탭 제거
- 관련 세션 종료 (PTY/SSH)
- Tauri 이벤트로 Frontend에 알림

**완료 조건:**
- [x] IPC 요청 처리 구현
- [x] 탭 ID로 세션 찾기
- [x] 세션 종료 처리
- [x] Tab Store 업데이트 이벤트 emit

**테스트 방법:**
```bash
# 1. 탭 생성 후 ID 기록
RESPONSE=$(cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock)
TAB_ID=$(echo $RESPONSE | jq -r '.data.tabId')
echo "Created tab: $TAB_ID"

# 2. 탭 닫기 요청
cat > /tmp/test_close_tab.json << EOF
{
  "command": "close_tab",
  "params": {
    "tabId": "$TAB_ID"
  }
}
EOF

cat /tmp/test_close_tab.json | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {"success":true}

# 3. GUI에서 탭이 사라졌는지 확인

# 4. 존재하지 않는 탭 닫기 시도
cat > /tmp/test_close_invalid.json << 'EOF'
{
  "command": "close_tab",
  "params": {
    "tabId": "invalid-tab-id"
  }
}
EOF

cat /tmp/test_close_invalid.json | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {"success":false,"error":"Tab not found"}

# 5. 여러 탭 생성 후 일괄 닫기
for i in {1..3}; do
  RESPONSE=$(cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock)
  TAB_ID=$(echo $RESPONSE | jq -r '.data.tabId')
  echo "{\"command\":\"close_tab\",\"params\":{\"tabId\":\"$TAB_ID\"}}" | nc -U /tmp/rusterm-$(id -u).sock
done
```

---

### Task 2.5: `list_tabs` 구현

**구현 내용:**
- `handler.rs`에 `list_tabs` 핸들러 추가
- Tab Store에서 현재 탭 목록 조회
- 탭 정보 직렬화 (id, type, title, active)

**완료 조건:**
- [x] IPC 요청 처리 구현
- [x] Tab Store 조회 로직
- [x] 응답 포맷 구현

**테스트 방법:**
```bash
# 1. 탭 없을 때
echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {"success":true,"data":{"tabs":[]}}

# 2. 로컬 탭 생성 후 조회
cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock
echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답:
# {
#   "success": true,
#   "data": {
#     "tabs": [
#       {
#         "tabId": "tab-uuid-xxx",
#         "type": "local",
#         "title": "Terminal",
#         "active": true
#       }
#     ]
#   }
# }

# 3. SSH 탭 추가 후 조회
cat /tmp/test_add_ssh_password.json | nc -U /tmp/rusterm-$(id -u).sock
echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock

# 예상 응답: 2개 탭

# 4. 탭 닫은 후 조회
# (close_tab으로 탭 닫기)
echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock

# 탭 개수가 줄어들어야 함
```

---

## Phase 3: 테스트 및 문서화

### Task 3.1: 플랫폼별 통합 테스트

**구현 내용:**
- Linux 환경에서 전체 플로우 테스트
- macOS 환경에서 전체 플로우 테스트
- Windows 환경에서 전체 플로우 테스트
- CI/CD 스크립트 작성 (선택)

**완료 조건:**
- [ ] 각 플랫폼에서 모든 명령어 테스트 성공
- [ ] 에러 케이스 확인
- [ ] 성능 확인 (동시 연결 등)

**테스트 방법:**
```bash
# 통합 테스트 스크립트
#!/bin/bash
# tests/ipc_integration_test.sh

echo "=== RusTerm IPC Integration Test ==="

# 1. Ping test
echo "Testing ping..."
RESPONSE=$(echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock)
echo "Ping response: $RESPONSE"

# 2. Add local tab
echo "Testing add_local_tab..."
RESPONSE=$(cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock)
LOCAL_TAB_ID=$(echo $RESPONSE | jq -r '.data.tabId')
echo "Local tab created: $LOCAL_TAB_ID"

# 3. List tabs
echo "Testing list_tabs..."
RESPONSE=$(echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock)
echo "Tabs: $RESPONSE"

# 4. Close tab
echo "Testing close_tab..."
RESPONSE=$(echo "{\"command\":\"close_tab\",\"params\":{\"tabId\":\"$LOCAL_TAB_ID\"}}" | nc -U /tmp/rusterm-$(id -u).sock)
echo "Close response: $RESPONSE"

# 5. Verify tab closed
echo "Verifying tab closed..."
RESPONSE=$(echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock)
echo "Tabs after close: $RESPONSE"

echo "=== Test Complete ==="

# 실행
chmod +x tests/ipc_integration_test.sh
./tests/ipc_integration_test.sh
```

**각 플랫폼별 체크리스트:**
- [ ] Linux: Unix socket 생성, 권한, 모든 명령어 동작
- [ ] macOS: Unix socket 생성, 권한, 모든 명령어 동작
- [ ] Windows: Named Pipe 생성, ACL, 모든 명령어 동작

---

### Task 3.2: IPC 프로토콜 문서 작성

**구현 내용:**
- `docs/IPC_PROTOCOL.md` 작성
- 연결 방법
- 메시지 포맷
- API 레퍼런스 (모든 명령어)
- 에러 코드
- 예제 코드

**완료 조건:**
- [ ] 문서 작성 완료
- [ ] 모든 명령어 문서화
- [ ] 예제 코드 동작 확인

**테스트 방법:**
```bash
# 1. 문서 검토
cat docs/IPC_PROTOCOL.md

# 2. 문서의 예제 코드 실행 테스트
# - 각 예제를 복사해서 실제 실행
# - 예제대로 동작하는지 확인

# 3. 다른 개발자에게 문서 리뷰 요청
# - 문서만 보고 클라이언트 구현 가능한지 확인
```

---

### Task 3.3: Python 예제 클라이언트 작성

**구현 내용:**
- `examples/ipc-clients/python/rusterm_client.py` 작성
- RusTerm IPC 클라이언트 클래스 구현
- Auto-launch 기능
- 모든 명령어 wrapper 함수

**완료 조건:**
- [ ] 클라이언트 라이브러리 구현
- [ ] 사용 예제 작성
- [ ] README 작성

**테스트 방법:**
```bash
# 1. Python 클라이언트 설치
cd examples/ipc-clients/python
pip install -r requirements.txt

# 2. 예제 실행
python examples/basic_usage.py

# 예제 코드:
# from rusterm_client import RustermClient
#
# client = RustermClient()
# client.connect()  # Auto-launch if needed
#
# # Add local tab
# response = client.add_local_tab(cols=80, rows=24)
# print(f"Created tab: {response['data']['tabId']}")
#
# # Add SSH tab
# response = client.add_ssh_tab(
#     host="example.com",
#     username="user",
#     password="pass",
#     cols=80,
#     rows=24
# )
#
# # List tabs
# tabs = client.list_tabs()
# print(f"Total tabs: {len(tabs['data']['tabs'])}")
#
# # Close tab
# client.close_tab(tab_id)

# 3. 모든 기능 테스트
python tests/test_all_commands.py
```

---

### Task 3.4: Node.js 예제 클라이언트 작성

**구현 내용:**
- `examples/ipc-clients/nodejs/rusterm-client.js` 작성
- RusTerm IPC 클라이언트 클래스 구현
- TypeScript 타입 정의
- NPM 패키지 구조

**완료 조건:**
- [ ] 클라이언트 라이브러리 구현
- [ ] TypeScript 타입 정의
- [ ] 사용 예제 작성

**테스트 방법:**
```bash
# 1. NPM 패키지 설치
cd examples/ipc-clients/nodejs
npm install

# 2. 예제 실행
node examples/basic-usage.js

# 예제 코드:
# const RustermClient = require('./rusterm-client');
#
# const client = new RustermClient();
# await client.connect();  // Auto-launch if needed
#
# // Add local tab
# const result = await client.addLocalTab({ cols: 80, rows: 24 });
# console.log(`Created tab: ${result.data.tabId}`);
#
# // Add SSH tab
# await client.addSshTab({
#   host: 'example.com',
#   username: 'user',
#   password: 'pass',
#   cols: 80,
#   rows: 24
# });
#
# // List tabs
# const tabs = await client.listTabs();
# console.log(`Total tabs: ${tabs.data.tabs.length}`);

# 3. TypeScript 테스트
npm run test:ts
```

---

### Task 3.5: README 업데이트

**구현 내용:**
- `README.md`에 IPC 섹션 추가
- 기본 사용법
- 문서 링크
- 예제 링크

**완료 조건:**
- [ ] README 업데이트
- [ ] 링크 동작 확인

**테스트 방법:**
```bash
# 1. README 확인
cat README.md

# 2. 모든 링크 클릭 테스트
# - docs/IPC_PROTOCOL.md 링크
# - examples/ 링크
# - IPC_DESIGN.md 링크

# 3. Quick Start 예제 실행
# README의 예제 코드를 복사해서 실행
```

---

## Phase 4: 추가 기능

### Task 4.1: (Optional) Token 인증 구현

**구현 내용:**
- `auth.rs`에 토큰 관리 구현
- 토큰 생성/검증 로직
- 요청 시 토큰 확인
- 토큰 만료 처리

**완료 조건:**
- [ ] 토큰 생성 함수
- [ ] 토큰 검증 미들웨어
- [ ] 만료 시간 설정

**테스트 방법:**
```bash
# 1. 토큰 없이 요청 (실패)
echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock
# 예상: {"success":false,"error":"Token required"}

# 2. 토큰 발급 요청
echo '{"command":"auth","params":{"action":"request_token"}}' | nc -U /tmp/rusterm-$(id -u).sock
# 예상: {"success":true,"data":{"token":"xxx-yyy-zzz"}}

# 3. 토큰 포함 요청 (성공)
echo '{"token":"xxx-yyy-zzz","command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock

# 4. 만료된 토큰 (실패)
sleep 35  # 토큰 만료 시간 초과
echo '{"token":"xxx-yyy-zzz","command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock
# 예상: {"success":false,"error":"Token expired"}
```

---

### Task 4.2: 에러 핸들링 강화

**구현 내용:**
- 표준 에러 코드 정의
- 상세한 에러 메시지
- 스택 트레이스 (디버그 모드)
- 에러 로깅

**완료 조건:**
- [ ] 에러 코드 enum 정의
- [ ] 에러 응답 포맷 표준화
- [ ] 로깅 추가

**테스트 방법:**
```bash
# 1. 잘못된 JSON
echo 'invalid' | nc -U /tmp/rusterm-$(id -u).sock
# 예상: {"success":false,"error":"Parse error: ...","code":"PARSE_ERROR"}

# 2. 필수 파라미터 누락
echo '{"command":"add_ssh_tab","params":{}}' | nc -U /tmp/rusterm-$(id -u).sock
# 예상: {"success":false,"error":"Missing required field: host","code":"VALIDATION_ERROR"}

# 3. 연결 실패
echo '{"command":"add_ssh_tab","params":{"host":"invalid","username":"x","authMethod":{"type":"password","password":"x"},"cols":80,"rows":24}}' | nc -U /tmp/rusterm-$(id -u).sock
# 예상: {"success":false,"error":"Connection failed: ...","code":"CONNECTION_ERROR"}

# 4. 로그 파일 확인
cat ~/.local/share/rusterm/logs/ipc.log
```

---

### Task 4.3: 로깅 시스템

**구현 내용:**
- `tracing` crate 적용
- 로그 레벨 설정 (DEBUG, INFO, WARN, ERROR)
- 파일 로깅
- 로그 로테이션 (선택)

**완료 조건:**
- [ ] tracing 설정
- [ ] 주요 이벤트 로깅
- [ ] 로그 파일 저장

**테스트 방법:**
```bash
# 1. 앱 실행 (디버그 모드)
RUST_LOG=debug pnpm tauri dev

# 2. 여러 IPC 요청 실행
# (ping, add_tab, close_tab 등)

# 3. 로그 확인
cat ~/.local/share/rusterm/logs/rusterm.log

# 예상 로그:
# [INFO] IPC server started on /tmp/rusterm-1000.sock
# [DEBUG] Accepted new connection
# [DEBUG] Received request: ping
# [INFO] Processed ping command in 0.5ms
# [DEBUG] Connection closed

# 4. 에러 로깅 확인
# 잘못된 요청 전송
echo 'invalid' | nc -U /tmp/rusterm-$(id -u).sock

# 로그 확인
grep ERROR ~/.local/share/rusterm/logs/rusterm.log
```

---

### Task 4.4: 성능 최적화

**구현 내용:**
- 연결 풀링 (필요시)
- 요청 처리 시간 측정
- 메모리 사용량 최적화
- 벤치마크 작성

**완료 조건:**
- [ ] 성능 프로파일링
- [ ] 병목 지점 개선
- [ ] 벤치마크 결과 문서화

**테스트 방법:**
```bash
# 1. 동시 연결 테스트
time for i in {1..100}; do
  echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock &
done
wait

# 100개 연결이 1초 이내에 처리되어야 함

# 2. 대량 탭 생성 테스트
time for i in {1..50}; do
  cat /tmp/test_add_local.json | nc -U /tmp/rusterm-$(id -u).sock
done

# 50개 탭 생성이 5초 이내에 완료되어야 함

# 3. 메모리 사용량 확인
# 앱 실행 전
ps aux | grep rusterm

# 50개 탭 생성 후
ps aux | grep rusterm

# 메모리 증가량이 합리적인지 확인

# 4. CPU 프로파일링
cargo flamegraph --bin rusterm
# flamegraph.svg 확인
```

---

## 완료 체크리스트

### Phase 1: IPC 인프라 구축
- [x] Task 1.1: IPC 모듈 기본 구조 생성
- [x] Task 1.2: IPC 프로토콜 타입 정의
- [x] Task 1.3: Unix Domain Socket 구현
- [x] Task 1.4: Named Pipes 구현
- [x] Task 1.5: 기본 요청 핸들러 구현 (ping)
- [x] Task 1.6: 백그라운드 스레드 실행 구조
- [x] Task 1.7: Graceful Shutdown 구현
- [x] Task 1.8: Tauri 앱 통합

### Phase 2: 핵심 Tab 관리 API
- [x] Task 2.1: Frontend Tab Store 분석
- [x] Task 2.2: `add_local_tab` 구현
- [x] Task 2.3: `add_ssh_tab` 구현
- [x] Task 2.4: `close_tab` 구현
- [x] Task 2.5: `list_tabs` 구현

### Phase 3: 테스트 및 문서화
- [ ] Task 3.1: 플랫폼별 통합 테스트
- [ ] Task 3.2: IPC 프로토콜 문서 작성
- [ ] Task 3.3: Python 예제 클라이언트 작성
- [ ] Task 3.4: Node.js 예제 클라이언트 작성
- [ ] Task 3.5: README 업데이트

### Phase 4: 추가 기능
- [ ] Task 4.1: Token 인증 구현 (Optional)
- [ ] Task 4.2: 에러 핸들링 강화
- [ ] Task 4.3: 로깅 시스템
- [ ] Task 4.4: 성능 최적화

---

## 빠른 테스트 명령어 모음

### Linux/macOS

```bash
# Ping
echo '{"command":"ping"}' | nc -U /tmp/rusterm-$(id -u).sock

# Add local tab
echo '{"command":"add_local_tab","params":{"cols":80,"rows":24}}' | nc -U /tmp/rusterm-$(id -u).sock

# List tabs
echo '{"command":"list_tabs"}' | nc -U /tmp/rusterm-$(id -u).sock

# Close tab (replace TAB_ID)
echo '{"command":"close_tab","params":{"tabId":"TAB_ID"}}' | nc -U /tmp/rusterm-$(id -u).sock

# Add SSH tab (password)
echo '{"command":"add_ssh_tab","params":{"host":"example.com","port":22,"username":"user","authMethod":{"type":"password","password":"pass"},"cols":80,"rows":24}}' | nc -U /tmp/rusterm-$(id -u).sock
```

### Windows (PowerShell)

```powershell
# Ping
$pipe = New-Object System.IO.Pipes.NamedPipeClientStream(".", "rusterm-$env:USERNAME", [System.IO.Pipes.PipeDirection]::InOut)
$pipe.Connect(1000)
$writer = New-Object System.IO.StreamWriter($pipe)
$writer.WriteLine('{"command":"ping"}')
$writer.Flush()
$reader = New-Object System.IO.StreamReader($pipe)
$response = $reader.ReadLine()
Write-Host $response
$pipe.Close()
```

---

**업데이트:** 2025-11-19
**작성자:** Claude AI
