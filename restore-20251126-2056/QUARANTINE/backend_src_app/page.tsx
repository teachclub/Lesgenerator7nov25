import { GeneratorPage } from '../components/features/GeneratorPage/GeneratorPage';
import SearchFilterFlow from '../components/SearchFilterFlow';

/**
 * De hoofdpagina van de applicatie.
 * Deze pagina rendert de nieuwe zoekbalk (bovenin)
 * en daaronder de originele GeneratorPage (F18).
 */
export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      
      {/* 1. De nieuwe Zoek & Filter balk */}
      <div className="pt-6 px-4 pb-2 max-w-[1600px] mx-auto">
        <SearchFilterFlow />
      </div>

      {/* 2. De originele Applicatie */}
      <GeneratorPage />
      
    </main>
  );
}
