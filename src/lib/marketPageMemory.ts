const marketPageMemory = new Map<string, unknown>();

/** Retains a fully loaded market page while the app stays open. */
export const getMarketPageMemory = <T>(page: string): T | undefined =>
  marketPageMemory.get(page) as T | undefined;

export const setMarketPageMemory = <T>(page: string, value: T): void => {
  marketPageMemory.set(page, value);
};

export const clearMarketPageMemory = (): void => {
  marketPageMemory.clear();
};
