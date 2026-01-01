// @ts-check

import eslint from '@eslint/js';
import jest from 'eslint-plugin-jest';
import jsdoc from 'eslint-plugin-jsdoc';
import n from 'eslint-plugin-n';
import perfectionist from 'eslint-plugin-perfectionist';
import prettier from 'eslint-plugin-prettier/recommended';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { name: '@eslint/js', ...eslint.configs.recommended },
    ...tseslint.configs.recommendedTypeChecked,
    jsdoc.configs['flat/recommended'],
    n.configs['flat/recommended-module'],
    { name: 'prettier', ...prettier },
    {
        name: 'ignores',
        ignores: ['.vscode-test.mjs', '.vscode-test', 'dist', 'out-test', 'src/api/**/*']
    },
    {
        name: 'base',
        languageOptions: {
            parserOptions: {
                project: path.join(
                    path.dirname(fileURLToPath(import.meta.url)),
                    'tsconfig.eslint.json'
                )
            }
        }
    },
    {
        name: 'customizations',
        files: ['**/*.ts'],
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            jest,
            perfectionist
        },
        rules: {
            '@typescript-eslint/no-inferrable-types': 'off',
            '@typescript-eslint/array-type': ['warn', { default: 'array' }],
            '@typescript-eslint/consistent-indexed-object-style': ['warn', 'record'],
            '@typescript-eslint/consistent-type-assertions': [
                'warn',
                { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow' }
            ],
            '@typescript-eslint/consistent-type-imports': 'warn',
            '@typescript-eslint/explicit-function-return-type': [
                'warn',
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                    allowHigherOrderFunctions: true,
                    allowDirectConstAssertionInArrowFunctions: true,
                    allowConciseArrowFunctionExpressionsStartingWithVoid: true
                }
            ],
            '@typescript-eslint/explicit-member-accessibility': [
                'warn',
                { accessibility: 'explicit' }
            ],
            '@typescript-eslint/no-confusing-non-null-assertion': 'error',
            '@typescript-eslint/prefer-readonly': 'warn',
            '@typescript-eslint/promise-function-async': 'warn',
            '@typescript-eslint/restrict-template-expressions': 'off',
            'perfectionist/sort-heritage-clauses': 'warn',
            'perfectionist/sort-named-imports': 'warn',
            'perfectionist/sort-imports': [
                'warn',
                {
                    groups: [
                        ['type-builtin', 'type-external', 'type-internal'],
                        'type-parent',
                        ['type-sibling', 'type-index'],
                        ['builtin', 'external', 'internal'],
                        'parent',
                        ['sibling', 'index'],
                        'unknown'
                    ]
                }
            ],
            'perfectionist/sort-union-types': [
                'warn',
                {
                    groups: [
                        [
                            'conditional',
                            'function',
                            'import',
                            'intersection',
                            'keyword',
                            'literal',
                            'named',
                            'object',
                            'operator',
                            'tuple',
                            'union'
                        ],
                        'nullish'
                    ]
                }
            ],
            'jest/no-focused-tests': 'warn',
            'jsdoc/require-description': ['warn', { checkConstructors: false }],
            'jsdoc/require-returns': ['warn', { checkGetters: false }],
            'jsdoc/require-returns-check': 'off',
            'jsdoc/require-jsdoc': [
                'warn',
                {
                    checkGetters: true,
                    require: {
                        ArrowFunctionExpression: false,
                        ClassDeclaration: true,
                        ClassExpression: true,
                        FunctionDeclaration: true,
                        FunctionExpression: true,
                        MethodDefinition: true
                    }
                }
            ],
            'jsdoc/tag-lines': ['warn', 'never', { startLines: 1 }],
            'jsdoc/require-param-type': 'off',
            'jsdoc/require-returns-type': 'off',
            'n/no-sync': 'error',
            'n/no-unpublished-import': 'off',
            'n/no-missing-import': 'off',
            'n/no-unsupported-features/es-syntax': 'off',
            'no-console': 'error',
            'prefer-const': 'off'
        },
        settings: {
            jsdoc: {
                tagNamePreference: {
                    class: 'constructor'
                },
                ignorePrivate: false
            }
        }
    },
    {
        name: 'tests',
        files: ['**/*.test.ts'],
        plugins: {
            '@typescript-eslint': tseslint.plugin,
            jsdoc
        },
        rules: {
            '@typescript-eslint/no-unused-expressions': 'off',
            'jsdoc/require-jsdoc': 'off'
        }
    }
);
