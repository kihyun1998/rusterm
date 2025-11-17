import { Button } from '@/components/ui/button';
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
  PlusIcon,
  Cross2Icon,
  GearIcon,
  CodeIcon,
} from '@radix-ui/react-icons';
import { useState, useEffect } from 'react';

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

  return (
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
                <h3 className="text-lg font-medium mb-3">고급 예제 (Sub-menu, Checkbox, Radio)</h3>
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
                      <ContextMenuRadioItem value="pedro">
                        Pedro Duarte
                      </ContextMenuRadioItem>
                      <ContextMenuRadioItem value="colm">
                        Colm Tuite
                      </ContextMenuRadioItem>
                    </ContextMenuRadioGroup>
                  </ContextMenuContent>
                </ContextMenu>
              </div>

              {/* Terminal Usage Note */}
              <div className="rounded-lg border border-border bg-muted/50 p-4">
                <h3 className="text-sm font-semibold mb-2">터미널에서 사용 중</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  이 컴포넌트는 <code className="bg-background px-1.5 py-0.5 rounded">TerminalContextMenu</code>에서 실제로 사용되고 있습니다.
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
                  이 컴포넌트는 <code className="bg-background px-1.5 py-0.5 rounded">CommandPalette</code>로 전역에서 사용되고 있습니다.
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
        </div>
      </div>
    </div>
  );
}
