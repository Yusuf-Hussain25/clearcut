import { useContext } from "react";
import { AccountContext } from "../context/account";

// { me, credits, isDemo, error, refresh, setCredits } for the signed-in user
export const useAccount = () => useContext(AccountContext);
