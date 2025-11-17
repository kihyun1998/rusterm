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
import { useState } from 'react';

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

          {/* Placeholder for future components */}
          <section className="opacity-50">
            <div className="mb-4">
              <h2 className="text-2xl font-semibold mb-2">Command (Coming Soon)</h2>
              <p className="text-sm text-muted-foreground">
                커맨드 팔레트 컴포넌트 (Phase 4.2)
              </p>
            </div>
            <div className="h-[150px] w-full max-w-md rounded-lg border-2 border-dashed border-border bg-muted/30 flex items-center justify-center">
              아직 설치되지 않음
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
