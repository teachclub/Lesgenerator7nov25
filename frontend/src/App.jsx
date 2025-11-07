import ChatSearchPanel from "./components/ChatSearchPanel.jsx";

export default function App() {
  return (
    <div className="min-h-screen bg-white text-black">
      <header className="px-4 py-3 border-b">
        <h1 className="text-xl font-semibold">Conversational Europeana-zoeker</h1>
        <p className="text-sm text-gray-600">
          Beschrijf wat je zoekt — noem jaartallen, personen/actoren, plaatsen en begrippen.
        </p>
      </header>
      <main className="p-4">
        <ChatSearchPanel />
      </main>
    </div>
  );
}

