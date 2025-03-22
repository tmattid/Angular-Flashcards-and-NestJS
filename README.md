# Angular Flashcards and NestJS

A modern flashcards application built with Angular 19 and NestJS.

## Environment Setup

Before running the application, you need to set up your environment variables:

1. Copy `src/environments/environment.template.ts` to `src/environments/environment.ts`
2. Edit `environment.ts` and add your API keys:
   - Supabase URL and anon key
   - OpenAI API key (if using)
   - Anthropic API key (if using)
   - Together API key (if using)

**Note:** Never commit your actual API keys to version control. The `environment.ts` file is included in `.gitignore`.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
