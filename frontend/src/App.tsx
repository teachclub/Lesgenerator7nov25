import PresetZoekerPage from "@/pages/PresetZoekerPage";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="border-b px-4 py-3 flex items-center justify-between">
        <div className="font-semibold">Kleio</div>
        <nav className="text-sm opacity-80">Preset Zoeker</nav>
      </header>
      <main className="max-w-6xl mx-auto">
        <PresetZoekerPage />
      </main>
    </div>
  );
}

