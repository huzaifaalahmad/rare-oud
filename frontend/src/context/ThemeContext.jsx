import { createContext, useContext, useEffect, useMemo, useState } from 'react';
const ThemeContext=createContext(null);
export function ThemeProvider({children}){
 const [theme,setTheme]=useState(localStorage.getItem('rare_oud_theme')||'light');
 useEffect(()=>{localStorage.setItem('rare_oud_theme',theme);document.documentElement.dataset.theme=theme},[theme]);
 const value=useMemo(()=>({theme,setTheme,toggleTheme:()=>setTheme(v=>v==='light'?'dark':'light')}),[theme]);
 return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export const useTheme=()=>useContext(ThemeContext);
