import z from 'zod';

export const mutationLinkTemplateSchema = z.object({
    nucleotideMutation: z.string().optional(),
    aminoAcidMutation: z.string().optional(),
});

export type MutationLinkTemplate = z.infer<typeof mutationLinkTemplateSchema>;
