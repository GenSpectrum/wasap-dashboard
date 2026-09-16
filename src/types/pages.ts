import { organismConfig, type Organism } from './Organism';

export const Page = {
    viewCollection: (organism: Organism, id: string) => `/collections/${organismConfig[organism].pathFragment}/${id}`,
} as const;
