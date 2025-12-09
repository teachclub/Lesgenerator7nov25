import React, { useState, useMemo } from 'react';
import { Search, Filter, Plus, X, CheckCircle2, Ban, AlertCircle } from 'lucide-react';

const mockData = [
  { id: 1, title: "De opkomst van handel en ambacht", text: "Handel in de middeleeuwen nam toe door nieuwe routes." },
  { id: 2, title: "De wetenschappelijke revolutie", text: "Kritisch denken en observatie veranderden de wetenschap." },
  { id: 3, title: "Conflict in de Nederlanden", text: "De opstand leidde tot de vorming van een nieuwe staat en oorlog." },
  { id: 4, title: "De industriële revolutie", text: "Stoommachines en fabrieken veranderden de samenleving." },
];

const kenmerkendeAspecten = [
  "Handel en ambacht",
  "Wetenschappelijke revolutie",
  "Protestantse reformatie",
  "Industriële samenleving"
];

export default function SearchFilterFlow() {
  const [inputValue, setInputValue] = useState("");
  const [termType, setTermType] = useState("INCLUDE");
  const [searchMode, setSearchMode] = useState("AND"); 
  const [searchTags, setSearchTags] = useState([]);
  const [selectedAspect, setSelectedAspect] = useState("");

  const handleAddTag = (e) => {
    e?.preventDefault();
    if (!inputValue.trim()) return;

    const newTag = {
      id: Date.now(),
      text: inputValue.trim(),
      type: termType 
    };

    setSearchTags([...searchTags, newTag]);
    setInputValue("");
  };

  const removeTag = (idToRemove) => {
    setSearchTags(searchTags.filter(tag => tag.id !== idToRemove));
  };

  const filteredResults = useMemo(() => {
    if (searchTags.length === 0 && !selectedAspect) return mockData;

    const includeTags = searchTags.filter(tag => tag.type === "INCLUDE");
    const excludeTags = searchTags.filter(tag => tag.type === "EXCLUDE");

    return mockData.filter(item => {
      const content = (item.title + " " + item.text).toLowerCase();

      if (selectedAspect && !content.includes(selectedAspect.toLowerCase())) {
        return false;
      }

      const hasExcludedTerm = excludeTags.some(tag => content.includes(tag.text.toLowerCase()));
      if (hasExcludedTerm) return false;

      if (includeTags.length === 0) return true;

      if (searchMode === "AND") {
        return includeTags.every(tag => content.includes(tag.text.toLowerCase()));
      } else {
        return includeTags.some(tag => content.includes(tag.text.toLowerCase()));
      }
    });
  }, [searchTags, searchMode, selectedAspect]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 font-sans mb-8">
      <div className="bg-blue-50 p-4 rounded-t-xl border-b border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-2">
             <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
             <div>
               <p className="text-sm text-blue-800 font-medium">Zoekmodus voor <span className="text-green-700 font-bold">groene</span> woorden:</p>
               <p className="text-xs text-blue-600 mt-1">
                 {searchMode === "AND" 
                   ? "Specifiek: Resultaat moet ALLE groene woorden bevatten." 
                   : "Breed: Resultaat mag ÉÉN van de groene woorden bevatten."}
               </p>
             </div>
          </div>
          
          <div className="bg-white p-1 rounded-lg inline-flex border border-blue-200 shadow-sm shrink-0">
            <button
              onClick={() => setSearchMode("AND")}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                searchMode === "AND" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setSearchMode("OR")}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
                searchMode === "OR" ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              OF
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4 mb-6">
          <form onSubmit={handleAddTag} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="relative flex-grow w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
                placeholder="Typ een zoekwoord..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-4 shrink-0 px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="radio" 
                    name="termType" 
                    checked={termType === "INCLUDE"} 
                    onChange={() => setTermType("INCLUDE")}
                    className="peer sr-only" 
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-green-600 peer-checked:bg-green-600 transition-all"></div>
                  <CheckCircle2 className="w-3 h-3 text-white absolute left-1 top-1 opacity-0 peer-checked:opacity-100" />
                </div>
                <span className={`text-sm font-medium transition-colors ${termType === "INCLUDE" ? "text-green-700" : "text-gray-600"}`}>
                  Wel
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center">
                  <input 
                    type="radio" 
                    name="termType" 
                    checked={termType === "EXCLUDE"} 
                    onChange={() => setTermType("EXCLUDE")}
                    className="peer sr-only" 
                  />
                  <div className="w-5 h-5 border-2 border-gray-300 rounded-full peer-checked:border-red-600 peer-checked:bg-red-600 transition-all"></div>
                  <Ban className="w-3 h-3 text-white absolute left-1 top-1 opacity-0 peer-checked:opacity-100" />
                </div>
                <span className={`text-sm font-medium transition-colors ${termType === "EXCLUDE" ? "text-red-700" : "text-gray-600"}`}>
                  Niet
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto transition-colors"
            >
              <Plus className="w-4 h-4 inline mr-1" /> Voeg toe
            </button>
          </form>

          <div className="flex flex-wrap gap-2 min-h-[32px]">
            {searchTags.map((tag) => (
              <span
                key={tag.id}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium border shadow-sm ${
                  tag.type === "INCLUDE"
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {tag.type === "INCLUDE" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                ) : (
                  <Ban className="w-3.5 h-3.5 mr-1.5" />
                )}
                {tag.text}
                <button
                  onClick={() => removeTag(tag.id)}
                  className={`ml-2 rounded-full p-0.5 hover:bg-black/10 transition-colors`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>

          <div className="relative mt-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-500" />
            </div>
            <select
              value={selectedAspect}
              onChange={(e) => setSelectedAspect(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border bg-gray-50 shadow-sm"
            >
              <option value="">Alle kenmerkende aspecten</option>
              {kenmerkendeAspecten.map((aspect, index) => (
                <option key={index} value={aspect}>
                  {aspect}
                </option>
              ))}
            </select>
            {selectedAspect && (
              <button
                onClick={() => setSelectedAspect("")}
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer hover:text-red-500 text-gray-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
