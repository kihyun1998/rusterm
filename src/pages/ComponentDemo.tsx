import { CodeIcon, Cross2Icon, GearIcon, PlusIcon } from '@radix-ui/react-icons';
import { BadgeCheckIcon, GripVerticalIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ComponentDemoProps {
  onBack: () => void;
}

/**
 * Component Demo Page
 * Displays all installed shadcn/ui components with examples
 * Only accessible in development mode
 */
export default function ComponentDemo({ onBack }: ComponentDemoProps) {
  const [bookmarksChecked, setBookmarksChecked] = useState(true);
  const [urlsChecked, setUrlsChecked] = useState(false);
  const [person, setPerson] = useState('pedro');
  const [commandDialogOpen, setCommandDialogOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectValue, setSelectValue] = useState('apple');
  const [switchChecked, setSwitchChecked] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState([
    { id: '1', text: 'Item 1 - Terminal Tab' },
    { id: '2', text: 'Item 2 - Settings Panel' },
    { id: '3', text: 'Item 3 - Profile Card' },
    { id: '4', text: 'Item 4 - Connection List' },
    { id: '5', text: 'Item 5 - Theme Preset' },
  ]);

  // Ctrl+K to open command dialog demo
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandDialogOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Drag and drop sensors - optimized for desktop apps
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success('Item reordered', {
        description: `Moved to position ${items.findIndex((item) => item.id === over.id) + 1}`,
      });
    }
  };

  return (
    <>
      <div className="h-screen overflow-auto bg-background">
        <div className="max-w-6xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Component Demo</h1>
              <p className="text-muted-foreground">
                shadcn/ui 컴포넌트 데모 페이지 (개발 모드 전용)
              </p>
            </div>
            <Button onClick={onBack} variant="outline">
              Back to Main
            </Button>
          </div>

          {/* Demos */}
          <div className="space-y-12">
            {/* Context Menu Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Context Menu</h2>
                <p className="text-sm text-muted-foreground">
                  우클릭 메뉴 컴포넌트. 터미널에서 사용 중.
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <ContextMenu>
                    <ContextMenuTrigger className="flex h-[150px] w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm hover:bg-muted/50 transition-colors">
                      여기서 우클릭하세요
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem>
                        복사
                        <ContextMenuShortcut>Ctrl+C</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuItem>
                        붙여넣기
                        <ContextMenuShortcut>Ctrl+V</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem>모두 선택</ContextMenuItem>
                      <ContextMenuItem variant="destructive">삭제</ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>

                {/* Advanced Example with Sub-menu */}
                <div>
                  <h3 className="text-lg font-medium mb-3">
                    고급 예제 (Sub-menu, Checkbox, Radio)
                  </h3>
                  <ContextMenu>
                    <ContextMenuTrigger className="flex h-[200px] w-full max-w-md items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 text-sm hover:bg-muted/50 transition-colors">
                      고급 메뉴 - 우클릭하세요
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-56">
                      <ContextMenuItem inset>
                        뒤로
                        <ContextMenuShortcut>⌘[</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuItem inset disabled>
                        앞으로
                        <ContextMenuShortcut>⌘]</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuItem inset>
                        새로고침
                        <ContextMenuShortcut>⌘R</ContextMenuShortcut>
                      </ContextMenuItem>

                      <ContextMenuSeparator />

                      {/* Sub-menu */}
                      <ContextMenuSub>
                        <ContextMenuSubTrigger inset>더 보기</ContextMenuSubTrigger>
                        <ContextMenuSubContent className="w-48">
                          <ContextMenuItem>페이지 저장...</ContextMenuItem>
                          <ContextMenuItem>단축키 만들기...</ContextMenuItem>
                          <ContextMenuItem>창 이름 지정...</ContextMenuItem>
                          <ContextMenuSeparator />
                          <ContextMenuItem>개발자 도구</ContextMenuItem>
                        </ContextMenuSubContent>
                      </ContextMenuSub>

                      <ContextMenuSeparator />

                      {/* Checkbox Items */}
                      <ContextMenuCheckboxItem
                        checked={bookmarksChecked}
                        onCheckedChange={setBookmarksChecked}
                      >
                        북마크 표시
                      </ContextMenuCheckboxItem>
                      <ContextMenuCheckboxItem
                        checked={urlsChecked}
                        onCheckedChange={setUrlsChecked}
                      >
                        전체 URL 표시
                      </ContextMenuCheckboxItem>

                      <ContextMenuSeparator />

                      {/* Radio Group */}
                      <ContextMenuLabel inset>담당자</ContextMenuLabel>
                      <ContextMenuRadioGroup value={person} onValueChange={setPerson}>
                        <ContextMenuRadioItem value="pedro">Pedro Duarte</ContextMenuRadioItem>
                        <ContextMenuRadioItem value="colm">Colm Tuite</ContextMenuRadioItem>
                      </ContextMenuRadioGroup>
                    </ContextMenuContent>
                  </ContextMenu>
                </div>

                {/* Terminal Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">터미널에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    이 컴포넌트는{' '}
                    <code className="bg-background px-1.5 py-0.5 rounded">TerminalContextMenu</code>
                    에서 실제로 사용되고 있습니다.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>복사 (Ctrl+Shift+C)</li>
                    <li>붙여넣기 (Ctrl+Shift+V)</li>
                    <li>모두 선택 (Ctrl+Shift+A)</li>
                    <li>화면 지우기 (Ctrl+L)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Command Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Command</h2>
                <p className="text-sm text-muted-foreground">
                  커맨드 팔레트 컴포넌트. 검색 가능한 명령어 리스트.
                </p>
              </div>

              <div className="space-y-6">
                {/* Inline Command Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제 (인라인)</h3>
                  <Command className="rounded-lg border shadow-md max-w-md">
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        <CommandItem>
                          <PlusIcon className="mr-2 h-4 w-4" />
                          <span>New Tab</span>
                        </CommandItem>
                        <CommandItem>
                          <Cross2Icon className="mr-2 h-4 w-4" />
                          <span>Close Tab</span>
                        </CommandItem>
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup heading="Settings">
                        <CommandItem>
                          <GearIcon className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                          <CommandShortcut>Ctrl+,</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <CodeIcon className="mr-2 h-4 w-4" />
                          <span>Developer Tools</span>
                          <CommandShortcut>F12</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </div>

                {/* CommandDialog Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">다이얼로그 형태 (모달)</h3>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Press{' '}
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘</span>K
                      </kbd>{' '}
                      or click the button below
                    </p>
                    <Button onClick={() => setCommandDialogOpen(true)} variant="outline">
                      Open Command Dialog (Demo)
                    </Button>
                  </div>

                  <CommandDialog open={commandDialogOpen} onOpenChange={setCommandDialogOpen}>
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        <CommandItem>
                          <PlusIcon className="mr-2 h-4 w-4" />
                          <span>New Tab</span>
                          <CommandShortcut>Ctrl+Shift+T</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <Cross2Icon className="mr-2 h-4 w-4" />
                          <span>Close Tab</span>
                          <CommandShortcut>Ctrl+Shift+W</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                      <CommandSeparator />
                      <CommandGroup heading="Settings">
                        <CommandItem>
                          <GearIcon className="mr-2 h-4 w-4" />
                          <span>Settings</span>
                          <CommandShortcut>Ctrl+,</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <CodeIcon className="mr-2 h-4 w-4" />
                          <span>Developer Tools</span>
                          <CommandShortcut>F12</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </CommandDialog>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">전역 커맨드 팔레트 사용 중</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    이 컴포넌트는{' '}
                    <code className="bg-background px-1.5 py-0.5 rounded">CommandPalette</code>로
                    전역에서 사용되고 있습니다.
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100">
                      Ctrl+Shift+P
                    </kbd>{' '}
                    를 눌러 전역 커맨드 팔레트를 열 수 있습니다.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>탭 관리 (New Tab, Close Tab, Next/Previous Tab)</li>
                    <li>터미널 작업 (Clear, Copy, Paste, Select All)</li>
                    <li>설정 (Settings, Theme, Font Size)</li>
                    <li>개발자 도구 (DevTools, Demo, Reload)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Dialog Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Dialog</h2>
                <p className="text-sm text-muted-foreground">
                  모달 다이얼로그 컴포넌트. 설정, 확인 등에 사용.
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Dialog Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 Dialog</h3>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">Open Dialog</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Edit profile</DialogTitle>
                        <DialogDescription>
                          Make changes to your profile here. Click save when you&apos;re done.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                          <Label htmlFor="name">Name</Label>
                          <Input id="name" defaultValue="Pedro Duarte" />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="username">Username</Label>
                          <Input id="username" defaultValue="@peduarte" />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* AlertDialog Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">AlertDialog (확인 다이얼로그)</h3>
                  <AlertDialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive">Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your account
                          and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90">
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">설정 다이얼로그에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    이 컴포넌트는{' '}
                    <code className="bg-background px-1.5 py-0.5 rounded">SettingsDialog</code>에서
                    실제로 사용되고 있습니다.
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100">
                      Ctrl+,
                    </kbd>{' '}
                    를 눌러 설정 다이얼로그를 열거나, CommandPalette에서 &quot;Open Settings&quot;
                    명령을 선택하세요.
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>Dialog: 설정 모달 창</li>
                    <li>Tabs: Appearance, Advanced, About 섹션 분리</li>
                    <li>AlertDialog: 설정 리셋 확인</li>
                    <li>Input, Label, Select, Switch: 설정 폼 요소들</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Tabs Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Tabs</h2>
                <p className="text-sm text-muted-foreground">
                  탭 네비게이션 컴포넌트. 콘텐츠를 섹션별로 분리.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <Tabs defaultValue="account" className="w-full max-w-md">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="account">Account</TabsTrigger>
                      <TabsTrigger value="password">Password</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="account" className="space-y-2 p-4 border rounded-md mt-2">
                      <h4 className="font-medium">Account Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Make changes to your account here.
                      </p>
                    </TabsContent>
                    <TabsContent value="password" className="space-y-2 p-4 border rounded-md mt-2">
                      <h4 className="font-medium">Password Settings</h4>
                      <p className="text-sm text-muted-foreground">Change your password here.</p>
                    </TabsContent>
                    <TabsContent value="settings" className="space-y-2 p-4 border rounded-md mt-2">
                      <h4 className="font-medium">General Settings</h4>
                      <p className="text-sm text-muted-foreground">
                        Configure general preferences.
                      </p>
                    </TabsContent>
                  </Tabs>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">SettingsDialog에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground">
                    설정 다이얼로그에서 Appearance, Advanced, About 섹션을 분리하는데 사용됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Select Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Select</h2>
                <p className="text-sm text-muted-foreground">
                  드롭다운 선택 컴포넌트. 옵션 중 하나를 선택.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fruit-select">Select a fruit</Label>
                      <Select value={selectValue} onValueChange={setSelectValue}>
                        <SelectTrigger id="fruit-select">
                          <SelectValue placeholder="Select a fruit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apple">Apple</SelectItem>
                          <SelectItem value="banana">Banana</SelectItem>
                          <SelectItem value="orange">Orange</SelectItem>
                          <SelectItem value="grape">Grape</SelectItem>
                          <SelectItem value="mango">Mango</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Selected:{' '}
                        <code className="bg-background px-1.5 py-0.5 rounded">{selectValue}</code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">AppearanceTab에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground">
                    Cursor Style 선택 (Block, Underline, Bar)에 사용됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Input & Label Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Input & Label</h2>
                <p className="text-sm text-muted-foreground">텍스트 입력 필드와 라벨 컴포넌트.</p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <div className="max-w-md space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name-input">Name</Label>
                      <Input
                        id="name-input"
                        type="text"
                        placeholder="Enter your name"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-input">Email</Label>
                      <Input id="email-input" type="email" placeholder="example@email.com" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="number-input">Number</Label>
                      <Input id="number-input" type="number" placeholder="42" min={0} max={100} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password-input">Password</Label>
                      <Input id="password-input" type="password" placeholder="••••••••" />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">설정 폼 전반에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground">
                    Font Size, Font Family, Shell Path, Scrollback Lines 등 모든 입력 필드에
                    사용됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Separator Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Separator</h2>
                <p className="text-sm text-muted-foreground">
                  구분선 컴포넌트. 콘텐츠를 시각적으로 분리.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <div className="max-w-md">
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Section 1</h4>
                      <p className="text-sm text-muted-foreground">This is the first section.</p>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Section 2</h4>
                      <p className="text-sm text-muted-foreground">This is the second section.</p>
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-medium">Section 3</h4>
                      <p className="text-sm text-muted-foreground">This is the third section.</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">AppearanceTab에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground">
                    Theme 설정에서 프리셋과 커스텀 색상을 구분하는데 사용됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Switch Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Switch</h2>
                <p className="text-sm text-muted-foreground">
                  토글 스위치 컴포넌트. On/Off 상태 전환.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <div className="max-w-md space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="switch-demo">Airplane Mode</Label>
                        <p className="text-sm text-muted-foreground">Turn on airplane mode</p>
                      </div>
                      <Switch
                        id="switch-demo"
                        checked={switchChecked}
                        onCheckedChange={setSwitchChecked}
                      />
                    </div>

                    <div className="p-4 rounded-lg border">
                      <p className="text-sm">
                        Switch is:{' '}
                        <code className="bg-background px-1.5 py-0.5 rounded">
                          {switchChecked ? 'ON' : 'OFF'}
                        </code>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">AppearanceTab에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground">
                    Cursor Blink 설정 토글에 사용됩니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Card Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Card</h2>
                <p className="text-sm text-muted-foreground">
                  카드 컴포넌트. 콘텐츠를 그룹핑하고 시각적으로 구분.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <div className="max-w-md">
                    <Card>
                      <CardHeader>
                        <CardTitle>Card Title</CardTitle>
                        <CardDescription>Card description goes here</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          This is the card content. You can put any content here.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">설정 탭들에서 사용 중</h3>
                  <p className="text-sm text-muted-foreground">
                    모든 설정 섹션(Font, Cursor, Theme, Shell 등)을 Card로 그룹핑하여 표시합니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Sonner Toast Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Sonner (Toast)</h2>
                <p className="text-sm text-muted-foreground">
                  알림 메시지 표시 - 6가지 타입과 Action 버튼 지원
                </p>
              </div>

              <div className="space-y-6">
                {/* Toast Types */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Toast 타입들</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => toast('Event has been created')}>
                      Default
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.success('Settings saved successfully')}
                    >
                      Success
                    </Button>
                    <Button variant="outline" onClick={() => toast.info('New update available')}>
                      Info
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.warning('This action cannot be undone')}
                    >
                      Warning
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => toast.error('Failed to save settings')}
                    >
                      Error
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        toast.promise(
                          new Promise((resolve) =>
                            setTimeout(() => resolve({ name: 'Task' }), 2000)
                          ),
                          {
                            loading: 'Processing...',
                            success: (data) => `${(data as { name: string }).name} completed`,
                            error: 'Failed',
                          }
                        );
                      }}
                    >
                      Promise
                    </Button>
                  </div>
                </div>

                {/* Toast with Description */}
                <div>
                  <h3 className="text-lg font-medium mb-3">설명이 있는 Toast</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        toast.success('Settings saved', {
                          description: 'Your preferences have been updated successfully',
                        })
                      }
                    >
                      With Description
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        toast.error('Copy failed', {
                          description: 'No text selected in terminal',
                        })
                      }
                    >
                      Error with Description
                    </Button>
                  </div>
                </div>

                {/* Toast with Action */}
                <div>
                  <h3 className="text-lg font-medium mb-3">Action 버튼이 있는 Toast</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        toast('Copied to clipboard', {
                          description: 'Text has been copied successfully',
                          action: {
                            label: 'Undo',
                            onClick: () => toast.info('Copy undone'),
                          },
                        })
                      }
                    >
                      With Action
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        toast('Tab closed', {
                          description: 'Terminal 3 has been closed',
                          action: {
                            label: 'Restore',
                            onClick: () => toast.success('Tab restored'),
                          },
                        })
                      }
                    >
                      Tab Action
                    </Button>
                  </div>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">Rusterm에서 사용 예정</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    이 컴포넌트는 다음과 같은 곳에서 사용될 예정입니다:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>설정 저장 성공/실패 알림 (SettingsDialog)</li>
                    <li>복사/붙여넣기 완료 알림 (TerminalContextMenu)</li>
                    <li>탭 생성/닫기 피드백 (TabBar)</li>
                    <li>커맨드 실행 결과 (CommandPalette)</li>
                    <li>에러 및 경고 메시지 (전역)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Skeleton Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Skeleton</h2>
                <p className="text-sm text-muted-foreground">
                  로딩 상태를 시각적으로 표시하는 플레이스홀더 컴포넌트
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Example - Profile Loading */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제 (프로필 로딩)</h3>
                  <div className="border rounded-lg p-6 max-w-md">
                    <div className="flex items-center space-x-4">
                      <Skeleton className="h-12 w-12 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    사용 예: 사용자 프로필 정보 로딩 (아바타 + 이름/설명)
                  </p>
                </div>

                {/* Card Loading Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">카드 로딩</h3>
                  <div className="border rounded-lg p-6 max-w-md">
                    <div className="flex flex-col space-y-3">
                      <Skeleton className="h-[125px] w-[250px] rounded-xl" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[250px]" />
                        <Skeleton className="h-4 w-[200px]" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    사용 예: 카드형 콘텐츠 로딩 (썸네일 + 제목/설명)
                  </p>
                </div>

                {/* Real-world Example - Settings Form Loading */}
                <div>
                  <h3 className="text-lg font-medium mb-3">실제 적용 예제 (설정 폼 로딩)</h3>
                  <div className="border rounded-lg p-6 max-w-md">
                    <div className="space-y-4">
                      {/* Form Field Loading */}
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[100px]" /> {/* Label */}
                        <Skeleton className="h-10 w-full" /> {/* Input */}
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[120px]" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-[80px]" />
                        <Skeleton className="h-10 w-[200px]" /> {/* Select */}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    사용 예: 설정 다이얼로그가 데이터를 로드하는 동안 표시
                  </p>
                </div>

                {/* Multiple Skeletons - List Loading */}
                <div>
                  <h3 className="text-lg font-medium mb-3">리스트 로딩 (여러 항목)</h3>
                  <div className="border rounded-lg p-6 max-w-md">
                    <div className="space-y-4">
                      {Array.from({ length: 3 }, (_, i) => ({ id: `skeleton-${i}` })).map(
                        (item) => (
                          <div key={item.id} className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-10 rounded-md" />
                            <div className="space-y-2 flex-1">
                              <Skeleton className="h-4 w-full" />
                              <Skeleton className="h-3 w-3/4" />
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    사용 예: 터미널 프로필 목록, 테마 목록 등 로딩
                  </p>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">Rusterm에서 사용 예정</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    이 컴포넌트는 다음과 같은 곳에서 사용될 예정입니다:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>설정 다이얼로그 로딩 (SettingsDialog)</li>
                    <li>터미널 탭 초기화 중 (TabContent)</li>
                    <li>테마 프리뷰 이미지 로딩 (AppearanceTab)</li>
                    <li>프로필 목록 로딩 (향후 프로필 관리 기능)</li>
                    <li>비동기 데이터 로딩 전반 (전역)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Dropdown Menu Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Dropdown Menu</h2>
                <p className="text-sm text-muted-foreground">
                  드롭다운 메뉴 컴포넌트. 옵션, 설정 등을 표시하는 메뉴.
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Example */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">Open Menu</Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuGroup>
                        <DropdownMenuItem>
                          Profile
                          <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Billing
                          <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Settings
                          <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Keyboard shortcuts
                          <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem>Team</DropdownMenuItem>
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Invite users</DropdownMenuSubTrigger>
                          <DropdownMenuPortal>
                            <DropdownMenuSubContent>
                              <DropdownMenuItem>Email</DropdownMenuItem>
                              <DropdownMenuItem>Message</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem>More...</DropdownMenuItem>
                            </DropdownMenuSubContent>
                          </DropdownMenuPortal>
                        </DropdownMenuSub>
                        <DropdownMenuItem>
                          New Team
                          <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>GitHub</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuItem disabled>API</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        Log out
                        <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">Rusterm에서 사용 예정</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    이 컴포넌트는 다음과 같은 곳에서 사용될 예정입니다:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>타이틀바 메뉴 (File, Edit, View 등)</li>
                    <li>탭 우클릭 메뉴 (TabBar)</li>
                    <li>설정 옵션 메뉴</li>
                    <li>프로필 선택 메뉴</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Checkbox Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Checkbox</h2>
                <p className="text-sm text-muted-foreground">
                  체크박스 컴포넌트. 옵션 선택에 사용.
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Examples */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 예제</h3>
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3">
                      <Checkbox id="terms" />
                      <Label htmlFor="terms">Accept terms and conditions</Label>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox id="terms-2" defaultChecked />
                      <div className="grid gap-2">
                        <Label htmlFor="terms-2">Accept terms and conditions</Label>
                        <p className="text-muted-foreground text-sm">
                          By clicking this checkbox, you agree to the terms and conditions.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Checkbox id="toggle" disabled />
                      <Label htmlFor="toggle">Enable notifications</Label>
                    </div>
                    <Label className="hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 has-[[aria-checked=true]]:border-blue-600 has-[[aria-checked=true]]:bg-blue-50 dark:has-[[aria-checked=true]]:border-blue-900 dark:has-[[aria-checked=true]]:bg-blue-950">
                      <Checkbox
                        id="toggle-2"
                        defaultChecked
                        className="data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white dark:data-[state=checked]:border-blue-700 dark:data-[state=checked]:bg-blue-700"
                      />
                      <div className="grid gap-1.5 font-normal">
                        <p className="text-sm leading-none font-medium">Enable notifications</p>
                        <p className="text-muted-foreground text-sm">
                          You can enable or disable notifications at any time.
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">Rusterm에서 사용 예정</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    이 컴포넌트는 다음과 같은 곳에서 사용될 예정입니다:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>설정 옵션 체크박스 (SettingsDialog)</li>
                    <li>기능 활성화/비활성화 토글</li>
                    <li>다중 선택 리스트</li>
                    <li>약관 동의 체크박스</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Badge Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Badge</h2>
                <p className="text-sm text-muted-foreground">
                  뱃지 컴포넌트. 상태, 레이블 등을 표시.
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Variants */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 Variants</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Badge</Badge>
                    <Badge variant="secondary">Secondary</Badge>
                    <Badge variant="destructive">Destructive</Badge>
                    <Badge variant="outline">Outline</Badge>
                  </div>
                </div>

                {/* Custom Badges */}
                <div>
                  <h3 className="text-lg font-medium mb-3">커스텀 스타일 & 아이콘</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-500 text-white dark:bg-blue-600">
                      <BadgeCheckIcon className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                    <Badge className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums">
                      8
                    </Badge>
                    <Badge
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                      variant="destructive"
                    >
                      99
                    </Badge>
                    <Badge
                      className="h-5 min-w-5 rounded-full px-1 font-mono tabular-nums"
                      variant="outline"
                    >
                      20+
                    </Badge>
                  </div>
                </div>

                {/* Terminal-related Examples */}
                <div>
                  <h3 className="text-lg font-medium mb-3">터미널 관련 예제</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">PowerShell</Badge>
                    <Badge variant="secondary">Bash</Badge>
                    <Badge variant="outline">WSL</Badge>
                    <Badge className="bg-green-500 text-white dark:bg-green-600">Running</Badge>
                    <Badge className="bg-yellow-500 text-white dark:bg-yellow-600">Idle</Badge>
                    <Badge variant="destructive">Error</Badge>
                    <Badge variant="outline">Dev Mode</Badge>
                  </div>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">Rusterm에서 사용 예정</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    이 컴포넌트는 다음과 같은 곳에서 사용될 예정입니다:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>탭 상태 표시 (Running, Idle, Error)</li>
                    <li>프로필 타입 표시 (PowerShell, Bash, WSL)</li>
                    <li>설정 카테고리 레이블</li>
                    <li>알림 개수 표시</li>
                    <li>개발 모드 표시</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Drag and Drop Demo */}
            <section>
              <div className="mb-4">
                <h2 className="text-2xl font-semibold mb-2">Drag and Drop (Sortable)</h2>
                <p className="text-sm text-muted-foreground">
                  드래그 앤 드롭으로 아이템 순서 변경. Tauri 데스크톱 앱에 최적화됨.
                </p>
              </div>

              <div className="space-y-6">
                {/* Basic Sortable List */}
                <div>
                  <h3 className="text-lg font-medium mb-3">기본 정렬 가능한 리스트</h3>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext items={items} strategy={verticalListSortingStrategy}>
                      <div className="max-w-md space-y-2">
                        {items.map((item) => (
                          <SortableItem key={item.id} id={item.id} text={item.text} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                </div>

                {/* Features */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">데스크톱 앱 최적화 기능</h3>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>
                      <strong>PointerSensor</strong>: 8px 이동 후 드래그 시작 (실수 방지)
                    </li>
                    <li>
                      <strong>KeyboardSensor</strong>: 키보드로 순서 변경 가능 (접근성)
                    </li>
                    <li>
                      <strong>Visual Feedback</strong>: 드래그 중 시각적 피드백 제공
                    </li>
                    <li>
                      <strong>Toast Notification</strong>: 순서 변경 시 알림 표시
                    </li>
                  </ul>
                </div>

                {/* Usage Note */}
                <div className="rounded-lg border border-border bg-muted/50 p-4">
                  <h3 className="text-sm font-semibold mb-2">Rusterm에서 사용 예정</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    이 컴포넌트는 다음과 같은 곳에서 사용될 예정입니다:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                    <li>탭 순서 재정렬 (TabBar)</li>
                    <li>연결 프로필 순서 변경 (Home)</li>
                    <li>테마 프리셋 우선순위 조정</li>
                    <li>단축키 우선순위 설정</li>
                    <li>커맨드 팔레트 항목 순서 커스터마이징</li>
                  </ul>
                </div>

                {/* Keyboard Instructions */}
                <div className="rounded-lg border border-blue-600/20 bg-blue-50/50 dark:bg-blue-950/20 p-4">
                  <h3 className="text-sm font-semibold mb-2">키보드 조작법</h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 mr-1">
                        Tab
                      </kbd>
                      - 다음 아이템으로 포커스 이동
                    </p>
                    <p>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 mr-1">
                        Space
                      </kbd>
                      - 드래그 시작/종료
                    </p>
                    <p>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 mr-1">
                        ↑ ↓
                      </kbd>
                      - 아이템 이동
                    </p>
                    <p>
                      <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 mr-1">
                        Esc
                      </kbd>
                      - 드래그 취소
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Toast Notifications for Demo */}
      <Toaster position="bottom-right" closeButton richColors />
    </>
  );
}

// Sortable Item Component
interface SortableItemProps {
  id: string;
  text: string;
}

function SortableItem({ id, text }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors ${
        isDragging ? 'shadow-lg z-50 cursor-grabbing' : 'cursor-grab'
      }`}
      {...attributes}
      {...listeners}
    >
      <GripVerticalIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      <span className="text-sm font-medium flex-1">{text}</span>
      <Badge variant="secondary" className="text-xs">
        Drag me
      </Badge>
    </div>
  );
}
