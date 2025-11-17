# shadcn/ui 공통 컴포넌트 구현 Task List

## 개요
rusterm 프로젝트에서 사용할 shadcn/ui 공통 컴포넌트들을 설치하고 데모 페이지를 구성합니다.

### Shadcn MCP 활용
**이 작업은 Claude Code의 Shadcn MCP를 활용하여 구현합니다.**

MCP 도구 사용 방법:
- `mcp__shadcn__get_project_registries`: 프로젝트 레지스트리 확인
- `mcp__shadcn__search_items_in_registries`: 컴포넌트 검색
- `mcp__shadcn__view_items_in_registries`: 컴포넌트 상세 정보 확인
- `mcp__shadcn__get_add_command_for_items`: 설치 명령어 생성
- `mcp__shadcn__get_item_examples_from_registries`: 사용 예제 확인

**중요**: 각 컴포넌트 설치 시 MCP 도구를 사용하여 공식 예제와 베스트 프랙티스를 확인하고 구현합니다.

---

## Phase 1: 필수 컴포넌트 설치 (Phase 4용)

### 1. context-menu
- **용도**: 터미널 우클릭 메뉴 (Phase 4.1)
- **설치**: `npx shadcn@latest add context-menu` 또는 MCP: `mcp__shadcn__get_add_command_for_items`
- **파일**:
  - `src/components/ui/context-menu.tsx` ✅
  - `src/components/menu/TerminalContextMenu.tsx` ✅
- **상태**: ✅ **완료** (구현 완료 및 데모 페이지 추가됨)
- **기능**:
  - 복사 (Ctrl+Shift+C)
  - 붙여넣기 (Ctrl+Shift+V)
  - 모두 선택 (Ctrl+Shift+A)
  - 화면 지우기 (Ctrl+L)
- **데모**: 개발 모드에서 타이틀바 "Demo" 버튼 → Context Menu 섹션

### 2. command
- **용도**: 커맨드 팔레트 (Phase 4.2)
- **설치**: `npx shadcn@latest add command`
- **파일**:
  - `src/components/ui/command.tsx` ✅
  - `src/components/command/CommandPalette.tsx` ✅
- **상태**: ✅ **완료** (구현 완료 및 데모 페이지 추가됨)
- **기능**:
  - 전역 커맨드 팔레트 (Ctrl+Shift+P)
  - 탭 관리 (New Tab, Close Tab, Next/Previous Tab)
  - 터미널 작업 (Clear, Copy, Paste, Select All)
  - 설정 (Settings, Theme Toggle, Font Size)
  - 개발자 도구 (DevTools, Demo, Reload)
- **데모**: 개발 모드에서 타이틀바 "Demo" 버튼 → Command 섹션

---

## Phase 2: 설정 시스템 컴포넌트 (Phase 5용)

### 3. dialog
- **용도**: 설정 다이얼로그 모달 (Phase 5.2)
- **설치**: `npx shadcn@latest add dialog`
- **파일**:
  - `src/components/ui/dialog.tsx` ✅
  - `src/components/ui/alert-dialog.tsx` ✅
  - `src/components/settings/SettingsDialog.tsx` ✅
  - `src/components/settings/AppearanceTab.tsx` ✅
  - `src/components/settings/AdvancedTab.tsx` ✅
  - `src/components/settings/AboutTab.tsx` ✅
- **상태**: ✅ **완료** (설정 다이얼로그 구현 완료)
- **기능**:
  - SettingsDialog: Tabs로 설정 섹션 분리
  - AppearanceTab: Font, Cursor, Theme 설정
  - AdvancedTab: Shell, Scrollback 설정
  - AboutTab: 버전 정보, AlertDialog로 설정 리셋
- **데모**: 개발 모드에서 타이틀바 "Demo" 버튼 → Dialog 섹션

### 4. tabs
- **용도**: 설정 다이얼로그 내부 탭 (Appearance, Advanced, About)
- **설치**: `npx shadcn@latest add tabs`
- **파일**: `src/components/ui/tabs.tsx` ✅
- **상태**: ✅ **완료** (SettingsDialog에서 사용 중)

### 5. select
- **용도**: Cursor Style 선택 드롭다운
- **설치**: `npx shadcn@latest add select`
- **파일**: `src/components/ui/select.tsx` ✅
- **상태**: ✅ **완료** (AppearanceTab에서 사용 중)

### 6. input
- **용도**: Font Size, Font Family, Shell 등 입력 필드
- **설치**: `npx shadcn@latest add input`
- **파일**: `src/components/ui/input.tsx` ✅
- **상태**: ✅ **완료** (설정 폼 전반에 사용 중)

