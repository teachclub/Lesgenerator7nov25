// Header.tsx
import React from "react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({
  title = "Lessy 2000",
  subtitle,
}) => {
  return (
    <header className="w-full border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-gray-500">
              {subtitle}
            </p>
          )}
        </div>
        {/* Rechts eventueel ruimte voor knoppen / navigatie */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>TvG / Kleio lesgenerator</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
