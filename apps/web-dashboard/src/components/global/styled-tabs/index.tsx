import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const StyledTabs = ({ defaultValue, children, className = "" }) => {
  return (
    <Tabs defaultValue={defaultValue} className={` mx-auto ${className}`}>
      {children}
    </Tabs>
  );
};

const StyledTabsList = ({ children, className = "" }) => {
  return (
    <TabsList
      className={`mb-8 w-full flex justify-center bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-xl p-1 ${className}`}
    >
      {children}
    </TabsList>
  );
};

const StyledTabsTrigger = ({ value, children, className = "" }) => {
  return (
    <TabsTrigger
      value={value}
      className={`
        px-6 py-3 text-sm font-medium transition-all duration-300 rounded-lg
        data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow
        data-[state=inactive]:text-zinc-400 data-[state=inactive]:hover:text-white
        data-[state=inactive]:hover:bg-zinc-800
        cursor-pointer
        ${className}
      `}
    >
      {children}
    </TabsTrigger>
  );
};

const StyledTabsContent = ({ value, children, className = "" }) => {
  return (
    <TabsContent
      value={value}
      className={`mt-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 rounded-lg ${className}`}
    >
      {children}
    </TabsContent>
  );
};

export { StyledTabs, StyledTabsList, StyledTabsTrigger, StyledTabsContent };
