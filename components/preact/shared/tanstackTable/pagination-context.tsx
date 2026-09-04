import { createContext, type Dispatch, type FC, type ReactNode, type SetStateAction, useContext } from 'react';
import type { PageSizes } from './pagination';
import { useControlledState } from '../../../utils/useControlledState';

type PageSizeContext = {
    pageSize: number;
    setPageSize: Dispatch<SetStateAction<number>>;
};

const pageSizeContext = createContext<PageSizeContext>({
    pageSize: -1,
    setPageSize: () => {
        throw new Error('pageSizeContext not initialized');
    },
});

export function usePageSizeContext() {
    return useContext(pageSizeContext);
}

export type PageSizeContextProviderProps = {
    pageSizes: PageSizes;
    children?: ReactNode;
};

export const PageSizeContextProvider: FC<PageSizeContextProviderProps> = ({ children, pageSizes }) => {
    const [pageSize, setPageSize] = useControlledState(
        typeof pageSizes === 'number' ? pageSizes : (pageSizes.at(0) ?? 10),
    );

    return <pageSizeContext.Provider value={{ pageSize, setPageSize }}>{children}</pageSizeContext.Provider>;
};
