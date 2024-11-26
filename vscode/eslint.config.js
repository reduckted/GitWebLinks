// @ts-check

const eslint = require('@eslint/js');
const jest = require('eslint-plugin-jest');
const jsdoc = require('eslint-plugin-jsdoc');
const n = require('eslint-plugin-n');
const perfectionist = require('eslint-plugin-perfectionist');
const prettier = require('eslint-plugin-prettier/recommended');
const tseslint = require('typescript-eslint');

module.exports = tseslint.config(
    { name: '@eslint/js', ...eslint.configs.recommended },
    ...tseslint.configs.recommendedTypeChecked,
    jsdoc.configs['flat/recommended'],
    n.configs['flat/recommended-module'],
    { name: 'prettier', ...prettier },
    {
        name: 'ignores',
        ignores: [
            '.vscode-test.mjs',
            '.vscode-test',
            'dist',
            'eslint.config.js',
            'out-test',
            'webpack.config.js',
            'src/api/**/*'
        ]
    },
    {
        name: 'base',
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: __dirname
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
            'perfectionist/sort-imports': [
                'warn',
                {
                    groups: [
                        ['builtin-type', 'external-type', 'internal-type'],
                        'parent-type',
                        ['sibling-type', 'index-type'],
                        ['builtin', 'external', 'internal'],
                        'parent',
                        ['sibling', 'index', 'object'],
                        'unknown'
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
