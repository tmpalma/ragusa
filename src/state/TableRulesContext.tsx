import { createContext, useContext, type ReactNode } from "react";
import { RAW_TABLE_RULES, type TableRules } from "../domain/tableRules";

const TableRulesContext = createContext<TableRules>(RAW_TABLE_RULES);

export function TableRulesProvider({
  children,
  rules = RAW_TABLE_RULES,
}: {
  children: ReactNode;
  rules?: TableRules;
}) {
  return <TableRulesContext.Provider value={rules}>{children}</TableRulesContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- context + its hook belong together
export function useTableRules(): TableRules {
  return useContext(TableRulesContext);
}
