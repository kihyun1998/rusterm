# UI 공통 컴포넌트 가이드

이 디렉토리는 **Shadcn/ui** 기반의 재사용 가능한 UI 컴포넌트들을 포함합니다.

## 기술 스택

- **Shadcn/ui**: 재사용 가능한 컴포넌트 라이브러리
- **Radix UI**: Headless UI primitives (접근성, 키보드 네비게이션 등)
- **Tailwind CSS**: 스타일링
- **CVA (Class Variance Authority)**: variant 관리
- **cn 유틸리티**: `@/lib/utils`의 Tailwind 클래스 병합 함수

## 컴포넌트 목록

### 기본 컴포넌트

#### Button (`button.tsx`)
버튼 컴포넌트로 다양한 스타일 variant를 제공합니다.

**Variants:**
- `default`: 기본 primary 버튼
- `destructive`: 삭제/위험한 액션용
- `outline`: 아웃라인 스타일
- `secondary`: 보조 버튼
- `ghost`: 투명 배경
- `link`: 링크 스타일

**Sizes:**
- `default`: 높이 9 (h-9)
- `sm`: 작은 크기 (h-8)
- `lg`: 큰 크기 (h-10)
- `icon`: 아이콘 전용 (size-9)
- `icon-sm`: 작은 아이콘 (size-8)
- `icon-lg`: 큰 아이콘 (size-10)

**Props:**
- `asChild`: Radix Slot API 사용 (다른 컴포넌트로 렌더링)

**사용 예시:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="default">클릭</Button>
<Button variant="destructive">삭제</Button>
<Button variant="outline" size="sm">작은 버튼</Button>
<Button variant="ghost" size="icon"><Icon /></Button>
```

#### Input (`input.tsx`)
텍스트 입력 필드 컴포넌트입니다.

**특징:**
- 포커스 시 ring 효과
- `aria-invalid` 상태에서 에러 스타일링
- 파일 입력 스타일링 지원
- 다크모드 지원

**사용 예시:**
```tsx
import { Input } from '@/components/ui/input';

<Input type="text" placeholder="입력하세요" />
<Input type="password" />
<Input type="file" />
```

#### Label (`label.tsx`)
폼 라벨 컴포넌트입니다 (Radix UI Label 기반).

**사용 예시:**
```tsx
import { Label } from '@/components/ui/label';

<Label htmlFor="email">이메일</Label>
<Input id="email" type="email" />
```

#### Badge (`badge.tsx`)
작은 배지/태그 컴포넌트입니다.

**Variants:**
- `default`: Primary 배지
- `secondary`: 보조 배지
- `destructive`: 위험/에러 배지
- `outline`: 아웃라인 배지

**Props:**
- `asChild`: Slot API 사용

**사용 예시:**
```tsx
import { Badge } from '@/components/ui/badge';

<Badge>New</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Draft</Badge>
```

#### Skeleton (`skeleton.tsx`)
로딩 상태를 표시하는 스켈레톤 컴포넌트입니다.

**특징:**
- `animate-pulse` 애니메이션
- 커스텀 크기/모양 가능

**사용 예시:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-12 w-12 rounded-full" />
<Skeleton className="h-4 w-[250px]" />
```

### 레이아웃 컴포넌트

#### Card (`card.tsx`)
카드 레이아웃 컴포넌트로 여러 하위 컴포넌트로 구성됩니다.

**컴포넌트:**
- `Card`: 메인 컨테이너
- `CardHeader`: 헤더 영역
- `CardTitle`: 제목
- `CardDescription`: 설명 텍스트
- `CardAction`: 우측 상단 액션 영역
- `CardContent`: 본문 영역
- `CardFooter`: 푸터 영역

**사용 예시:**
```tsx
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>제목</CardTitle>
    <CardDescription>설명</CardDescription>
  </CardHeader>
  <CardContent>내용</CardContent>
  <CardFooter>푸터</CardFooter>
</Card>
```

#### Separator (`separator.tsx`)
구분선 컴포넌트입니다 (Radix UI Separator 기반).

**Orientation:**
- `horizontal` (기본값)
- `vertical`

**사용 예시:**
```tsx
import { Separator } from '@/components/ui/separator';

<Separator />
<Separator orientation="vertical" />
```

#### Tabs (`tabs.tsx`)
탭 컴포넌트입니다 (Radix UI Tabs 기반).

**컴포넌트:**
- `Tabs`: 루트 컨테이너
- `TabsList`: 탭 목록
- `TabsTrigger`: 탭 버튼
- `TabsContent`: 탭 내용

**사용 예시:**
```tsx
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

<Tabs defaultValue="tab1">
  <TabsList>
    <TabsTrigger value="tab1">탭 1</TabsTrigger>
    <TabsTrigger value="tab2">탭 2</TabsTrigger>
  </TabsList>
  <TabsContent value="tab1">탭 1 내용</TabsContent>
  <TabsContent value="tab2">탭 2 내용</TabsContent>
</Tabs>
```

