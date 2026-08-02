"use client";

import { Search } from "lucide-react";


interface SearchBarProps {

  search: string;

  setSearch: React.Dispatch<React.SetStateAction<string>>;

}



export default function SearchBar({

  search,

  setSearch,

}: SearchBarProps) {


  return (

    <div className="relative">


      <Search

        className="
        absolute
        left-4
        top-4
        text-gray-400
        dark:text-gray-500
        "

        size={20}

      />



      <input

        type="text"

        value={search}

        onChange={(e) => setSearch(e.target.value)}

        placeholder="Search hospitals..."

        className="
        w-full
        border
        border-gray-300
        dark:border-gray-700
        rounded-xl
        py-3
        pl-12
        pr-4
        outline-none
        bg-white
        dark:bg-gray-900
        text-gray-900
        dark:text-white
        placeholder:text-gray-400
        dark:placeholder:text-gray-500
        focus:ring-2
        focus:ring-blue-500
        transition
        "

      />


    </div>

  );

}