### 7. label
- **용도**: 폼 라벨
- **설치**: `npx shadcn@latest add label`
- **파일**: `src/components/ui/label.tsx` ✅
- **상태**: ✅ **완료** (설정 폼 전반에 사용 중)

### 8. separator
- **용도**: 설정 섹션 구분선
- **설치**: `npx shadcn@latest add separator`
- **파일**: `src/components/ui/separator.tsx` ✅
- **상태**: ✅ **완료** (AppearanceTab에서 사용 중)

---

## Phase 3: 사용자 경험 컴포넌트 (Phase 7용)

### 9. toast (또는 sonner)
- **용도**: 알림 메시지
- **설치**: `npx shadcn@latest add sonner` (추천) 또는 `npx shadcn@latest add toast`
- **파일**: `src/components/ui/sonner.tsx`
- **참고**: sonner가 더 현대적이고 사용하기 쉬움

### 10. skeleton
- **용도**: 로딩 상태 표시
- **설치**: `npx shadcn@latest add skeleton`
- **파일**: `src/components/ui/skeleton.tsx`

---

## Phase 4: 추가 유틸리티 컴포넌트

### 11. dropdown-menu
- **용도**: 일반 드롭다운 메뉴 (타이틀바, 설정 등)
- **설치**: `npx shadcn@latest add dropdown-menu`
- **파일**: `src/components/ui/dropdown-menu.tsx`

### 12. checkbox
- **용도**: 옵션 체크박스 (설정)
- **설치**: `npx shadcn@latest add checkbox`
- **파일**: `src/components/ui/checkbox.tsx`
- **상태**: ⏳ 설치 필요

### 13. switch
- **용도**: 토글 스위치 (Cursor Blink 등)
- **설치**: `npx shadcn@latest add switch`
- **파일**: `src/components/ui/switch.tsx` ✅
- **상태**: ✅ **완료** (AppearanceTab에서 사용 중)

### 14. badge
- **용도**: 상태 표시 (탭 상태, 프로필 종류)
- **설치**: `npx shadcn@latest add badge`
- **파일**: `src/components/ui/badge.tsx`
- **상태**: ⏳ 설치 필요

### 15. card
- **용도**: 설정 그룹핑, 프리뷰 박스
- **설치**: `npx shadcn@latest add card`
- **파일**: `src/components/ui/card.tsx` ✅
- **상태**: ✅ **완료** (설정 탭들에서 사용 중)

### 16. scroll-area
- **용도**: 긴 리스트 스크롤 (설정 다이얼로그)
- **설치**: `npx shadcn@latest add scroll-area`
- **파일**: `src/components/ui/scroll-area.tsx` ✅
- **상태**: ✅ **완료** (설정 탭들에서 사용 중)

---

## 데모 페이지 구현

### Task 1: 데모 페이지 라우팅 설정
- **파일 생성**: `src/pages/ComponentDemo.tsx`
- **목적**: 모든 설치된 컴포넌트를 한 페이지에서 확인
- **내용**: 각 컴포넌트별 섹션으로 구분된 데모

### Task 2: 데모 섹션 구조
각 컴포넌트별로 다음 구조로 표시:
```tsx
<section>
  <h2>컴포넌트 이름</h2>
  <p>설명</p>
  <div className="demo-container">
    {/* 실제 컴포넌트 예제 */}
  </div>
</section>
```

### Task 3: 데모 페이지 접근 방법
**선택된 방식: 타이틀바에 개발 모드 Demo 버튼 추가**

구현 방법:
1. 개발 모드(`import.meta.env.DEV`)일 때만 타이틀바에 "Demo" 버튼 표시
2. Demo 버튼 클릭 시 App.tsx의 상태를 토글하여 데모 페이지 표시
3. 데모 페이지에서 "Back" 버튼으로 메인 화면 복귀

장점:
- 별도의 라우팅 라이브러리 불필요
- 간단한 상태 관리만으로 구현 가능
- 개발자가 쉽게 접근 가능

### Task 4: 컴포넌트별 데모 내용

#### 1. context-menu 데모
```tsx
<ContextMenu>
  <ContextMenuTrigger>
    <div className="border p-8">우클릭하세요</div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>복사</ContextMenuItem>
    <ContextMenuItem>붙여넣기</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem>삭제</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

#### 2. command 데모
```tsx
<Command>
  <CommandInput placeholder="명령어 검색..." />
  <CommandList>
    <CommandGroup heading="제안">
      <CommandItem>새 탭</CommandItem>
      <CommandItem>설정 열기</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

