import { GeneratorPage } from '../components/features/GeneratorPage/GeneratorPage';

/**
 * De hoofdpagina van de applicatie.
 * Deze pagina rendert de GeneratorPage (F18), die de hele
 * 3-koloms layout beheert.
 */
export default function Home() {
  return (
    <main>
      <GeneratorPage />
    </main>
  );
}
