"use client";

import toast from "react-hot-toast";

export default function TestToast() {

  return (

    <button
      onClick={() => toast.success("Toast Working Successfully!")}
      className="bg-blue-600 text-white px-5 py-3 rounded-xl"
    >

      Test Toast

    </button>

  );

}