// Footer.tsx
import React from "react";

const Footer: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-gray-200 bg-white/80 backdrop-blur mt-6">
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between text-xs text-gray-500">
        <span>© {year} Lessy 2000</span>
        <span>Geschiedenis • TvG / Kleio</span>
      </div>
    </footer>
  );
};

export default Footer;
