// Spinner.tsx
import React from "react";

const Spinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-8">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-transparent" />
    {message && <p className="mt-4 text-gray-600">{message}</p>}
  </div>
);

export default Spinner;