#### ScrollArea (`scroll-area.tsx`)
커스텀 스크롤바 영역입니다 (Radix UI ScrollArea 기반).

**사용 예시:**
```tsx
import { ScrollArea } from '@/components/ui/scroll-area';

<ScrollArea className="h-[200px] w-[350px]">
  {/* 스크롤 가능한 내용 */}
</ScrollArea>
```

### 폼 컴포넌트

#### Checkbox (`checkbox.tsx`)
체크박스 컴포넌트입니다 (Radix UI Checkbox 기반).

**사용 예시:**
```tsx
import { Checkbox } from '@/components/ui/checkbox';

<Checkbox id="terms" />
<Label htmlFor="terms">약관에 동의합니다</Label>
```

#### Switch (`switch.tsx`)
토글 스위치 컴포넌트입니다 (Radix UI Switch 기반).

**사용 예시:**
```tsx
import { Switch } from '@/components/ui/switch';

<Switch id="notifications" />
<Label htmlFor="notifications">알림 활성화</Label>
```

#### Select (`select.tsx`)
셀렉트 드롭다운 컴포넌트입니다 (Radix UI Select 기반).

**컴포넌트:**
- `Select`: 루트
- `SelectTrigger`: 트리거 버튼
- `SelectValue`: 선택된 값 표시
- `SelectContent`: 드롭다운 내용
- `SelectItem`: 선택 항목
- `SelectGroup`: 항목 그룹
- `SelectLabel`: 그룹 라벨
- `SelectSeparator`: 구분선

**사용 예시:**
```tsx
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

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

### 대화상자 및 오버레이

#### Dialog (`dialog.tsx`)
모달 다이얼로그 컴포넌트입니다 (Radix UI Dialog 기반).

**컴포넌트:**
- `Dialog`: 루트
- `DialogTrigger`: 트리거 버튼
- `DialogContent`: 다이얼로그 내용
- `DialogHeader`: 헤더
- `DialogTitle`: 제목
- `DialogDescription`: 설명
- `DialogFooter`: 푸터
- `DialogClose`: 닫기 버튼

**사용 예시:**
```tsx
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

<Dialog>
  <DialogTrigger asChild>
    <Button>열기</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>제목</DialogTitle>
      <DialogDescription>설명</DialogDescription>
    </DialogHeader>
    {/* 내용 */}
  </DialogContent>
</Dialog>
```

#### AlertDialog (`alert-dialog.tsx`)
확인/취소 다이얼로그 컴포넌트입니다 (Radix UI AlertDialog 기반).

**컴포넌트:**
- `AlertDialog`: 루트
- `AlertDialogTrigger`: 트리거
- `AlertDialogContent`: 내용
- `AlertDialogHeader`: 헤더
- `AlertDialogTitle`: 제목
- `AlertDialogDescription`: 설명
- `AlertDialogFooter`: 푸터
- `AlertDialogAction`: 확인 버튼
- `AlertDialogCancel`: 취소 버튼

**사용 예시:**
```tsx
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

<AlertDialog>
  <AlertDialogTrigger asChild>
    <Button variant="destructive">삭제</Button>
  </AlertDialogTrigger>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
      <AlertDialogDescription>
        이 작업은 되돌릴 수 없습니다.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>취소</AlertDialogCancel>
      <AlertDialogAction>삭제</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 메뉴 컴포넌트

#### DropdownMenu (`dropdown-menu.tsx`)
드롭다운 메뉴 컴포넌트입니다 (Radix UI DropdownMenu 기반).

**컴포넌트:**
- `DropdownMenu`: 루트
- `DropdownMenuTrigger`: 트리거
- `DropdownMenuContent`: 메뉴 내용
- `DropdownMenuItem`: 메뉴 항목
- `DropdownMenuCheckboxItem`: 체크박스 항목
- `DropdownMenuRadioItem`: 라디오 항목
- `DropdownMenuLabel`: 라벨
- `DropdownMenuSeparator`: 구분선
- `DropdownMenuShortcut`: 단축키 표시
- `DropdownMenuGroup`: 항목 그룹
- `DropdownMenuSub`: 서브메뉴

**사용 예시:**
```tsx
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button>메뉴</Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>항목 1</DropdownMenuItem>
    <DropdownMenuItem>항목 2</DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem>항목 3</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### ContextMenu (`context-menu.tsx`)
우클릭 컨텍스트 메뉴 컴포넌트입니다 (Radix UI ContextMenu 기반).

**컴포넌트 구조는 DropdownMenu와 유사하며, 우클릭으로 트리거됩니다.**

**사용 예시:**
```tsx
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from '@/components/ui/context-menu';

