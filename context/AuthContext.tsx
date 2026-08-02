"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";


interface User {

  name: string;

  email: string;

}



interface AuthContextType {

  user: User | null;

  loading: boolean;

  login: (

    userData: User,

    token: string

  ) => void;


  logout: () => void;

}




const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);







export function AuthProvider({

  children,

}: {

  children: React.ReactNode;

}) {



  const [user, setUser] = useState<User | null>(null);


  const [loading, setLoading] = useState(true);






  useEffect(() => {



    const checkUser = () => {



      const storedUser = localStorage.getItem("user");



      if(storedUser){


        setUser(JSON.parse(storedUser));


      }
      else{


        setUser(null);


      }



      setLoading(false);


    };





    checkUser();





    window.addEventListener(

      "auth-change",

      checkUser

    );





    return () => {


      window.removeEventListener(

        "auth-change",

        checkUser

      );


    };




  }, []);









  const login = (

    userData: User,

    token: string

  ) => {



    localStorage.setItem(

      "token",

      token

    );



    localStorage.setItem(

      "user",

      JSON.stringify(userData)

    );



    setUser(userData);



    window.dispatchEvent(

      new Event("auth-change")

    );



  };









  const logout = () => {



    localStorage.removeItem(

      "token"

    );



    localStorage.removeItem(

      "user"

    );



    setUser(null);




    window.dispatchEvent(

      new Event("auth-change")

    );



  };









  return (



    <AuthContext.Provider

      value={{

        user,

        loading,

        login,

        logout,

      }}

    >


      {children}



    </AuthContext.Provider>



  );



}









export function useAuth(){



  const context = useContext(AuthContext);



  if(!context){


    throw new Error(

      "useAuth must be used inside AuthProvider"

    );


  }



  return context;



}