#### 3. dialog 데모
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>다이얼로그 열기</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명</DialogDescription>
    </DialogHeader>
    <div>내용</div>
  </DialogContent>
</Dialog>
```

#### 4. tabs 데모
```tsx
<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">탭 1</TabsTrigger>
    <TabsTrigger value="tab2">탭 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">탭 1 내용</TabsContent>
  <TabsContent value="tab2">탭 2 내용</TabsContent>
</Tabs>
```

#### 5. select 데모
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="선택하세요" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">옵션 1</SelectItem>
    <SelectItem value="option2">옵션 2</SelectItem>
  </SelectContent>
</Select>
```

#### 6. input + label 데모
```tsx
<div>
  <Label htmlFor="email">이메일</Label>
  <Input id="email" type="email" placeholder="example@example.com" />
</div>
```

#### 7. separator 데모
```tsx
<div>
  <div>섹션 1</div>
  <Separator className="my-4" />
  <div>섹션 2</div>
</div>
```

#### 8. sonner 데모
```tsx
<Button onClick={() => toast.success("성공 메시지")}>
  토스트 표시
</Button>
```

#### 9. skeleton 데모
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-full" />
  <Skeleton className="h-4 w-3/4" />
</div>
```

#### 10. dropdown-menu 데모
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>메뉴</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>항목 1</DropdownMenuItem>
    <DropdownMenuItem>항목 2</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 11. checkbox 데모
```tsx
<div className="flex items-center space-x-2">
  <Checkbox id="terms" />
  <label htmlFor="terms">약관에 동의합니다</label>
</div>
```

#### 12. switch 데모
```tsx
<div className="flex items-center space-x-2">
  <Switch id="airplane-mode" />
  <Label htmlFor="airplane-mode">비행기 모드</Label>
</div>
```

#### 13. badge 데모
```tsx
<div className="flex gap-2">
  <Badge>기본</Badge>
  <Badge variant="secondary">보조</Badge>
  <Badge variant="destructive">삭제</Badge>
  <Badge variant="outline">외곽선</Badge>
</div>
```

#### 14. card 데모
```tsx
<Card>
  <CardHeader>
    <CardTitle>카드 제목</CardTitle>
    <CardDescription>카드 설명</CardDescription>
  </CardHeader>
  <CardContent>
    <p>카드 내용</p>
  </CardContent>
  <CardFooter>
    <Button>액션</Button>
  </CardFooter>
</Card>
```

#### 15. scroll-area 데모
```tsx
<ScrollArea className="h-72 w-48 rounded border">
  <div className="p-4">
    {Array.from({ length: 50 }).map((_, i) => (
      <div key={i}>항목 {i + 1}</div>
    ))}
  </div>
</ScrollArea>
```

---

## 구현 순서

### Step 1: 우선순위 높은 컴포넌트 설치
**MCP 도구를 사용하여 설치:**
1. `mcp__shadcn__get_add_command_for_items`로 설치 명령어 확인
2. `mcp__shadcn__get_item_examples_from_registries`로 예제 확인
3. Bash 도구로 컴포넌트 설치

설치 순서:
1. `context-menu` (현재 필요)
2. `command` (Phase 4.2)
3. `dialog`, `tabs`, `select`, `input`, `label` (Phase 5)

### Step 2: 데모 페이지 기본 구조 생성
1. `src/config.ts` 생성 (개발 모드 플래그)
2. `src/pages/ComponentDemo.tsx` 생성
3. 기본 레이아웃 및 섹션 구조 구현
4. `TitleBar` 컴포넌트에 Demo 버튼 추가
5. `MainLayout`에 Demo 버튼 props 전달
6. `App.tsx`에서 상태 관리 및 조건부 렌더링 추가

### Step 3: 각 컴포넌트 데모 추가
- **MCP 도구로 예제 확인**: `mcp__shadcn__get_item_examples_from_registries`
- 컴포넌트 설치 후 즉시 데모 섹션 추가
- 공식 예제를 참고하여 실제 사용 예제와 유사하게 구성

### Step 4: 추가 컴포넌트 설치
- `sonner`, `skeleton`, `dropdown-menu` 등
- 필요에 따라 순차적으로 추가

---

## 개발 모드 플래그 설정

### 환경 변수 사용
```typescript
// src/config.ts
export const isDevelopment = import.meta.env.DEV;
```

### App.tsx 수정
```typescript
import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import ComponentDemo from './pages/ComponentDemo';
import { isDevelopment } from './config';

