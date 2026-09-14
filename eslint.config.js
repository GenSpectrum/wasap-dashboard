import eslint from '@eslint/js';
import tanstackQuery from '@tanstack/eslint-plugin-query';
import parser from '@typescript-eslint/parser';
import importPlugin from 'eslint-plugin-import';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// This config is ported from the two repos wasap-standalone's code was extracted
// from: `GenSpectrum/dashboards` (website) and `GenSpectrum/dashboard-components`.
// The rule set is the union of theirs that applies here; the Astro, Storybook and
// Lit pieces are dropped, and `@tanstack/eslint-plugin-query` is kept (from
// dashboards) since this app uses React Query.

const importRules = {
    'import/no-cycle': 'error',
    'import/no-deprecated': 'error',
    'import/no-extraneous-dependencies': 'error',
    'import/no-internal-modules': 'off',
    'import/order': [
        'error',
        {
            groups: ['builtin', 'external', 'internal'],
            'newlines-between': 'always',
            alphabetize: { order: 'asc' },
        },
    ],
};

const enableFromEslint = {
    curly: 'error',
    'no-console': 'error',
};

const typescriptEsLintOverwrites = {
    '@typescript-eslint/no-confusing-void-expression': 'off',
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/consistent-indexed-object-style': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/prefer-reduce-type-parameter': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/triple-slash-reference': 'off',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-unused-vars': [
        'error',
        {
            args: 'all',
            argsIgnorePattern: '^_',
            caughtErrors: 'all',
            caughtErrorsIgnorePattern: '^_',
            destructuredArrayIgnorePattern: '^_',
            varsIgnorePattern: '^_',
            ignoreRestSiblings: true,
        },
    ],
    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
};

const namingConvention = {
    '@typescript-eslint/naming-convention': [
        'error',
        {
            selector: 'default',
            format: ['camelCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
        },
        {
            selector: 'function',
            format: ['camelCase', 'PascalCase'],
        },
        {
            selector: 'variable',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
            leadingUnderscore: 'allow',
            trailingUnderscore: 'allow',
        },
        {
            selector: 'enumMember',
            format: ['camelCase', 'UPPER_CASE', 'PascalCase'],
        },
        {
            selector: 'import',
            format: null,
        },
        {
            selector: 'typeLike',
            format: ['PascalCase'],
        },
        {
            // Component-holding parameters (`flexRender`-style `Comp`), so JSX can
            // reference them as tags (`<Comp />` requires a capitalized identifier).
            selector: 'parameter',
            format: ['camelCase', 'PascalCase'],
            leadingUnderscore: 'allow',
        },
        {
            // Object keys shaped by something other than our own naming (HTTP
            // header names, single-letter/short lineage codes in test fixtures).
            selector: 'objectLiteralProperty',
            format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
        },
        {
            // Object keys that require quoting (HTTP headers with a dash, LAPIS/
            // SILO field names with dots, the "amino acid" label, vite proxy
            // paths) aren't identifiers to begin with, so no format applies.
            selector: 'objectLiteralProperty',
            format: null,
            modifiers: ['requiresQuotes'],
        },
        {
            // `dangerouslySetInnerHTML`'s key is mandated by React, not us.
            selector: 'objectLiteralProperty',
            format: null,
            filter: { regex: '^__html$', match: true },
        },
    ],
};

const restrictTemplateExpressions = {
    '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
            allowNumber: true,
            // `allowNever` covers exhaustiveness-check fallthroughs (`throw new
            // Error(...)` after every case is handled). The temporal classes all
            // implement `toString()`.
            allowNever: true,
            allow: [
                { name: ['unknown', 'Error', 'URLSearchParams', 'URL'], from: 'lib' },
                'TemporalClass',
                'YearMonthDayClass',
                'YearWeekClass',
                'YearMonthClass',
                'YearClass',
            ],
        },
    ],
};

const disableFromReact = {
    'react/no-unescaped-entities': 'off',
    'react/display-name': 'off',
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
};

export default tseslint.config(
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
    {
        files: ['**/*.ts', '**/*.tsx'],
        extends: [
            eslint.configs.recommended,
            ...tseslint.configs.strictTypeChecked,
            ...tseslint.configs.stylisticTypeChecked,
        ],
        languageOptions: {
            parser: parser,
            globals: {
                ...globals.browser,
            },
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        plugins: {
            react: react,
            import: importPlugin,
            '@tanstack/query': tanstackQuery,
        },
        rules: {
            ...react.configs.flat.recommended.rules,
            ...tanstackQuery.configs['flat/recommended'].reduce((acc, config) => ({ ...acc, ...config.rules }), {}),
            ...importRules,
            ...namingConvention,
            ...restrictTemplateExpressions,
            ...typescriptEsLintOverwrites,
            ...disableFromReact,
            ...enableFromEslint,
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
    },
    {
        // Test files: relax the type-unsafety rules, as both upstream repos do.
        files: [
            '**/*.spec.{ts,tsx}',
            '**/*.browser.spec.{ts,tsx}',
            '**/*.fixture.ts',
            'test-extend.ts',
            'vitest.setup.ts',
        ],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            // Many specs exercise concurrency helpers (`pool`, `withRequestLimit`)
            // whose worker parameter must return a Promise; the synchronous test
            // workers passed in are still correct without an `await`.
            '@typescript-eslint/require-await': 'off',
        },
    },
    { ...reactHooks.configs['recommended-latest'], ignores: ['**/*.fixture.ts'] },
);
