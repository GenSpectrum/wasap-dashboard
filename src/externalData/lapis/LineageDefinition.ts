import z from 'zod';

const lineage = z.object({
    parents: z.array(z.string()).optional(),
    aliases: z.array(z.string()).optional(),
});

export const lineageDefinitionResponseSchema = z.record(z.string(), lineage);
export type LineageDefinitionResponse = z.infer<typeof lineageDefinitionResponseSchema>;