<ContextMenu>
  <ContextMenuTrigger>
    <div>우클릭하세요</div>
  </ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem>복사</ContextMenuItem>
    <ContextMenuItem>붙여넣기</ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

#### Command (`command.tsx`)
커맨드 팔레트/검색 컴포넌트입니다 (cmdk 기반).

**컴포넌트:**
- `Command`: 루트
- `CommandInput`: 검색 입력
- `CommandList`: 결과 목록
- `CommandEmpty`: 결과 없음 메시지
- `CommandGroup`: 그룹
- `CommandItem`: 항목
- `CommandSeparator`: 구분선
- `CommandShortcut`: 단축키 표시
- `CommandDialog`: 다이얼로그 형태

**사용 예시:**
```tsx
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';

<Command>
  <CommandInput placeholder="검색..." />
  <CommandList>
    <CommandEmpty>결과 없음</CommandEmpty>
    <CommandGroup heading="제안">
      <CommandItem>항목 1</CommandItem>
      <CommandItem>항목 2</CommandItem>
    </CommandGroup>
  </CommandList>
</Command>
```

### 알림 컴포넌트

#### Sonner (`sonner.tsx`)
토스트 알림 컴포넌트입니다 (sonner 기반).

**사용 방법:**
```tsx
// App.tsx 또는 root에 추가
import { Toaster } from '@/components/ui/sonner';

<Toaster />

// 다른 컴포넌트에서 사용
import { toast } from 'sonner';

toast.success('성공했습니다!');
toast.error('에러가 발생했습니다.');
toast('일반 메시지');
```

## 공통 패턴

### 1. CVA (Class Variance Authority) 패턴

variant가 있는 컴포넌트는 CVA를 사용합니다:

```tsx
const componentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-classes",
        secondary: "secondary-classes",
      },
      size: {
        default: "default-size",
        sm: "small-size",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

### 2. Radix Slot API (`asChild`)

많은 컴포넌트가 `asChild` prop을 지원합니다:

```tsx
// 일반 사용
<Button>클릭</Button>

// asChild로 Link 컴포넌트로 렌더링
<Button asChild>
  <a href="/link">링크</a>
</Button>
```

### 3. data-slot 속성

모든 컴포넌트는 `data-slot` 속성을 가지고 있어 CSS 선택자로 사용 가능합니다:

```tsx
<Button data-slot="button" />
// CSS: [data-slot="button"] { ... }
```

### 4. 다크모드 스타일링

Tailwind의 `dark:` variant를 사용합니다:

```tsx
className="bg-white dark:bg-gray-900"
```

### 5. 접근성 (Accessibility)

- `aria-invalid` 상태 지원
- 포커스 관리 (`focus-visible:`)
- 키보드 네비게이션 (Radix UI 기본 제공)

## 새 컴포넌트 추가 방법

### Shadcn/ui CLI 사용 (권장)

```bash
pnpm dlx shadcn@latest add <component-name>
```

예시:
```bash
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog
```

### 수동 추가

1. Radix UI 또는 다른 headless UI 라이브러리 선택
2. CVA를 사용하여 variant 정의
3. `cn` 유틸리티로 className 병합
4. `data-slot` 속성 추가
5. TypeScript 타입 정의
6. 다크모드 스타일 추가

## 스타일 커스터마이징

### Tailwind CSS 설정

글로벌 스타일은 `src/globals.css`에서 CSS 변수로 정의됩니다:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    /* ... */
  }

  .dark {
    --background: 0 0% 3.9%;
    --foreground: 0 0% 98%;
    /* ... */
  }
}
```

### 컴포넌트 스타일 오버라이드

```tsx
// className prop으로 추가 스타일 적용 (cn 유틸리티가 병합)
<Button className="bg-blue-500 hover:bg-blue-600">
  커스텀 버튼
</Button>
```

## 유틸리티 함수

### cn (Class Name merger)

`@/lib/utils`의 `cn` 함수는 Tailwind 클래스를 병합합니다:

```tsx
import { cn } from '@/lib/utils';

cn("px-2 py-1", "px-3") // "py-1 px-3" (나중 값이 우선)
cn("px-2", someCondition && "bg-blue-500") // 조건부 클래스
```

## 주의사항

1. **절대 경로 import 사용**: `@/components/ui/...` 형식 사용
2. **타입 안정성**: 모든 컴포넌트는 완전한 TypeScript 타입 지원
3. **접근성 우선**: Radix UI 기반으로 WCAG 접근성 지침 준수
4. **커스터마이징**: 직접 컴포넌트 파일 수정 가능 (복사본이므로)
5. **일관성 유지**: 기존 패턴과 스타일 가이드 따르기

## 참고 자료

- [Shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [CVA Documentation](https://cva.style/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)

---

**작성일**: 2025-11-17
