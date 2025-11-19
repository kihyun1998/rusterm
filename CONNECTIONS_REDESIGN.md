# Connection Profile Management Redesign

## 목표
Connection Profile 관리를 단순화하고 사용자 친화적으로 개선

## 현재 문제점
1. Command Palette에서만 프로필 확인 가능
2. 프로필 편집/삭제 불가
3. "Save as Profile" 체크박스가 복잡함
4. Favorite 기능이 있지만 사용성이 애매함
5. 연결 정보가 한눈에 안 보임

## 핵심 변경사항

### 1. 자동 저장 (Auto-Save)
- **모든 SSH 연결을 자동으로 저장**
- `saveAsProfile` 체크박스 제거
- 프로필 이름 필드만 남김 (선택사항)
  - 입력 시: 사용자 지정 이름 사용
  - 비입력 시: `username@host` 자동 생성

### 2. Favorite 기능 제거
- 별표(★) 기능 완전 제거
- Recent/Favorite/Saved 구분 없이 **"All Connections"** 하나로 통합
- 최근 사용 순서로 자동 정렬

### 3. Home 화면 개편
Connection 관리의 중심지로 변경

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
│  Recent Connections (최근 5개)                   │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ root@prod   │ │ Production  │ │ admin@dev │ │
│  │ 192.168.1.1 │ │ root@stage  │ │ 10.0.0.1  │ │
│  │ SSH · 22    │ │ SSH · 22    │ │ SSH · 22  │ │
│  │ 5m ago      │ │ 1h ago      │ │ 2h ago    │ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  All Connections                    [Search 🔍] │
│  ┌─────────────┐ ┌─────────────┐ ┌───────────┐ │
│  │ Production  │ │ Staging     │ │ DB Server │ │
│  │ root@prod   │ │ deploy@stg  │ │ dba@db    │ │
│  │ SSH · 22    │ │ SSH · 22    │ │ SSH · 3306│ │
│  │ Last: 5m    │ │ Last: 1d    │ │ Last: 3d  │ │
│  │ [Edit][Del] │ │ [Edit][Del] │ │[Edit][Del]│ │
│  └─────────────┘ └─────────────┘ └───────────┘ │
│                                                 │
│  ... (더 많은 카드들)                            │
│                                                 │
│                    [Pagination or Load More]    │
└─────────────────────────────────────────────────┘
```

### Connection Card 디자인

```
┌─────────────────────┐
│ Production Server   │  <- name (사용자 정의 or username@host)
│ root@192.168.1.100  │  <- username@host (서브텍스트)
│ SSH · Port 22       │  <- type · port
│ Last used: 5m ago   │  <- 마지막 접속 시간
│                     │
│ [Connect] [Edit] [×]│  <- 액션 버튼
└─────────────────────┘
```

- **Recent Section**: 클릭 시 바로 접속, Edit/Delete 없음 (간소화)
- **All Connections**: 전체 기능 제공 (Connect, Edit, Delete)

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
Profile Name (Optional): [         ]
  💡 Leave empty to auto-generate from username@host

[Connect]  <- 항상 자동 저장
```

### 중복 연결 처리

```typescript
// 같은 host+username+port 조합 확인
const existing = profiles.find(p =>
  p.type === 'ssh' &&
  p.config.host === config.host &&
  p.config.username === config.username &&
  p.config.port === config.port
);

if (existing) {
  // 기존 프로필 업데이트
  updateProfile(existing.id, {
    name: formState.profileName || existing.name,  // 이름 변경 가능
    lastUsed: Date.now(),
    config  // 비밀번호 등 업데이트
  });
  profileId = existing.id;
} else {
  // 새 프로필 생성
  const newProfile = {
    id: crypto.randomUUID(),
    name: formState.profileName || `${config.username}@${config.host}`,
    type: 'ssh',
    config,
    createdAt: Date.now(),
    lastUsed: Date.now(),
  };
  await addProfile(newProfile);
  profileId = newProfile.id;
}
```

## Command Palette 간소화

### Before
- Recent Connections
- Favorites ⭐ (별표 토글)
- All Profiles
- New Connection

### After
```
Recent Connections (5개)
  Production (5m ago)
  Staging (1h ago)
  admin@dev (2h ago)
  ...

All Connections (검색 가능)
  [Search: "prod"]
  Production Server
  Production DB
  ...

New Connection
  Local Terminal
  SSH
  Telnet
  RDP
  SFTP
```

- 별표 버튼 완전 제거
- 검색으로 빠른 접근
- 편집/삭제는 Home 화면에서만

## 구현 순서

### Phase 1: 데이터 구조 변경
- [ ] `ConnectionProfile`에서 `favorite` 필드 제거
- [ ] `lastUsed`를 optional → required 변경
- [ ] Migration 로직 (기존 데이터 호환)

### Phase 2: SSH Dialog 수정
- [ ] `saveAsProfile` 체크박스 제거
- [ ] Profile Name을 optional로 변경
- [ ] 자동 저장 로직 구현
- [ ] 중복 체크 & 업데이트 로직

### Phase 3: Store 수정
- [ ] `toggleFavorite` 제거
- [ ] `getFavoriteProfiles` 제거
- [ ] `addProfile` 로직 수정 (중복 체크)
- [ ] `findOrUpdateProfile` 함수 추가

### Phase 4: Home 화면 구현
- [ ] ConnectionCard 컴포넌트
- [ ] Recent Connections 섹션 (5개)
- [ ] All Connections 섹션 (그리드)
- [ ] Search 기능
- [ ] Edit Dialog
- [ ] Delete confirmation

### Phase 5: Command Palette 정리
- [ ] Favorite 관련 코드 제거
- [ ] UI 간소화
- [ ] Recent + All + New 구조로 변경

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
- ✅ 클릭 한 번으로 접속 (중복 체크 불필요)
- ✅ 모든 연결 자동 저장 (잊어버릴 일 없음)
- ✅ 직관적인 카드 UI
- ✅ 빠른 검색

### 2. 코드 단순화
- ❌ Favorite 관련 코드 300+ 줄 제거
- ❌ Recent/Favorite/Saved 구분 로직 제거
- ✅ 단일 리스트 관리

### 3. 성능
- 상태 구독 단순화
- 불필요한 re-render 감소

## 참고 사항
- 기존 Favorite 기능 사용자를 위한 안내 필요
- 마이그레이션 후 첫 실행 시 변경사항 알림 (선택사항)
- 테스트: 중복 연결, 편집, 삭제, 검색 등
