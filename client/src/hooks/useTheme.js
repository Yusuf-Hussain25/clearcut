import { useEffect, useState } from "react";
import { onThemeChange, resolveTheme } from "../lib/theme";

// Current resolved theme ("light" | "dark"), re-rendering when it changes
export const useTheme = () => {
    const [theme, setTheme] = useState(resolveTheme);
    useEffect(() => onThemeChange(setTheme), []);
    return theme;
};
