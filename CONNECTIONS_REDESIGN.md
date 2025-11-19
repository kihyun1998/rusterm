# Connection Profile Management Redesign

## 목표
Connection Profile 관리를 단순화하고 사용자 친화적으로 개선

## 현재 문제점
1. Command Palette에서만 프로필 확인 가능
2. 프로필 편집/삭제 불가
3. "Save as Profile" 체크박스가 복잡함 (저장 여부를 사용자가 결정)
4. Favorite/Recent/All 구분이 복잡하고 중복됨
5. 연결 정보가 한눈에 안 보임
6. 같은 서버를 다시 연결해도 새 프로필이 생성됨 (중복 누적)
7. 인증 방식이 다른 경우 구분 안 됨

## 핵심 변경사항

### 1. 자동 저장 (Auto-Save)
- **모든 SSH 연결을 자동으로 저장**
- `saveAsProfile` 체크박스 제거
- 프로필 이름 기본값: **host** (사용자가 수정 가능)

### 2. Favorite/Recent 섹션 제거
- 별표(★) 기능 완전 제거
- Recent 섹션 제거 (All이 이미 최근 순 정렬)
- **"All Connections"** 하나로 통합 (최근 사용 순 자동 정렬)

### 3. Home 화면 개편
Connection 관리의 중심지로 변경 (검색, 편집, 삭제 기능 제공)

## 화면 구성

### Home 화면 레이아웃

```
┌─────────────────────────────────────────────────┐
│  RusTerm                                        │
│  Modern Terminal Emulator                       │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Quick Actions                                  │
│  [+ New Connection]  [Local Terminal] [Settings]│
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  All Connections                    [Search 🔍] │
│  (최근 사용 순으로 자동 정렬)                      │
│                                                 │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Production  │ │ Staging     │ │ DB Server │ │
│  │ root@prod   │ │ deploy@stg  │ │ dba@db    │ │
│  │ SSH · 22    │ │ SSH · 22    │ │ SSH · 3306│ │
│  │ Last: 5m ✅ │ │ Last: 1d    │ │ Last: 3d  │ │
│  │ [Edit][Del] │ │ [Edit][Del] │ │[Edit][Del]│ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
│                                                 │
│  ... (더 많은 카드들)                            │
│                                                 │
│                    [Pagination or Load More]    │
└─────────────────────────────────────────────────┘
```

> **Recent 섹션 제거**: All Connections가 이미 lastUsed로 정렬되므로 중복 불필요

### Connection Card 디자인

```
┌─────────────────────┐
│ 192.168.1.100       │  <- name (기본값: host, 사용자가 수정 가능)
│ root@192.168.1.100  │  <- username@host (서브텍스트)
│ SSH · Port 22       │  <- type · port
│ Password Auth       │  <- 인증 방식 표시
│ Last used: 5m ago   │  <- 마지막 접속 시간
│                     │
│ [Connect] [Edit] [×]│  <- 액션 버튼
└─────────────────────┘
```

**액션 버튼**:
- **Connect**: 저장된 credential로 즉시 접속
- **Edit**: 프로필 수정 (name, host, port, username 등)
- **×** (Delete): 프로필 삭제 (confirmation 표시)

## 데이터 구조 변경

### Before
```typescript
interface ConnectionProfile {
  id: string;
  name: string;
  type: ConnectionType;
  config: ConnectionConfig;
  favorite: boolean;  // ❌ 제거
  createdAt: number;
  lastUsed?: number;  // Optional
}
```

### After
```typescript
interface ConnectionProfile {
  id: string;
  name: string;  // 사용자 정의 or "username@host"
  type: ConnectionType;
  config: ConnectionConfig;
  createdAt: number;
  lastUsed: number;  // ✅ Required (항상 기록)
}
```

## 자동 저장 로직

### SSH Dialog 변경

**Before**
```
Profile Name: [         ]
☑ Save as Profile

[Connect]
```

**After**
```
Profile Name: [192.168.1.100    ]  <- 기본값: host (수정 가능)
  💡 Default is host address, you can customize it

[Connect]  <- 항상 자동 저장
```

## Command Palette 간소화

### Before
- Recent Connections (5개)
- Favorites ⭐ (별표 토글)
- All Profiles
- New Connection

### After (단순화)
```
All Connections (최근 사용 순, 검색 가능)
  [Search: type to filter...]

  Production Server (5m ago)
  Staging (1h ago)
  192.168.1.100 (2h ago)
  ...

New Connection
  Local Terminal
  SSH
  Telnet
  RDP
  SFTP
```

