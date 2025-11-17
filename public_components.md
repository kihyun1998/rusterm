# shadcn/ui 공통 컴포넌트 구현 Task List

## 개요
rusterm 프로젝트에서 사용할 shadcn/ui 공통 컴포넌트들을 설치하고 데모 페이지를 구성합니다.

---

## Phase 1: 필수 컴포넌트 설치 (Phase 4용)

### 1. context-menu
- **용도**: 터미널 우클릭 메뉴 (Phase 4.1)
- **설치**: `npx shadcn@latest add context-menu`
- **파일**: `src/components/ui/context-menu.tsx`
- **상태**: ⏳ 필요 (현재 구현 대기 중)

### 2. command
- **용도**: 커맨드 팔레트 (Phase 4.2)
- **설치**: `npx shadcn@latest add command`
- **파일**: `src/components/ui/command.tsx`
- **상태**: ⏳ 다음 단계

---

## Phase 2: 설정 시스템 컴포넌트 (Phase 5용)

### 3. dialog
- **용도**: 설정 다이얼로그 모달 (Phase 5.2)
- **설치**: `npx shadcn@latest add dialog`
- **파일**: `src/components/ui/dialog.tsx`

### 4. tabs
- **용도**: 설정 다이얼로그 내부 탭 (Appearance, Profiles, Keybindings)
- **설치**: `npx shadcn@latest add tabs`
- **파일**: `src/components/ui/tabs.tsx`

### 5. select
- **용도**: 테마/프로필 선택 드롭다운
- **설치**: `npx shadcn@latest add select`
- **파일**: `src/components/ui/select.tsx`

### 6. input
- **용도**: 폰트 크기, 경로 입력 필드
- **설치**: `npx shadcn@latest add input`
- **파일**: `src/components/ui/input.tsx`

### 7. label
- **용도**: 폼 라벨
- **설치**: `npx shadcn@latest add label`
- **파일**: `src/components/ui/label.tsx`

### 8. separator
- **용도**: 설정 섹션 구분선
- **설치**: `npx shadcn@latest add separator`
- **파일**: `src/components/ui/separator.tsx`

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

### 13. switch
- **용도**: 토글 스위치 (설정 온/오프)
- **설치**: `npx shadcn@latest add switch`
- **파일**: `src/components/ui/switch.tsx`

### 14. badge
- **용도**: 상태 표시 (탭 상태, 프로필 종류)
- **설치**: `npx shadcn@latest add badge`
- **파일**: `src/components/ui/badge.tsx`

### 15. card
- **용도**: 설정 그룹핑, 프리뷰 박스
- **설치**: `npx shadcn@latest add card`
- **파일**: `src/components/ui/card.tsx`

### 16. scroll-area
- **용도**: 긴 리스트 스크롤 (프로필 리스트, 커맨드 팔레트)
- **설치**: `npx shadcn@latest add scroll-area`
- **파일**: `src/components/ui/scroll-area.tsx`

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
- **옵션 A**: 개발 모드에서만 접근 가능한 숨겨진 라우트 (`/demo`)
- **옵션 B**: 타이틀바에 개발 모드 버튼 추가
- **옵션 C**: 단순히 별도 컴포넌트로 만들어서 App.tsx에서 조건부 렌더링

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
1. `context-menu` (현재 필요)
2. `command` (Phase 4.2)
3. `dialog`, `tabs`, `select`, `input`, `label` (Phase 5)

### Step 2: 데모 페이지 기본 구조 생성
1. `src/pages/ComponentDemo.tsx` 생성
2. 기본 레이아웃 및 섹션 구조 구현
3. App.tsx에서 조건부 렌더링 추가 (개발 모드 플래그)

### Step 3: 각 컴포넌트 데모 추가
- 컴포넌트 설치 후 즉시 데모 섹션 추가
- 실제 사용 예제와 유사하게 구성

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
import { isDevelopment } from './config';
import ComponentDemo from './pages/ComponentDemo';

function App() {
  // 개발 모드일 때만 데모 페이지 표시
  if (isDevelopment && window.location.pathname === '/demo') {
    return <ComponentDemo />;
  }

  return <MainLayout />;
}
```

---

## 파일 구조

```
src/
├── components/
│   ├── ui/                          # shadcn/ui 컴포넌트
│   │   ├── button.tsx               # ✅ 이미 존재
│   │   ├── context-menu.tsx         # ⏳ 추가 필요
│   │   ├── command.tsx              # ⏳ 추가 필요
│   │   ├── dialog.tsx               # ⏳ 추가 필요
│   │   ├── tabs.tsx                 # ⏳ 추가 필요
│   │   ├── select.tsx               # ⏳ 추가 필요
│   │   ├── input.tsx                # ⏳ 추가 필요
│   │   ├── label.tsx                # ⏳ 추가 필요
│   │   ├── separator.tsx            # ⏳ 추가 필요
│   │   ├── sonner.tsx               # ⏳ 추가 필요
│   │   ├── skeleton.tsx             # ⏳ 추가 필요
│   │   ├── dropdown-menu.tsx        # ⏳ 추가 필요
│   │   ├── checkbox.tsx             # ⏳ 추가 필요
│   │   ├── switch.tsx               # ⏳ 추가 필요
│   │   ├── badge.tsx                # ⏳ 추가 필요
│   │   ├── card.tsx                 # ⏳ 추가 필요
│   │   └── scroll-area.tsx          # ⏳ 추가 필요
│   └── menu/
│       └── TerminalContextMenu.tsx  # ✅ 이미 구현됨 (context-menu 필요)
├── pages/
│   └── ComponentDemo.tsx            # ⏳ 생성 필요
├── config.ts                        # ⏳ 생성 필요 (개발 모드 플래그)
└── App.tsx                          # 🔧 수정 필요 (데모 라우팅)
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
