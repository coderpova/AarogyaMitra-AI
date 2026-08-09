import type { Metadata } from "next";

import "./globals.css";

import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { NotificationProvider } from "@/context/NotificationContext";

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
            <NotificationProvider>
              <LanguageProvider>
                {children}
              </LanguageProvider>
            </NotificationProvider>
          </AuthProvider>




          <Toaster

            position="top-right"

          />



        </ThemeProvider>


      </body>


    </html>

  );


}