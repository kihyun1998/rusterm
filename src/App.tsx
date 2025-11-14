import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun } from "lucide-react";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const { theme, toggleTheme } = useTheme();

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold">Welcome to Tauri + React</h1>
          <Button onClick={toggleTheme} variant="outline" size="icon">
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
          </Button>
        </div>

        <div className="flex gap-8 justify-center">
          <a href="https://vite.dev" target="_blank">
            <img src="/vite.svg" className="h-24 hover:drop-shadow-lg transition" alt="Vite logo" />
          </a>
          <a href="https://tauri.app" target="_blank">
            <img src="/tauri.svg" className="h-24 hover:drop-shadow-lg transition" alt="Tauri logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="h-24 hover:drop-shadow-lg transition" alt="React logo" />
          </a>
        </div>

        <p className="text-center text-muted-foreground">
          Click on the Tauri, Vite, and React logos to learn more.
        </p>

        <form
          className="flex gap-4 justify-center"
          onSubmit={(e) => {
            e.preventDefault();
            greet();
          }}
        >
          <input
            id="greet-input"
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Enter a name..."
            className="px-4 py-2 border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <Button type="submit">Greet</Button>
        </form>

        {greetMsg && (
          <p className="text-center text-lg font-medium">{greetMsg}</p>
        )}
      </div>
    </main>
  );
}

export default App;