**변경사항**:
- ❌ Recent 섹션 제거 (All에 이미 최근 순 정렬)
- ❌ Favorites 섹션 제거 (별표 기능 완전 삭제)
- ✅ All Connections만 표시 (최근 사용 순)
- ✅ 검색으로 빠른 필터링
- ✅ 편집/삭제는 Home 화면에서만

## 구현 순서

### Phase 1: 데이터 구조 변경
- [ ] `ConnectionProfile`에서 `favorite` 필드 제거
- [ ] `lastUsed`를 optional → required 변경
- [ ] Migration 로직 (기존 데이터 호환)

### Phase 2: SSH Dialog 수정
- [x] `saveAsProfile` 체크박스 제거
- [x] Profile Name 기본값을 `host`로 설정
- [x] 자동 저장 로직 구현

### Phase 3: Store 수정
- [ ] `toggleFavorite` 제거
- [ ] `getFavoriteProfiles` 제거
- [ ] `getRecentProfiles` 제거 (Recent 섹션 삭제)
- [x] `findOrCreateProfile` 함수 제거 (중복 체크 제거)
- [x] `addProfile` 반환 타입 변경 (profile ID 반환)

### Phase 4: Home 화면 구현
- [ ] ConnectionCard 컴포넌트
- [ ] All Connections 섹션 (그리드, 최근 사용 순 정렬)
- [ ] Search 기능
- [ ] Auth Method 표시 (Password/PrivateKey/Interactive)
- [ ] Edit Dialog
- [ ] Delete confirmation

### Phase 5: Command Palette 정리
- [ ] Recent 섹션 제거
- [ ] Favorite 섹션 제거
- [ ] 별표 버튼 완전 제거
- [ ] All Connections + New Connection 구조로 변경
- [ ] 검색 기능 개선

### Phase 6: 기타
- [ ] 빈 화면 처리 (프로필 없을 때)
- [ ] 로딩 상태
- [ ] 에러 처리
- [ ] 애니메이션 (선택사항)

## 새로운 기능

### 1. Edit Profile Dialog
- Name 변경
- Host, Port, Username 변경
- 비밀번호는 보안상 표시 안함 (새로 입력 시에만 업데이트)

### 2. Delete Confirmation
```
Are you sure you want to delete "Production Server"?
This will also remove saved credentials.

[Cancel] [Delete]
```

### 3. Search Functionality
- Name, Host, Username으로 검색
- 실시간 필터링

## UI/UX 고려사항

### 1. Empty States
- 프로필 없을 때: "No connections yet. Create your first connection!"
- 검색 결과 없을 때: "No connections found matching 'xxx'"

### 2. Feedback
- 저장 성공: Toast "Connection saved"
- 삭제 성공: Toast "Connection deleted"
- 편집 성공: Toast "Connection updated"
- 연결 시작: Card에 로딩 표시

### 3. 접근성
- 키보드 내비게이션
- 검색 단축키 (Ctrl+F on Home)
- Card에 hover 효과

## 마이그레이션 전략

### 기존 데이터 호환
```typescript
// localStorage에 저장된 기존 프로필 처리
const migrateProfiles = (oldProfiles: OldConnectionProfile[]) => {
  return oldProfiles.map(profile => ({
    ...profile,
    favorite: undefined,  // 제거
    lastUsed: profile.lastUsed || profile.createdAt,  // 기본값 설정
  }));
};
```

### 버전 관리
```typescript
// zustand persist version 증가
{
  name: 'rusterm-connection-profiles',
  version: 2,  // 1 → 2로 증가
  migrate: (state, version) => {
    if (version === 1) {
      // favorite 제거, lastUsed 설정
      return migrateProfiles(state.profiles);
    }
    return state;
  }
}
```

## 예상 효과

### 1. 사용성 개선
- ✅ 클릭 한 번으로 접속 (credential 자동 복원)
- ✅ 모든 연결 자동 저장 (잊어버릴 일 없음)
- ✅ 직관적한 카드 UI (인증 방식 표시)
- ✅ 빠른 검색 및 필터링
- ✅ Home 화면에서 편집/삭제 가능

### 2. 코드 단순화
- ❌ Favorite 관련 코드 300+ 줄 제거
- ❌ Recent/Favorite/All 구분 로직 제거
- ❌ saveAsProfile 체크박스 로직 제거
- ✅ 단일 리스트 관리 (All Connections)
- ✅ 중복 체크 로직 제거로 코드 간소화

### 3. 성능
- 상태 구독 단순화
- 불필요한 re-render 감소

## 참고 사항
- 기존 Favorite 기능 사용자를 위한 안내 필요
- 마이그레이션 후 첫 실행 시 변경사항 알림 (선택사항)
- 테스트: 편집, 삭제, 검색 등