function App() {
  const [showDemo, setShowDemo] = useState(false);

  // 개발 모드에서만 데모 페이지 표시 가능
  if (isDevelopment && showDemo) {
    return <ComponentDemo onBack={() => setShowDemo(false)} />;
  }

  return <MainLayout showDemoButton={isDevelopment} onDemoClick={() => setShowDemo(true)} />;
}
```

### TitleBar 컴포넌트 수정
```typescript
// src/components/layout/TitleBar.tsx
interface TitleBarProps {
  showDemoButton?: boolean;
  onDemoClick?: () => void;
}

export function TitleBar({ showDemoButton, onDemoClick }: TitleBarProps) {
  return (
    <div className="titlebar">
      {/* 기존 타이틀바 내용 */}

      {/* 개발 모드 전용 Demo 버튼 */}
      {showDemoButton && (
        <Button
          variant="outline"
          size="sm"
          onClick={onDemoClick}
          className="ml-2"
        >
          Demo
        </Button>
      )}
    </div>
  );
}
```

### ComponentDemo 페이지
```typescript
// src/pages/ComponentDemo.tsx
interface ComponentDemoProps {
  onBack: () => void;
}

export default function ComponentDemo({ onBack }: ComponentDemoProps) {
  return (
    <div className="h-screen overflow-auto p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Component Demo</h1>
          <Button onClick={onBack}>Back to Main</Button>
        </div>

        {/* 데모 섹션들 */}
      </div>
    </div>
  );
}
```

---

## 파일 구조

```
src/
├── components/
│   ├── ui/                          # shadcn/ui 컴포넌트
│   │   ├── button.tsx               # ✅ 이미 존재
│   │   ├── context-menu.tsx         # ✅ 완료
│   │   ├── command.tsx              # ✅ 완료
│   │   ├── dialog.tsx               # ✅ 완료
│   │   ├── alert-dialog.tsx         # ✅ 완료
│   │   ├── tabs.tsx                 # ✅ 완료
│   │   ├── select.tsx               # ✅ 완료
│   │   ├── input.tsx                # ✅ 완료
│   │   ├── label.tsx                # ✅ 완료
│   │   ├── separator.tsx            # ✅ 완료
│   │   ├── switch.tsx               # ✅ 완료
│   │   ├── card.tsx                 # ✅ 완료
│   │   ├── scroll-area.tsx          # ✅ 완료
│   │   ├── sonner.tsx               # ⏳ 추가 필요
│   │   ├── skeleton.tsx             # ⏳ 추가 필요
│   │   ├── dropdown-menu.tsx        # ⏳ 추가 필요
│   │   ├── checkbox.tsx             # ⏳ 추가 필요
│   │   └── badge.tsx                # ⏳ 추가 필요
│   ├── menu/
│   │   └── TerminalContextMenu.tsx  # ✅ 완료 (context-menu 사용 중)
│   ├── command/
│   │   └── CommandPalette.tsx       # ✅ 완료 (전역 커맨드 팔레트)
│   └── settings/
│       ├── SettingsDialog.tsx       # ✅ 완료 (메인 설정 다이얼로그)
│       ├── AppearanceTab.tsx        # ✅ 완료 (Font, Cursor, Theme)
│       ├── AdvancedTab.tsx          # ✅ 완료 (Shell, Scrollback)
│       └── AboutTab.tsx             # ✅ 완료 (버전 정보, Reset)
├── pages/
│   └── ComponentDemo.tsx            # ✅ 완료
├── config.ts                        # ✅ 완료 (개발 모드 플래그)
└── App.tsx                          # ✅ 완료 (데모 상태 관리)
```

---

## 테스트 체크리스트

각 컴포넌트 설치 후 확인:
- [ ] 컴포넌트가 `/demo` 페이지에 표시됨
- [ ] 기본 동작이 정상적으로 작동함
- [ ] 스타일이 올바르게 적용됨
- [ ] 타입스크립트 에러가 없음
- [ ] 실제 사용 예제와 유사하게 구성됨

---

## 참고사항

- **Over Engineering 금지**: 데모 페이지는 단순하게 구성
- **실용성 우선**: 실제 프로젝트에서 사용할 예제 위주로 작성
- **점진적 추가**: 필요할 때마다 컴포넌트 추가 (한 번에 전부 설치 X)
- **문서화**: 각 컴포넌트의 주요 props와 사용법을 간단히 주석으로 작성
