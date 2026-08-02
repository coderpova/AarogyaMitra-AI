import type { Metadata } from "next";

import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";

import { Toaster } from "react-hot-toast";

import { ThemeProvider } from "next-themes";



export const metadata: Metadata = {

  title: "AarogyaMitra AI",

  description: "AI Healthcare Assistant",

};




export default function RootLayout({

  children,

}: Readonly<{

  children: React.ReactNode;

}>) {


  return (

    <html lang="en" suppressHydrationWarning>


      <body>


        <ThemeProvider

          attribute="class"

          defaultTheme="system"

          enableSystem

        >


          <AuthProvider>


            {children}


          </AuthProvider>




          <Toaster

            position="top-right"

          />



        </ThemeProvider>


      </body>


    </html>

  );


}